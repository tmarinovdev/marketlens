import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const apple = {
  id: 1,
  provider: "alpaca",
  providerAssetId: "apple",
  symbol: "AAPL",
  name: "Apple",
  assetClass: "us_equity",
  instrumentType: null,
  exchange: "NASDAQ",
  currency: "USD",
};
const microsoft = {
  ...apple,
  id: 2,
  providerAssetId: "microsoft",
  symbol: "MSFT",
  name: "Microsoft",
};

function tokenFor(id: string) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.fake-signature`;
}

async function signIn(page: Page, id: string) {
  await page.evaluate(
    async ({ token }) => {
      const modulePath = "/src/lib/supabase/client.ts";
      const module: typeof import("../src/lib/supabase/client") = await import(
        modulePath
      );
      const { error } = await module
        .getSupabaseBrowserClient()
        .auth.setSession({
          access_token: token,
          refresh_token: "fake-refresh-token",
        });
      if (error) throw error;
    },
    { token: tokenFor(id) },
  );
}

test("opens instrument details from the dashboard and reuses history across line ranges", async ({
  page,
}) => {
  const timestamp = "2026-11-16T14:30:00Z";
  const candle = {
    timestamp,
    open: 100,
    high: 105,
    low: 99,
    close: 104,
    volume: 1000,
  };
  let historyRequests = 0;

  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      json: {
        id: ownerA,
        email: "a@example.com",
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: timestamp,
      },
    }),
  );
  await page.route("**/rest/v1/rpc/read_my_watchlist", (route) =>
    route.fulfill({
      json: { revision: 1, instruments: [apple] },
    }),
  );
  await page.route("**/api/market/**", (route) => {
    const url = new URL(route.request().url());
    const market = {
      marketOpen: false,
      nextOpen: new Date(Date.now() + 3600000).toISOString(),
    };
    switch (url.pathname) {
      case "/api/market/snapshots":
        return route.fulfill({
          json: {
            ...market,
            fetchedAt: timestamp,
            snapshots: [
              { symbol: "AAPL", price: 104, changePercent: 4, asOf: timestamp },
            ],
          },
        });
      case "/api/market/instrument":
        expect(url.searchParams.get("symbol")).toBe("AAPL");
        return route.fulfill({
          json: {
            ...market,
            name: "Apple",
            exchange: "NASDAQ",
            currency: "USD",
            price: 104,
            changePercent: 4,
            previousClose: 100,
            asOf: timestamp,
            bid: 103,
            ask: 105,
            quoteAsOf: timestamp,
            dailyBar: { ...candle, vwap: 102, trades: 40 },
          },
        });
      case "/api/market/instrument-session":
        return route.fulfill({
          json: { sessionDate: "2026-11-16", candles: [candle] },
        });
      case "/api/market/history-bundle":
        if (url.searchParams.get("symbols") === "AAPL") historyRequests++;
        return route.fulfill({
          json: {
            fetchedAt: timestamp,
            histories: ["1W", "1M", "3M"].map((range) => ({
              symbol: "AAPL",
              range,
              sessionDate: null,
              points: [{ timestamp, price: 104 }],
            })),
          },
        });
      default:
        return route.fulfill({
          json: { fetchedAt: timestamp, histories: [], articles: [] },
        });
    }
  });

  const apiResponse = await page.request.get(
    "/api/market/instrument?symbol=AAPL",
  );
  expect(apiResponse.status()).toBe(401);
  await page.goto("/instrument/AAPL");
  await expect(page).toHaveURL(/\/login\?instrument=AAPL$/);
  await page.getByRole("link", { name: "MarketLens dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page, ownerA);
  const detailsLink = page.getByRole("link", { name: "View AAPL details" });
  await expect(detailsLink).toHaveAttribute("href", "/instrument/AAPL");
  await detailsLink.click();
  await expect(page).toHaveURL(/\/instrument\/AAPL$/);
  const chart = page.getByRole("img", {
    name: "AAPL 15-minute candlestick chart",
  });
  await expect(chart.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "AAPL" })).toBeVisible();
  await expect(page.getByText("VWAP", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Line", exact: true }).click();
  await expect(
    page
      .getByRole("img", { name: "AAPL 1D line chart" })
      .locator("canvas")
      .first(),
  ).toBeVisible();
  await expect.poll(() => historyRequests).toBe(1);
  await page.getByRole("button", { name: "1W", exact: true }).click();
  await expect(
    page
      .getByRole("img", { name: "AAPL 1W line chart" })
      .locator("canvas")
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "1M", exact: true }).click();
  await expect(
    page
      .getByRole("img", { name: "AAPL 1M line chart" })
      .locator("canvas")
      .first(),
  ).toBeVisible();
  expect(historyRequests).toBe(1);
});

test("copies the anonymous list immediately after password login without an extra refresh", async ({
  page,
}) => {
  const user = {
    id: ownerA,
    email: "a@example.com",
    aud: "authenticated",
    created_at: "2026-11-16T10:00:00Z",
    app_metadata: {},
    user_metadata: {},
  };
  let saved = { revision: 7, instruments: [] as (typeof apple)[] };
  let dashboardNavigations = 0;
  page.on("request", (request) => {
    if (
      request.isNavigationRequest() &&
      new URL(request.url()).pathname === "/"
    )
      dashboardNavigations += 1;
  });
  await page.route("**/auth/v1/token*", async (route) =>
    route.fulfill({
      json: {
        access_token: tokenFor(ownerA),
        refresh_token: "fake-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user,
      },
    }),
  );
  await page.route("**/auth/v1/user", async (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/rest/v1/rpc/read_my_watchlist", async (route) =>
    route.fulfill({ json: saved }),
  );
  await page.route("**/rest/v1/rpc/save_my_watchlist", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      expected_user_id: ownerA,
      expected_revision: 7,
      instrument_ids: [1],
    });
    saved = { revision: 8, instruments: [apple] };
    await route.fulfill({ json: saved });
  });
  await page.route("**/api/market/**", async (route) =>
    route.fulfill({
      json: {
        snapshots: [],
        histories: [],
        articles: [],
        marketOpen: false,
        nextOpen: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.addInitScript((instrument) => {
    localStorage.setItem(
      "marketlens-watchlist",
      JSON.stringify({ state: { instruments: [instrument] }, version: 1 }),
    );
  }, apple);

  // Reuse an anonymous SSR document for the redirect so the test never sends
  // its fake JWT to a live Auth server. Browser Auth/RPC requests are mocked.
  const document = await page.request.get("/");
  const html = await document.text();
  await page.goto("/login");
  await page.route(new URL("/", page.url()).href, async (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.evaluate(
    (owner) =>
      sessionStorage.setItem("marketlens-watchlist-initialized", owner),
    ownerA,
  );
  await page.getByLabel("Email", { exact: true }).fill("a@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Test-password1!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("list", { name: "Watchlist instruments" }),
  ).toContainText("AAPL");
  await expect.poll(() => saved.instruments.length).toBe(1);
  expect(dashboardNavigations).toBe(1);
});

test("uses the dashboard for account lists, seeds only empty accounts, and restores anonymous selections on logout", async ({
  page,
}) => {
  const lists = new Map([
    [ownerA, { revision: 1, instruments: [apple] }],
    [ownerB, { revision: 0, instruments: [] as (typeof apple)[] }],
  ]);
  let activeOwner = ownerA;
  await page.route("**/auth/v1/user", async (route) => {
    const auth = route.request().headers().authorization ?? "";
    activeOwner = auth.includes(tokenFor(ownerB)) ? ownerB : ownerA;
    await route.fulfill({
      json: {
        id: activeOwner,
        email: `${activeOwner === ownerA ? "a" : "b"}@example.com`,
        aud: "authenticated",
        created_at: "2026-11-16T10:00:00Z",
        app_metadata: {},
        user_metadata: {},
      },
    });
  });
  await page.route("**/auth/v1/logout*", async (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/rest/v1/rpc/read_my_watchlist", async (route) =>
    route.fulfill({ json: lists.get(activeOwner) }),
  );
  await page.route("**/rest/v1/rpc/save_my_watchlist", async (route) => {
    const body = z
      .object({
        expected_user_id: z.string(),
        expected_revision: z.number(),
        instrument_ids: z.array(z.number()),
      })
      .parse(route.request().postDataJSON());
    expect(body.expected_user_id).toBe(activeOwner);
    const current = lists.get(activeOwner);
    expect(body.expected_revision).toBe(current?.revision);
    const next = {
      revision: body.expected_revision + 1,
      instruments: body.instrument_ids.flatMap((id) =>
        [apple, microsoft].filter((instrument) => instrument.id === id),
      ),
    };
    lists.set(activeOwner, next);
    await route.fulfill({ json: next });
  });
  await page.route("**/api/market/**", async (route) =>
    route.fulfill({
      json: {
        snapshots: [],
        histories: [],
        articles: [],
        marketOpen: false,
        nextOpen: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.addInitScript((instrument) => {
    localStorage.setItem(
      "marketlens-watchlist",
      JSON.stringify({ state: { instruments: [instrument] }, version: 1 }),
    );
  }, microsoft);
  await page.goto("/");
  const watchlist = page.getByRole("list", { name: "Watchlist instruments" });
  await expect(watchlist).toContainText("MSFT");
  await signIn(page, ownerA);
  await expect(watchlist).toContainText("AAPL");
  await expect(watchlist).not.toContainText("MSFT");
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("button", { name: "Remove AAPL from watchlist" })
    .click();
  await expect(page.getByText("Your watchlist is empty.")).toBeVisible();
  await expect.poll(() => lists.get(ownerA)?.instruments.length).toBe(0);
  await signIn(page, ownerB);
  await expect(watchlist).toContainText("MSFT");
  await expect(
    page.getByRole("button", { name: "Remove AAPL from watchlist" }),
  ).toHaveCount(0);
  await page.evaluate(async () => {
    const modulePath = "/src/lib/supabase/client.ts";
    const module: typeof import("../src/lib/supabase/client") = await import(
      modulePath
    );
    await module.getSupabaseBrowserClient().auth.signOut({ scope: "local" });
  });
  await expect(page).toHaveURL(/\/$/);
  await expect(watchlist).toContainText("MSFT");
  await page.getByRole("button", { name: "Open site menu" }).click();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }),
  ).toBeVisible();
  expect(lists.get(ownerB)?.instruments).toEqual([microsoft]);
  expect(lists.get(ownerA)?.instruments).toEqual([]);
});

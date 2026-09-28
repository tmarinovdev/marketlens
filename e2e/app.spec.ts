import { expect, test } from "@playwright/test";

test("renders the dashboard on the server and hydrates navigation", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  expect(await response?.text()).toMatch(/<h1\b[^>]*>MarketLens<\/h1>/);
  await expect(
    page.getByRole("heading", { level: 2, name: "My Watchlist" }),
  ).toBeVisible();
  await expect(
    page.getByText(`© ${new Date().getUTCFullYear()} MarketLens`),
  ).toBeVisible();
  await expect(
    page.getByText(/MarketLens is for informational purposes only/),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('16px "Inter Variable"')),
  ).toBe(true);
  await page.waitForLoadState("networkidle");
  const initialDocumentTime = await page.evaluate(() => performance.timeOrigin);

  await expect(
    page.getByRole("combobox", { name: "Search financial instruments" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Open site menu" }).click();
  await page.getByRole("link", { name: "About" }).click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "About MarketLens" }),
  ).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(
    initialDocumentTime,
  );
});

test("server-renders route data on a direct About request", async ({
  page,
}) => {
  const response = await page.goto("/about");

  expect(response?.status()).toBe(200);
  expect(await response?.text()).toMatch(/data-query-source="server"/);
  await expect(page.locator("[data-query-source='server']")).toBeVisible();
});

test("reorders and persists an anonymous watchlist with the keyboard", async ({
  page,
}) => {
  const chartSizeWarnings: string[] = [];
  let historyRequestCount = 0;
  let newsRequestCount = 0;
  let activeHistoryRequests = 0;
  let historyBundleLoaded = false;
  const pricesByRange: Record<string, readonly number[]> = {
    "1D": [100, 104, 102],
    "1W": [100, 98, 105],
    "1M": [100, 106, 101],
    "3M": [100, 95, 108],
    "1Y": [100, 110, 103],
    YTD: [100, 97, 112],
  };
  page.on("console", (message) => {
    if (message.text().includes("width(0) and height(0) of chart")) {
      chartSizeWarnings.push(message.text());
    }
  });

  await page.route("**/api/market/snapshots?*", async (route) => {
    const symbols =
      new URL(route.request().url()).searchParams.get("symbols")?.split(",") ??
      [];
    await route.fulfill({
      json: {
        snapshots: symbols.map((symbol, index) => ({
          symbol,
          price: 100 + index,
          changePercent: index === 0 ? 1.25 : -0.75,
          asOf: "2026-09-28T14:00:00Z",
        })),
        marketOpen: false,
        nextOpen: "2026-09-29T09:30:00-04:00",
        fetchedAt: "2026-09-28T14:00:00Z",
      },
    });
  });
  await page.route(/\/api\/market\/history\?/, async (route) => {
    historyRequestCount += 1;
    activeHistoryRequests += 1;
    const requestUrl = new URL(route.request().url());
    const symbols = requestUrl.searchParams.get("symbols")?.split(",") ?? [];
    const prices = pricesByRange["1D"];
    await route.fulfill({
      json: {
        histories: symbols.map((symbol) => ({
          symbol,
          range: "1D",
          sessionDate: "2026-09-28",
          points: prices?.map((price, index) => ({
            timestamp: `2026-09-28T${13 + index}:30:00Z`,
            price,
          })),
        })),
        fetchedAt: "2026-09-28T14:00:00Z",
      },
    });
    activeHistoryRequests -= 1;
  });
  await page.route(/\/api\/market\/history-bundle\?/, async (route) => {
    historyRequestCount += 1;
    activeHistoryRequests += 1;
    const requestUrl = new URL(route.request().url());
    const symbols = requestUrl.searchParams.get("symbols")?.split(",") ?? [];
    const ranges = ["1W", "1M", "3M", "1Y", "YTD"] as const;

    await route.fulfill({
      json: {
        histories: symbols.flatMap((symbol) =>
          ranges.map((range) => ({
            symbol,
            range,
            sessionDate: null,
            points: pricesByRange[range]?.map((price, index) => ({
              timestamp: `2026-09-${26 + index}T14:00:00Z`,
              price,
            })),
          })),
        ),
        fetchedAt: "2026-09-28T14:00:00Z",
      },
    });
    activeHistoryRequests -= 1;
    historyBundleLoaded = true;
  });
  await page.route(/\/api\/market\/news\?/, async (route) => {
    newsRequestCount += 1;
    const symbols =
      new URL(route.request().url()).searchParams.get("symbols")?.split(",") ??
      [];

    await route.fulfill({
      json: {
        articles: [
          {
            id: "news-1",
            headline: "Apple and Microsoft lead the market",
            summary: "Technology shares advanced in the latest session.",
            source: "Example News",
            author: "Reporter",
            publishedAt: "2026-09-28T14:00:00Z",
            url: "https://example.com/market-news",
            imageUrl: null,
            symbols,
          },
        ],
        fetchedAt: "2026-09-28T14:00:00Z",
      },
    });
  });
  await page.addInitScript(() => {
    if (localStorage.getItem("marketlens-watchlist")) return;

    localStorage.setItem(
      "marketlens-watchlist",
      JSON.stringify({
        state: {
          instruments: [
            {
              id: 1,
              provider: "alpaca",
              providerAssetId: "apple-id",
              symbol: "AAPL",
              name: "Apple Inc. Common Stock",
              assetClass: "us_equity",
              instrumentType: null,
              exchange: "NASDAQ",
              currency: "USD",
            },
            {
              id: 2,
              provider: "alpaca",
              providerAssetId: "microsoft-id",
              symbol: "MSFT",
              name: "Microsoft Corporation",
              assetClass: "us_equity",
              instrumentType: null,
              exchange: "NASDAQ",
              currency: "USD",
            },
          ],
        },
        version: 1,
      }),
    );
  });
  await page.goto("/");

  const watchlist = page.getByRole("list", { name: "Watchlist instruments" });
  const charts = page.getByRole("region", { name: "Market charts" });
  await expect(charts.getByRole("article")).toHaveCount(2);
  await expect(charts.getByRole("article").first()).toContainText("AAPL");
  const marketNews = page.getByRole("region", { name: "Market News" });
  await expect(marketNews).toContainText("Apple and Microsoft lead the market");
  expect(newsRequestCount).toBe(1);
  const appleChart = charts
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "AAPL" }) });
  const microsoftChart = charts
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "MSFT" }) });
  const applePath = appleChart.locator(".recharts-area-curve");
  const microsoftPath = microsoftChart.locator(".recharts-area-curve");
  const initialApplePath = await applePath.getAttribute("d");
  const initialMicrosoftPath = await microsoftPath.getAttribute("d");
  await expect.poll(() => historyBundleLoaded).toBe(true);
  await expect.poll(() => activeHistoryRequests).toBe(0);
  expect(historyRequestCount).toBe(2);
  const requestsBeforeRangeChange = historyRequestCount;

  await appleChart.getByRole("button", { name: "3M" }).click();
  await expect(appleChart.getByRole("button", { name: "3M" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => applePath.getAttribute("d"))
    .not.toBe(initialApplePath);
  await expect(
    microsoftChart.getByRole("button", { name: "1D" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await microsoftPath.getAttribute("d")).toBe(initialMicrosoftPath);
  expect(historyRequestCount).toBe(requestsBeforeRangeChange);

  const appleHandle = page.getByRole("button", { name: "Reorder AAPL" });
  const appleItem = appleHandle.locator("..");
  await appleHandle.focus();
  await appleHandle.press("Enter");
  await expect(appleItem).toHaveAttribute("data-dragging", "true");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await appleHandle.press("ArrowRight");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await appleHandle.press("Enter");
  await expect(appleItem).toHaveAttribute("data-dragging", "false");

  await expect(watchlist.getByRole("listitem").first()).toContainText("MSFT");
  await expect(charts.getByRole("article").first()).toContainText("MSFT");
  expect(newsRequestCount).toBe(1);
  await page.reload();
  await expect(watchlist.getByRole("listitem").first()).toContainText("MSFT");
  await expect(charts.getByRole("article").first()).toContainText("MSFT");
  await expect(marketNews).toContainText("Apple and Microsoft lead the market");
  expect(newsRequestCount).toBe(2);
  expect(chartSizeWarnings).toEqual([]);
});

test("returns a router-owned 404 page for an unknown route", async ({
  page,
}) => {
  const response = await page.goto("/missing");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to MarketLens" }),
  ).toBeVisible();
});

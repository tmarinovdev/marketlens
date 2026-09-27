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
  await page.reload();
  await expect(watchlist.getByRole("listitem").first()).toContainText("MSFT");
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

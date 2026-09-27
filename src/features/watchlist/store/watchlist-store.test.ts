import { beforeEach, describe, expect, it } from "vitest";
import { useWatchlistStore, watchlistStorageKey } from "./watchlist-store";

const apple = {
  id: 1,
  provider: "alpaca",
  providerAssetId: "apple-id",
  symbol: "AAPL",
  name: "Apple Inc. Common Stock",
  assetClass: "us_equity",
  instrumentType: null,
  exchange: "NASDAQ",
  currency: "USD",
} as const;

const microsoft = {
  ...apple,
  id: 2,
  providerAssetId: "microsoft-id",
  symbol: "MSFT",
  name: "Microsoft Corporation",
} as const;

describe("watchlist store", () => {
  beforeEach(() => {
    localStorage.clear();
    useWatchlistStore.setState({ instruments: [], hasHydrated: false });
  });

  it("persists additions, ignores duplicates, and removes instruments", () => {
    const { addInstrument, removeInstrument } = useWatchlistStore.getState();

    addInstrument(apple);
    addInstrument(apple);

    expect(useWatchlistStore.getState().instruments).toEqual([apple]);
    expect(localStorage.getItem(watchlistStorageKey)).toContain('"AAPL"');

    removeInstrument(apple.provider, apple.providerAssetId);

    expect(useWatchlistStore.getState().instruments).toEqual([]);
  });

  it("reorders instruments and persists their new order", () => {
    const { addInstrument, reorderInstrument } = useWatchlistStore.getState();

    addInstrument(apple);
    addInstrument(microsoft);
    reorderInstrument("alpaca:microsoft-id", "alpaca:apple-id");

    expect(
      useWatchlistStore
        .getState()
        .instruments.map((instrument) => instrument.symbol),
    ).toEqual(["MSFT", "AAPL"]);
    expect(localStorage.getItem(watchlistStorageKey)).toMatch(/"MSFT".*"AAPL"/);
  });
});

import { describe, expect, it } from "vitest";
import {
  marketHistoryBundleQueryOptions,
  marketIntradayHistoryQueryOptions,
  marketSnapshotsQueryOptions,
} from "./market-data";

describe("market data query configuration", () => {
  it("polls snapshots every 30 seconds with an order-independent key", () => {
    const options = marketSnapshotsQueryOptions(["MSFT", "AAPL", "AAPL"]);

    expect(options.queryKey).toEqual(["market-snapshots", ["AAPL", "MSFT"]]);
    expect(options.refetchInterval).toBe(30_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it("refreshes 1D history every 15 minutes only while the market is open", () => {
    expect(
      marketIntradayHistoryQueryOptions(["AAPL"], true).refetchInterval,
    ).toBe(15 * 60_000);
    expect(
      marketIntradayHistoryQueryOptions(["AAPL"], false).refetchInterval,
    ).toBe(false);
  });

  it("preloads the longer-range bundle independently of tab selection", () => {
    const options = marketHistoryBundleQueryOptions(
      ["MSFT", "AAPL", "AAPL"],
      true,
    );

    expect(options.queryKey).toEqual([
      "market-history-bundle",
      ["AAPL", "MSFT"],
    ]);
    expect(
      marketHistoryBundleQueryOptions(["AAPL"], true).refetchInterval,
    ).toBe(60 * 60_000);
    expect(
      marketHistoryBundleQueryOptions(["AAPL"], false).refetchInterval,
    ).toBe(false);
  });
});

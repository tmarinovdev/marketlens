import { queryOptions } from "@tanstack/react-query";
import {
  fetchMarketHistory,
  fetchMarketHistoryBundle,
  fetchMarketSnapshots,
} from "../api/market-data";

const snapshotRefreshInterval = 30_000;
const intradayHistoryRefreshInterval = 15 * 60_000;
const historyBundleRefreshInterval = 60 * 60_000;
const historyBundleClosedStaleTime = 6 * 60 * 60_000;

function normalizedSymbols(symbols: readonly string[]): readonly string[] {
  return [...new Set(symbols.map((symbol) => symbol.toUpperCase()))].sort();
}

export function marketSnapshotsQueryOptions(symbols: readonly string[]) {
  const normalized = normalizedSymbols(symbols);

  return queryOptions({
    queryKey: ["market-snapshots", normalized] as const,
    queryFn: ({ signal }) => fetchMarketSnapshots(normalized, signal),
    staleTime: snapshotRefreshInterval,
    gcTime: 5 * 60_000,
    refetchInterval: snapshotRefreshInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function marketIntradayHistoryQueryOptions(
  symbols: readonly string[],
  marketOpen: boolean,
) {
  const normalized = normalizedSymbols(symbols);

  return queryOptions({
    queryKey: ["market-history", "1D", normalized] as const,
    queryFn: ({ signal }) => fetchMarketHistory(normalized, "1D", signal),
    staleTime: intradayHistoryRefreshInterval,
    gcTime: 24 * 60 * 60_000,
    refetchInterval: marketOpen ? intradayHistoryRefreshInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: marketOpen,
  });
}

export function marketHistoryBundleQueryOptions(
  symbols: readonly string[],
  marketOpen: boolean,
) {
  const normalized = normalizedSymbols(symbols);

  return queryOptions({
    queryKey: ["market-history-bundle", normalized] as const,
    // Let this background preload finish if StrictMode temporarily unmounts
    // its observer, so development does not start the same bundle twice.
    queryFn: () => fetchMarketHistoryBundle(normalized),
    staleTime: marketOpen
      ? historyBundleRefreshInterval
      : historyBundleClosedStaleTime,
    gcTime: 24 * 60 * 60_000,
    refetchInterval: marketOpen ? historyBundleRefreshInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: marketOpen,
  });
}

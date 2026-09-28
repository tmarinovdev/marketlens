import { queryOptions } from "@tanstack/react-query";
import { fetchMarketNews } from "../api/market-news";

const newsStaleTime = 5 * 60_000;

function normalizedSymbols(symbols: readonly string[]): readonly string[] {
  return [...new Set(symbols.map((symbol) => symbol.toUpperCase()))].sort();
}

export function marketNewsQueryOptions(symbols: readonly string[]) {
  const normalized = normalizedSymbols(symbols);

  return queryOptions({
    queryKey: ["market-news", normalized] as const,
    queryFn: ({ signal }) => fetchMarketNews(normalized, signal),
    staleTime: newsStaleTime,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
  });
}

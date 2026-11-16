import { queryOptions } from "@tanstack/react-query";

export function ownedWatchlistQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["account-watchlist", userId] as const,
    queryFn: async ({ signal }) =>
      (await import("../api/owned-watchlist")).fetchOwnedWatchlist(signal),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

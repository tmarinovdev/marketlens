import { queryOptions } from "@tanstack/react-query";
import {
  fetchInstrumentDetail,
  fetchInstrumentSession,
  MarketRequestError,
} from "../api/market-data";

function retryTransientFailure(failureCount: number, error: Error) {
  if (error instanceof MarketRequestError && error.status < 500) return false;
  return failureCount < 1;
}

export function instrumentDetailOptions(userId: string, symbol: string) {
  return queryOptions({
    queryKey: ["instrument-detail", userId, symbol] as const,
    queryFn: ({ signal }) => fetchInstrumentDetail(symbol, signal),
    retry: retryTransientFailure,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const error = query.state.error;
      if (error instanceof MarketRequestError && error.status < 500)
        return false;
      const data = query.state.data;
      if (!data || data.marketOpen) return 30_000;
      // Bound the timer even if the market is closed for an extended period.
      return Math.min(
        6 * 60 * 60_000,
        Math.max(30_000, Date.parse(data.nextOpen) - Date.now()),
      );
    },
    refetchIntervalInBackground: false,
  });
}

export function instrumentSessionOptions(
  userId: string,
  symbol: string,
  marketOpen: boolean,
) {
  const interval = 15 * 60_000;
  return queryOptions({
    queryKey: ["instrument-session", userId, symbol] as const,
    queryFn: ({ signal }) => fetchInstrumentSession(symbol, signal),
    retry: retryTransientFailure,
    staleTime: interval,
    refetchInterval: marketOpen ? interval : false,
    refetchIntervalInBackground: false,
  });
}

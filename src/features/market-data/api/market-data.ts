import { z } from "zod";
import {
  instrumentDetailSchema,
  instrumentSessionSchema,
} from "../types/instrument-detail";
import { chartRanges } from "../types/market-data";
import type {
  ChartRange,
  MarketHistoryResponse,
  MarketSnapshotsResponse,
} from "../types/market-data";

const MarketSnapshotSchema = z.object({
  symbol: z.string(),
  price: z.number().nullable(),
  changePercent: z.number().nullable(),
  asOf: z.iso.datetime({ offset: true }).nullable(),
});

const MarketSnapshotsResponseSchema = z.object({
  snapshots: z.array(MarketSnapshotSchema),
  marketOpen: z.boolean(),
  nextOpen: z.iso.datetime({ offset: true }),
  fetchedAt: z.iso.datetime({ offset: true }),
});

const PricePointSchema = z.object({
  timestamp: z.iso.datetime({ offset: true }),
  price: z.number(),
});

const MarketHistoryResponseSchema = z.object({
  histories: z.array(
    z.object({
      symbol: z.string(),
      range: z.enum(chartRanges),
      sessionDate: z.string().nullable(),
      points: z.array(PricePointSchema),
    }),
  ),
  fetchedAt: z.iso.datetime({ offset: true }),
});

function marketPath(
  pathname: string,
  symbols: readonly string[],
  range?: ChartRange,
): string {
  const searchParams = new URLSearchParams({ symbols: symbols.join(",") });
  if (range) searchParams.set("range", range);
  return `${pathname}?${searchParams}`;
}

export class MarketRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Market data request failed with ${status}.`);
    this.status = status;
  }
}

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new MarketRequestError(response.status);
  }

  return response.json();
}

export async function fetchInstrumentDetail(
  symbol: string,
  signal: AbortSignal,
) {
  return instrumentDetailSchema.parse(
    await fetchJson(
      `/api/market/instrument?${new URLSearchParams({ symbol })}`,
      signal,
    ),
  );
}

export async function fetchInstrumentSession(
  symbol: string,
  signal: AbortSignal,
) {
  return instrumentSessionSchema.parse(
    await fetchJson(
      `/api/market/instrument-session?${new URLSearchParams({ symbol })}`,
      signal,
    ),
  );
}

export async function fetchMarketSnapshots(
  symbols: readonly string[],
  signal: AbortSignal,
): Promise<MarketSnapshotsResponse> {
  const path = marketPath("/api/market/snapshots", symbols);
  return MarketSnapshotsResponseSchema.parse(await fetchJson(path, signal));
}

export async function fetchMarketHistory(
  symbols: readonly string[],
  range: ChartRange,
  signal: AbortSignal,
): Promise<MarketHistoryResponse> {
  const path = marketPath("/api/market/history", symbols, range);
  return MarketHistoryResponseSchema.parse(await fetchJson(path, signal));
}

export async function fetchMarketHistoryBundle(
  symbols: readonly string[],
  signal?: AbortSignal,
): Promise<MarketHistoryResponse> {
  const path = marketPath("/api/market/history-bundle", symbols);
  return MarketHistoryResponseSchema.parse(await fetchJson(path, signal));
}

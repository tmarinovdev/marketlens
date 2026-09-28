export const chartRanges = ["1D", "1W", "1M", "3M", "1Y", "YTD"] as const;

export type ChartRange = (typeof chartRanges)[number];

export interface MarketSnapshot {
  readonly symbol: string;
  readonly price: number | null;
  readonly changePercent: number | null;
  readonly asOf: string | null;
}

export interface MarketSnapshotsResponse {
  readonly snapshots: readonly MarketSnapshot[];
  readonly marketOpen: boolean;
  readonly nextOpen: string;
  readonly fetchedAt: string;
}

export interface PricePoint {
  readonly timestamp: string;
  readonly price: number;
}

export interface MarketHistory {
  readonly symbol: string;
  readonly range: ChartRange;
  readonly sessionDate: string | null;
  readonly points: readonly PricePoint[];
}

export interface MarketHistoryResponse {
  readonly histories: readonly MarketHistory[];
  readonly fetchedAt: string;
}

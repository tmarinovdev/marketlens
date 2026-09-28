import type {
  ChartRange,
  MarketHistory,
  MarketSnapshotsResponse,
} from "@/features/market-data/types/market-data";

export interface MarketProviderRequestOptions {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly fetchImplementation?: typeof fetch;
}

export interface MarketProvider {
  snapshots(
    symbols: readonly string[],
    options: MarketProviderRequestOptions,
  ): Promise<MarketSnapshotsResponse>;
  history(
    symbols: readonly string[],
    range: ChartRange,
    options: MarketProviderRequestOptions,
  ): Promise<readonly MarketHistory[]>;
  historyBundle(
    symbols: readonly string[],
    options: MarketProviderRequestOptions,
  ): Promise<readonly MarketHistory[]>;
}

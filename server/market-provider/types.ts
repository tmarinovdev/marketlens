import type {
  ChartRange,
  MarketHistory,
  MarketSnapshotsResponse,
} from "@/features/market-data/types/market-data";
import type { MarketNewsItem } from "@/features/news/types/market-news";
import type {
  InstrumentQuote,
  InstrumentSession,
} from "@/features/market-data/types/instrument-detail";

export interface MarketProviderRequestOptions {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly fetchImplementation?: typeof fetch;
}

export interface MarketProvider {
  instrumentQuote(
    symbol: string,
    options: MarketProviderRequestOptions,
  ): Promise<InstrumentQuote>;
  instrumentSession(
    symbol: string,
    options: MarketProviderRequestOptions,
  ): Promise<InstrumentSession>;
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
  news(
    symbols: readonly string[],
    options: MarketProviderRequestOptions,
  ): Promise<readonly MarketNewsItem[]>;
}

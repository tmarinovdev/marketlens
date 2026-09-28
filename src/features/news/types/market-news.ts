export interface MarketNewsItem {
  readonly id: string;
  readonly headline: string;
  readonly summary: string | null;
  readonly source: string;
  readonly author: string | null;
  readonly publishedAt: string;
  readonly url: string;
  readonly imageUrl: string | null;
  readonly symbols: readonly string[];
}

export interface MarketNewsResponse {
  readonly articles: readonly MarketNewsItem[];
  readonly fetchedAt: string;
}

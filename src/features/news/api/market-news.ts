import { z } from "zod";
import type { MarketNewsResponse } from "../types/market-news";

const MarketNewsResponseSchema = z.object({
  articles: z.array(
    z.object({
      id: z.string(),
      headline: z.string(),
      summary: z.string().nullable(),
      source: z.string(),
      author: z.string().nullable(),
      publishedAt: z.iso.datetime({ offset: true }),
      url: z.url(),
      imageUrl: z.url().nullable(),
      symbols: z.array(z.string()),
    }),
  ),
  fetchedAt: z.iso.datetime({ offset: true }),
});

export async function fetchMarketNews(
  symbols: readonly string[],
  signal: AbortSignal,
): Promise<MarketNewsResponse> {
  const searchParams = new URLSearchParams({ symbols: symbols.join(",") });
  const response = await fetch(`/api/market/news?${searchParams}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Market news request failed with ${response.status}.`);
  }

  return MarketNewsResponseSchema.parse(await response.json());
}

import { z } from "zod";
import type { MarketNewsItem } from "@/features/news/types/market-news";
import type { MarketProviderRequestOptions } from "../types.ts";

const ALPACA_NEWS_URL = "https://data.alpaca.markets/v1beta1/news";
const upstreamArticleLimit = 30;
const dashboardArticleLimit = 12;

const AlpacaNewsImageSchema = z.object({
  size: z.string(),
  url: z.url(),
});

const AlpacaNewsArticleSchema = z.object({
  id: z.number(),
  headline: z.string().min(1),
  summary: z.string().nullish(),
  source: z.string().min(1),
  author: z.string().nullish(),
  created_at: z.iso.datetime({ offset: true }),
  url: z.url(),
  images: z.array(AlpacaNewsImageSchema).nullish(),
  symbols: z.array(z.string()),
});

const AlpacaNewsResponseSchema = z.object({
  news: z.array(AlpacaNewsArticleSchema),
  next_page_token: z.string().nullish(),
});

function selectImage(
  images: z.infer<typeof AlpacaNewsImageSchema>[] | null | undefined,
): string | null {
  if (!images?.length) return null;

  return (
    images.find((image) => image.size === "small")?.url ??
    images[0]?.url ??
    null
  );
}

export async function fetchAlpacaNews(
  symbols: readonly string[],
  {
    apiKey,
    apiSecret,
    fetchImplementation = fetch,
  }: MarketProviderRequestOptions,
): Promise<readonly MarketNewsItem[]> {
  const url = new URL(ALPACA_NEWS_URL);
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("limit", String(upstreamArticleLimit));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("include_content", "false");

  const response = await fetchImplementation(url, {
    headers: {
      Accept: "application/json",
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 500);
    throw new Error(
      `Alpaca news request failed with ${response.status}: ${responseBody}`,
    );
  }

  const payload = AlpacaNewsResponseSchema.parse(await response.json());
  const requestedSymbols = new Set(symbols);
  const uniqueArticles = new Map<number, MarketNewsItem>();

  for (const article of payload.news) {
    if (uniqueArticles.has(article.id)) continue;

    const relevantSymbols = article.symbols.filter((symbol) =>
      requestedSymbols.has(symbol),
    );
    if (relevantSymbols.length === 0) continue;

    uniqueArticles.set(article.id, {
      id: String(article.id),
      headline: article.headline,
      summary: article.summary?.trim() || null,
      source: article.source,
      author: article.author?.trim() || null,
      publishedAt: article.created_at,
      url: article.url,
      imageUrl: selectImage(article.images),
      symbols: relevantSymbols,
    });
  }

  return [...uniqueArticles.values()]
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime(),
    )
    .slice(0, dashboardArticleLimit);
}

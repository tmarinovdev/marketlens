// @vitest-environment node

import { describe, expect, it } from "vitest";
import { fetchAlpacaNews } from "./news.ts";

const options = {
  apiKey: "key",
  apiSecret: "secret",
};

function article(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    headline: `Headline ${id}`,
    summary: `Summary ${id}`,
    source: "Example News",
    author: "Reporter",
    created_at: `2026-09-28T${String(id).padStart(2, "0")}:00:00Z`,
    url: `https://example.com/news/${id}`,
    images: [
      { size: "large", url: `https://example.com/images/${id}-large.jpg` },
      { size: "small", url: `https://example.com/images/${id}-small.jpg` },
    ],
    symbols: ["AAPL"],
    ...overrides,
  };
}

describe("Alpaca news", () => {
  it("requests all watchlist symbols once and normalizes the newest 12 stories", async () => {
    let requestCount = 0;
    const fetchImplementation: typeof fetch = async (input, init) => {
      requestCount += 1;
      const url = new URL(String(input));

      expect(url.searchParams.get("symbols")).toBe("AAPL,MSFT");
      expect(url.searchParams.get("limit")).toBe("30");
      expect(url.searchParams.get("sort")).toBe("desc");
      expect(url.searchParams.get("include_content")).toBe("false");
      expect(init?.headers).toMatchObject({
        "APCA-API-KEY-ID": "key",
        "APCA-API-SECRET-KEY": "secret",
      });

      return Response.json({
        news: [
          ...Array.from({ length: 13 }, (_, index) => article(index + 1)),
          article(13),
          article(14, { symbols: ["TSLA"] }),
        ],
        next_page_token: "unused",
      });
    };

    const result = await fetchAlpacaNews(["AAPL", "MSFT"], {
      ...options,
      fetchImplementation,
    });

    expect(requestCount).toBe(1);
    expect(result).toHaveLength(12);
    expect(result.map(({ id }) => id)).toEqual([
      "13",
      "12",
      "11",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
    expect(result[0]).toMatchObject({
      imageUrl: "https://example.com/images/13-small.jpg",
      symbols: ["AAPL"],
    });
  });

  it("keeps only requested symbols and normalizes optional text and images", async () => {
    const fetchImplementation: typeof fetch = async () =>
      Response.json({
        news: [
          article(1, {
            summary: "   ",
            author: null,
            images: null,
            symbols: ["TSLA", "MSFT", "AAPL"],
          }),
        ],
      });

    await expect(
      fetchAlpacaNews(["AAPL", "MSFT"], {
        ...options,
        fetchImplementation,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        summary: null,
        author: null,
        imageUrl: null,
        symbols: ["MSFT", "AAPL"],
      }),
    ]);
  });
});

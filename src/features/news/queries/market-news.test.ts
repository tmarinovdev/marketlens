import { describe, expect, it } from "vitest";
import { marketNewsQueryOptions } from "./market-news";

describe("market news query configuration", () => {
  it("uses an order-independent key and caches news for five minutes", () => {
    const options = marketNewsQueryOptions(["msft", "AAPL", "AAPL"]);

    expect(options.queryKey).toEqual(["market-news", ["AAPL", "MSFT"]]);
    expect(options.staleTime).toBe(5 * 60_000);
    expect(options.gcTime).toBe(30 * 60_000);
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});

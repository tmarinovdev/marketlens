import { z } from "zod";
import { chartRanges } from "../src/features/market-data/types/market-data.ts";
import { getServerEnv } from "./env.ts";
import { alpacaMarketProvider } from "./market-provider/alpaca/market-data.ts";

const maximumSymbols = 20;
const SymbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9.-]{0,9}$/);
const RangeSchema = z.enum(chartRanges);

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

function parseSymbols(url: URL): readonly string[] {
  const values = url.searchParams.get("symbols")?.split(",") ?? [];
  const parsed = z.array(SymbolSchema).min(1).max(maximumSymbols).parse(values);
  return [...new Set(parsed)];
}

export async function handleMarketApiRequest(
  request: Request,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/market/")) return undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(
      { error: "Method not allowed." },
      { status: 405, headers: { Allow: "GET, HEAD" } },
    );
  }

  try {
    const symbols = parseSymbols(url);
    const { ALPACA_API_KEY, ALPACA_API_SECRET } = getServerEnv();
    const providerOptions = {
      apiKey: ALPACA_API_KEY,
      apiSecret: ALPACA_API_SECRET,
    };

    if (url.pathname === "/api/market/snapshots") {
      return jsonResponse(
        await alpacaMarketProvider.snapshots(symbols, providerOptions),
      );
    }

    if (url.pathname === "/api/market/history") {
      const range = RangeSchema.parse(url.searchParams.get("range"));
      const histories = await alpacaMarketProvider.history(
        symbols,
        range,
        providerOptions,
      );
      return jsonResponse({ histories, fetchedAt: new Date().toISOString() });
    }

    if (url.pathname === "/api/market/history-bundle") {
      const histories = await alpacaMarketProvider.historyBundle(
        symbols,
        providerOptions,
      );
      return jsonResponse({ histories, fetchedAt: new Date().toISOString() });
    }

    if (url.pathname === "/api/market/news") {
      const articles = await alpacaMarketProvider.news(
        symbols,
        providerOptions,
      );
      return jsonResponse({ articles, fetchedAt: new Date().toISOString() });
    }

    return jsonResponse(
      { error: "Market endpoint not found." },
      { status: 404 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        { error: "Invalid market-data request." },
        { status: 400 },
      );
    }

    console.error("Market data request failed:", error);
    return jsonResponse(
      { error: "Market data is temporarily unavailable." },
      { status: 502 },
    );
  }
}

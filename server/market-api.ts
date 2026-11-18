import { z } from "zod";
import { chartRanges } from "../src/features/market-data/types/market-data.ts";
import { instrumentSymbolSchema } from "../src/features/market-data/types/instrument-detail.ts";
import { hasAuthSessionCookie } from "../src/features/auth/session-cookie.ts";
import { createAuthRequest } from "./auth/session.ts";
import { getServerEnv } from "./env.ts";
import { alpacaMarketProvider } from "./market-provider/alpaca/market-data.ts";

const maximumSymbols = 20;
const RangeSchema = z.enum(chartRanges);

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

function parseSymbols(url: URL): readonly string[] {
  const values = url.searchParams.get("symbols")?.split(",") ?? [];
  const parsed = z
    .array(instrumentSymbolSchema)
    .min(1)
    .max(maximumSymbols)
    .parse(values);
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
    if (
      url.pathname === "/api/market/instrument" ||
      url.pathname === "/api/market/instrument-session"
    ) {
      return await handleInstrumentRequest(request, url);
    }
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

async function handleInstrumentRequest(request: Request, url: URL) {
  if (!hasAuthSessionCookie(request)) {
    return jsonResponse(
      { error: "Log in to view instrument details." },
      { status: 401 },
    );
  }
  const auth = createAuthRequest(request);
  if (!(await auth.getUser())) {
    return auth.applyHeaders(
      jsonResponse(
        { error: "Log in to view instrument details." },
        { status: 401 },
      ),
    );
  }

  const symbol = instrumentSymbolSchema.parse(url.searchParams.get("symbol"));
  const { ALPACA_API_KEY: apiKey, ALPACA_API_SECRET: apiSecret } =
    getServerEnv();

  if (url.pathname === "/api/market/instrument-session") {
    return auth.applyHeaders(
      jsonResponse(
        await alpacaMarketProvider.instrumentSession(symbol, {
          apiKey,
          apiSecret,
        }),
      ),
    );
  }

  const [catalog, quote] = await Promise.all([
    auth.client
      .from("instruments")
      .select("name, exchange, currency")
      .eq("provider", "alpaca")
      .eq("normalized_symbol", symbol)
      .eq("is_active", true)
      .maybeSingle(),
    alpacaMarketProvider.instrumentQuote(symbol, { apiKey, apiSecret }),
  ]);
  if (catalog.error)
    throw new Error("Unable to read the instrument catalog.", {
      cause: catalog.error,
    });
  if (!catalog.data && quote.price === null) {
    return auth.applyHeaders(
      jsonResponse({ error: "Instrument not found." }, { status: 404 }),
    );
  }
  return auth.applyHeaders(
    jsonResponse({
      name: catalog.data?.name ?? symbol,
      exchange: catalog.data?.exchange ?? null,
      currency: catalog.data?.currency ?? "USD",
      ...quote,
    }),
  );
}

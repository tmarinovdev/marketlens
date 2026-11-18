import { z } from "zod";
import type {
  ChartRange,
  MarketHistory,
  MarketSnapshot,
  MarketSnapshotsResponse,
  PricePoint,
} from "@/features/market-data/types/market-data";
import type { MarketProvider, MarketProviderRequestOptions } from "../types.ts";
import { fetchAlpacaNews } from "./news.ts";
import type {
  InstrumentQuote,
  InstrumentSession,
} from "@/features/market-data/types/instrument-detail";

const ALPACA_DATA_URL = "https://data.alpaca.markets/v2/stocks";
const ALPACA_CLOCK_URL = "https://paper-api.alpaca.markets/v2/clock";
const historyPageLimit = 10_000;
const maximumHistoryPages = 10;

const AlpacaBarSchema = z.object({
  t: z.iso.datetime({ offset: true }),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
  n: z.number().optional(),
  vw: z.number().optional(),
});

const AlpacaTradeSchema = z.object({
  t: z.iso.datetime({ offset: true }),
  p: z.number(),
});

const AlpacaSnapshotSchema = z.object({
  latestTrade: AlpacaTradeSchema.nullish(),
  latestQuote: z
    .object({
      t: z.iso.datetime({ offset: true }),
      bp: z.number(),
      ap: z.number(),
    })
    .nullish(),
  minuteBar: AlpacaBarSchema.nullish(),
  dailyBar: AlpacaBarSchema.nullish(),
  prevDailyBar: AlpacaBarSchema.nullish(),
});

const AlpacaSnapshotsSchema = z.record(z.string(), AlpacaSnapshotSchema);

const AlpacaClockSchema = z.object({
  is_open: z.boolean(),
  next_open: z.iso.datetime({ offset: true }),
});

const AlpacaBarsResponseSchema = z.object({
  bars: z.record(z.string(), z.array(AlpacaBarSchema)),
  next_page_token: z.string().nullable(),
});

type AlpacaBar = z.infer<typeof AlpacaBarSchema>;

interface HistoryParameters {
  readonly timeframe: string;
  readonly start: Date;
}

function alpacaHeaders(
  apiKey: string,
  apiSecret: string,
): Record<string, string> {
  return {
    Accept: "application/json",
    "APCA-API-KEY-ID": apiKey,
    "APCA-API-SECRET-KEY": apiSecret,
  };
}

async function parseAlpacaResponse(
  response: Response,
  requestName: string,
): Promise<unknown> {
  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 500);
    throw new Error(
      `Alpaca ${requestName} request failed with ${response.status}: ${responseBody}`,
    );
  }

  return response.json();
}

function subtractUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

function historyParameters(range: ChartRange, now: Date): HistoryParameters {
  switch (range) {
    case "1D":
      return { timeframe: "15Min", start: subtractUtcDays(now, 8) };
    case "1W":
      return { timeframe: "1Hour", start: subtractUtcDays(now, 8) };
    case "1M":
      return { timeframe: "1Day", start: subtractUtcDays(now, 32) };
    case "3M":
      return { timeframe: "1Day", start: subtractUtcDays(now, 95) };
    case "1Y":
      return { timeframe: "1Day", start: subtractUtcDays(now, 370) };
    case "YTD":
      return {
        timeframe: "1Day",
        start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      };
  }
}

const newYorkDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getNewYorkDateAndMinute(timestamp: string) {
  const parts = newYorkDateTime.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const date = `${values.year}-${values.month}-${values.day}`;
  const minute = Number(values.hour) * 60 + Number(values.minute);
  return { date, minute };
}

function normalizeHistory(
  symbol: string,
  range: ChartRange,
  bars: readonly AlpacaBar[],
): MarketHistory {
  let sessionDate: string | null = null;
  let selectedBars = bars;

  if (range === "1D") {
    const regularSessionBars = bars.filter((bar) => {
      const { minute } = getNewYorkDateAndMinute(bar.t);
      return minute >= 9 * 60 + 30 && minute < 16 * 60;
    });
    sessionDate = regularSessionBars.reduce<string | null>((latest, bar) => {
      const { date } = getNewYorkDateAndMinute(bar.t);
      return latest === null || date > latest ? date : latest;
    }, null);
    selectedBars = sessionDate
      ? regularSessionBars.filter(
          (bar) => getNewYorkDateAndMinute(bar.t).date === sessionDate,
        )
      : [];
  }

  const points: PricePoint[] = selectedBars.map((bar) => ({
    timestamp: bar.t,
    price: bar.c,
  }));

  return { symbol, range, sessionDate, points };
}

function normalizeSnapshot(
  symbol: string,
  snapshot: z.infer<typeof AlpacaSnapshotSchema> | undefined,
): MarketSnapshot {
  if (!snapshot) {
    return { symbol, price: null, changePercent: null, asOf: null };
  }

  const latestValue =
    snapshot.latestTrade?.p ??
    snapshot.minuteBar?.c ??
    snapshot.dailyBar?.c ??
    null;
  const previousClose = snapshot.prevDailyBar?.c ?? null;
  const changePercent =
    latestValue !== null && previousClose !== null && previousClose !== 0
      ? ((latestValue - previousClose) / previousClose) * 100
      : null;

  return {
    symbol,
    price: latestValue,
    changePercent,
    asOf:
      snapshot.latestTrade?.t ??
      snapshot.minuteBar?.t ??
      snapshot.dailyBar?.t ??
      null,
  };
}

async function fetchSnapshotInputs(
  symbols: readonly string[],
  {
    apiKey,
    apiSecret,
    fetchImplementation = fetch,
  }: MarketProviderRequestOptions,
) {
  const snapshotUrl = new URL(`${ALPACA_DATA_URL}/snapshots`);
  snapshotUrl.searchParams.set("symbols", symbols.join(","));
  snapshotUrl.searchParams.set("feed", "iex");
  const headers = alpacaHeaders(apiKey, apiSecret);

  const [snapshotsResponse, clockResponse] = await Promise.all([
    fetchImplementation(snapshotUrl, {
      headers,
      signal: AbortSignal.timeout(15_000),
    }),
    fetchImplementation(ALPACA_CLOCK_URL, {
      headers,
      signal: AbortSignal.timeout(15_000),
    }),
  ]);
  const [snapshotsPayload, clockPayload] = await Promise.all([
    parseAlpacaResponse(snapshotsResponse, "snapshots"),
    parseAlpacaResponse(clockResponse, "clock"),
  ]);
  const snapshots = AlpacaSnapshotsSchema.parse(snapshotsPayload);
  const clock = AlpacaClockSchema.parse(clockPayload);
  return { snapshots, clock };
}

export async function fetchAlpacaSnapshots(
  symbols: readonly string[],
  options: MarketProviderRequestOptions,
): Promise<MarketSnapshotsResponse> {
  const { snapshots, clock } = await fetchSnapshotInputs(symbols, options);

  return {
    snapshots: symbols.map((symbol) =>
      normalizeSnapshot(symbol, snapshots[symbol]),
    ),
    marketOpen: clock.is_open,
    nextOpen: clock.next_open,
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeCandle(bar: AlpacaBar) {
  return {
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  };
}

async function fetchInstrumentQuote(
  symbol: string,
  options: MarketProviderRequestOptions,
): Promise<InstrumentQuote> {
  const { snapshots, clock } = await fetchSnapshotInputs([symbol], options);
  const snapshot = snapshots[symbol];
  const { price, changePercent, asOf } = normalizeSnapshot(symbol, snapshot);
  const bar = snapshot?.dailyBar;
  return {
    price,
    changePercent,
    asOf,
    previousClose: snapshot?.prevDailyBar?.c ?? null,
    bid: snapshot?.latestQuote?.bp || null,
    ask: snapshot?.latestQuote?.ap || null,
    quoteAsOf: snapshot?.latestQuote?.t ?? null,
    dailyBar: bar
      ? { ...normalizeCandle(bar), vwap: bar.vw ?? null, trades: bar.n ?? null }
      : null,
    marketOpen: clock.is_open,
    nextOpen: clock.next_open,
  };
}

const calendarSchema = z.array(
  z.object({
    date: z.iso.date(),
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

const toMinute = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export async function fetchInstrumentSession(
  symbol: string,
  options: MarketProviderRequestOptions,
  now = new Date(),
): Promise<InstrumentSession> {
  const { apiKey, apiSecret, fetchImplementation = fetch } = options;
  const today = getNewYorkDateAndMinute(now.toISOString());
  const start = subtractUtcDays(now, 8);
  const url = new URL("https://paper-api.alpaca.markets/v2/calendar");
  url.searchParams.set(
    "start",
    getNewYorkDateAndMinute(start.toISOString()).date,
  );
  url.searchParams.set("end", today.date);

  const [calendar, bars] = await Promise.all([
    fetchImplementation(url, {
      headers: alpacaHeaders(apiKey, apiSecret),
      signal: AbortSignal.timeout(15_000),
    }).then(async (response) =>
      calendarSchema.parse(await parseAlpacaResponse(response, "calendar")),
    ),
    fetchHistoryBars([symbol], { timeframe: "15Min", start }, options, now),
  ]);
  const session = calendar
    .filter(
      ({ date, open }) =>
        date < today.date ||
        (date === today.date && toMinute(open) <= today.minute),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const candles = session
    ? (bars.get(symbol) ?? [])
        .filter(({ t }) => {
          const { date, minute } = getNewYorkDateAndMinute(t);
          return (
            date === session.date &&
            minute >= toMinute(session.open) &&
            minute < toMinute(session.close)
          );
        })
        .map(normalizeCandle)
    : [];
  return { sessionDate: session?.date ?? null, candles };
}

async function fetchHistoryBars(
  symbols: readonly string[],
  parameters: HistoryParameters,
  {
    apiKey,
    apiSecret,
    fetchImplementation = fetch,
  }: MarketProviderRequestOptions,
  now: Date,
) {
  const collectedBars = new Map<string, AlpacaBar[]>(
    symbols.map((symbol) => [symbol, []]),
  );
  let pageToken: string | null = null;

  for (let page = 0; page < maximumHistoryPages; page += 1) {
    const url = new URL(`${ALPACA_DATA_URL}/bars`);
    url.searchParams.set("symbols", symbols.join(","));
    url.searchParams.set("timeframe", parameters.timeframe);
    url.searchParams.set("start", parameters.start.toISOString());
    url.searchParams.set("end", now.toISOString());
    url.searchParams.set("feed", "iex");
    url.searchParams.set("adjustment", "split");
    url.searchParams.set("sort", "asc");
    url.searchParams.set("limit", String(historyPageLimit));
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetchImplementation(url, {
      headers: alpacaHeaders(apiKey, apiSecret),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = AlpacaBarsResponseSchema.parse(
      await parseAlpacaResponse(response, "historical bars"),
    );

    for (const symbol of symbols) {
      collectedBars.get(symbol)?.push(...(payload.bars[symbol] ?? []));
    }

    pageToken = payload.next_page_token;
    if (!pageToken) break;

    if (page === maximumHistoryPages - 1) {
      throw new Error("Alpaca historical bars exceeded the pagination limit.");
    }
  }

  return collectedBars;
}

export async function fetchAlpacaHistory(
  symbols: readonly string[],
  range: ChartRange,
  options: MarketProviderRequestOptions,
  now = new Date(),
): Promise<readonly MarketHistory[]> {
  const collectedBars = await fetchHistoryBars(
    symbols,
    historyParameters(range, now),
    options,
    now,
  );
  return symbols.map((symbol) =>
    normalizeHistory(symbol, range, collectedBars.get(symbol) ?? []),
  );
}

export async function fetchAlpacaHistoryBundle(
  symbols: readonly string[],
  options: MarketProviderRequestOptions,
  now = new Date(),
): Promise<readonly MarketHistory[]> {
  const [weeklyHistories, yearlyHistories] = await Promise.all([
    fetchAlpacaHistory(symbols, "1W", options, now),
    fetchAlpacaHistory(symbols, "1Y", options, now),
  ]);
  const weeklyBySymbol = new Map(
    weeklyHistories.map((history) => [history.symbol, history]),
  );
  const yearlyBySymbol = new Map(
    yearlyHistories.map((history) => [history.symbol, history]),
  );
  return symbols.flatMap((symbol) => {
    const yearly = yearlyBySymbol.get(symbol) ?? {
      symbol,
      range: "1Y" as const,
      sessionDate: null,
      points: [],
    };
    const historyFrom = (
      range: "1M" | "3M" | "YTD",
      start: Date,
    ): MarketHistory => ({
      symbol,
      range,
      sessionDate: null,
      points: yearly.points.filter(
        (point) => new Date(point.timestamp) >= start,
      ),
    });

    return [
      weeklyBySymbol.get(symbol) ?? {
        symbol,
        range: "1W" as const,
        sessionDate: null,
        points: [],
      },
      historyFrom("1M", subtractUtcDays(now, 32)),
      historyFrom("3M", subtractUtcDays(now, 95)),
      yearly,
      historyFrom("YTD", new Date(Date.UTC(now.getUTCFullYear(), 0, 1))),
    ];
  });
}

export const alpacaMarketProvider: MarketProvider = {
  instrumentQuote: fetchInstrumentQuote,
  instrumentSession: fetchInstrumentSession,
  snapshots: fetchAlpacaSnapshots,
  history: fetchAlpacaHistory,
  historyBundle: fetchAlpacaHistoryBundle,
  news: fetchAlpacaNews,
};

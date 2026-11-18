import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, CandlestickChart, ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketRequestError } from "@/features/market-data/api/market-data";
import {
  instrumentDetailOptions,
  instrumentSessionOptions,
} from "@/features/market-data/queries/instrument-detail";
import { marketHistoryBundleQueryOptions } from "@/features/market-data/queries/market-data";
import {
  chartRanges,
  type ChartRange,
} from "@/features/market-data/types/market-data";
import type { instrumentDetailSchema } from "@/features/market-data/types/instrument-detail";
import type { z } from "zod";
import type { DetailChartData } from "./detail-price-chart";

const PriceChart = lazy(() => import("./detail-price-chart"));
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 2,
});
const marketTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

type Quote = z.infer<typeof instrumentDetailSchema>;

function money(value: number | null | undefined, currency: string) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function time(value: string) {
  return marketTime.format(new Date(value));
}

function DetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-10 sm:px-5">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-sm py-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Dashboard
      </Link>
      {children}
    </main>
  );
}

function ChartSkeleton() {
  return (
    <div
      aria-label="Loading price chart"
      role="status"
      className="h-80 animate-pulse rounded-2xl bg-muted/60 motion-reduce:animate-none sm:h-104"
    />
  );
}

export function InstrumentDetailSkeleton({ symbol }: { symbol: string }) {
  return (
    <DetailLayout>
      <section
        aria-busy="true"
        className="rounded-3xl border border-border bg-card p-6"
      >
        <h1 className="text-3xl font-semibold">{symbol}</h1>
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </section>
      <ChartSkeleton />
    </DetailLayout>
  );
}

function QuoteSummary({ symbol, quote }: { symbol: string; quote: Quote }) {
  const bar = quote.dailyBar;
  const change = quote.changePercent;
  const price = (value: number | null | undefined) =>
    money(value, quote.currency);
  const count = (value: number | null | undefined) =>
    value == null ? "—" : compactNumber.format(value);
  const metrics = [
    ["Open", price(bar?.open)],
    ["Previous close", price(quote.previousClose)],
    ["Day high", price(bar?.high)],
    ["Day low", price(bar?.low)],
    ["Daily bar close", price(bar?.close)],
    ["Volume", count(bar?.volume)],
    ["VWAP", price(bar?.vwap)],
    ["Bid", price(quote.bid)],
    ["Ask", price(quote.ask)],
    ["Trades", count(bar?.trades)],
  ] as const;

  return (
    <section
      aria-labelledby="instrument-title"
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 bg-linear-to-br from-primary-soft/65 to-transparent p-5 sm:p-7">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary">
            {[quote.exchange, quote.currency, "IEX"]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <h1
            id="instrument-title"
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {symbol}
          </h1>
          {quote.name !== symbol && (
            <p className="mt-1 text-sm text-muted-foreground">{quote.name}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="w-fit rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            {quote.marketOpen ? "Market open" : "Market closed"}
          </span>
          <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {price(quote.price)}
          </p>
          {change !== null && (
            <p
              className={`text-sm font-medium tabular-nums ${change === 0 ? "text-muted-foreground" : change > 0 ? "text-positive" : "text-negative"}`}
            >
              {percent.format(change / 100)}{" "}
              <span className="font-normal text-muted-foreground">
                vs. previous close
              </span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {quote.asOf
              ? `Price as of ${time(quote.asOf)}`
              : "No recent price available"}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border px-5 py-5 sm:grid-cols-3 sm:px-7 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-5 text-xs text-muted-foreground sm:px-7">
        {bar && `Daily statistics for ${bar.timestamp.slice(0, 10)}. `}
        {quote.quoteAsOf && `Bid and ask as of ${time(quote.quoteAsOf)}.`}
      </p>
    </section>
  );
}

const switchStyle =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm";

export function InstrumentDetail({
  symbol,
  userId,
}: {
  symbol: string;
  userId: string;
}) {
  const [mode, setMode] = useState<"candles" | "line">("candles");
  const [range, setRange] = useState<ChartRange>("1D");
  const [loadHistory, setLoadHistory] = useState(false);
  const quote = useQuery(instrumentDetailOptions(userId, symbol));
  const marketOpen = quote.data?.marketOpen ?? false;
  const session = useQuery({
    ...instrumentSessionOptions(userId, symbol, marketOpen),
    enabled:
      Boolean(quote.data) &&
      !(
        quote.error instanceof MarketRequestError && quote.error.status === 401
      ),
  });
  const history = useQuery({
    ...marketHistoryBundleQueryOptions([symbol], marketOpen),
    enabled: loadHistory && Boolean(quote.data),
  });

  if (
    [quote.error, session.error].some(
      (error) => error instanceof MarketRequestError && error.status === 401,
    )
  ) {
    return <Navigate to="/login" search={{ instrument: symbol }} replace />;
  }
  if (!quote.data && quote.isPending)
    return <InstrumentDetailSkeleton symbol={symbol} />;
  if (!quote.data) {
    const missing =
      quote.error instanceof MarketRequestError && quote.error.status === 404;
    return (
      <DetailLayout>
        <h1 className="text-3xl font-semibold">{symbol}</h1>
        <p role="alert">
          {missing
            ? "Instrument not found."
            : "Market data is temporarily unavailable."}
        </p>
        {!missing && (
          <Button onClick={() => void quote.refetch()}>Retry quote</Button>
        )}
      </DetailLayout>
    );
  }

  const isSession = mode === "candles" || range === "1D";
  const activeQuery = isSession ? session : history;
  const candles = session.data?.candles ?? [];
  const points = isSession
    ? candles.map(({ timestamp, close }) => ({ timestamp, price: close }))
    : (history.data?.histories.find((item) => item.range === range)?.points ??
      []);
  const data: DetailChartData =
    mode === "candles" ? { mode, candles } : { mode, points };
  const lastCandle = candles.at(-1);
  const hasData = mode === "candles" ? candles.length > 0 : points.length > 0;
  const label = `${symbol} ${mode === "candles" ? "15-minute candlestick" : `${range} line`} chart`;

  return (
    <DetailLayout>
      <QuoteSummary symbol={symbol} quote={quote.data} />
      {quote.isError && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
        >
          Showing the last available quote. The refresh failed.
          <Button
            variant="outline"
            size="sm"
            onClick={() => void quote.refetch()}
          >
            Retry quote
          </Button>
        </div>
      )}
      <section
        aria-labelledby="price-chart-title"
        className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="price-chart-title"
              className="text-xl font-semibold tracking-tight"
            >
              Price history
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSession
                ? `15-minute bars · Eastern time${session.data?.sessionDate ? ` · ${session.data.sessionDate}` : ""}`
                : `${range} · Closing prices`}
            </p>
          </div>
          <div
            role="group"
            aria-label="Chart type"
            className="flex w-fit gap-1 rounded-xl bg-muted p-1"
          >
            <button
              type="button"
              className={switchStyle}
              aria-pressed={mode === "candles"}
              onClick={() => setMode("candles")}
            >
              <CandlestickChart className="size-4" aria-hidden="true" /> Candles
            </button>
            <button
              type="button"
              className={switchStyle}
              aria-pressed={mode === "line"}
              onClick={() => {
                setMode("line");
                setLoadHistory(true);
              }}
            >
              <ChartNoAxesCombined className="size-4" aria-hidden="true" /> Line
            </button>
          </div>
        </div>
        {mode === "line" && (
          <div
            role="group"
            aria-label="Chart range"
            className="mb-4 flex flex-wrap gap-1"
          >
            {chartRanges.map((value) => (
              <button
                type="button"
                key={value}
                className={switchStyle}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        {activeQuery.isPending ? (
          <ChartSkeleton />
        ) : hasData ? (
          <Suspense fallback={<ChartSkeleton />}>
            <PriceChart
              key={mode === "candles" ? session.data?.sessionDate : range}
              data={data}
              label={label}
              intraday={isSession || range === "1W"}
            />
          </Suspense>
        ) : (
          <div className="grid h-80 place-content-center gap-3 text-center text-sm text-muted-foreground">
            {activeQuery.isError
              ? "Price history is temporarily unavailable."
              : "No prices are available for this period."}
          </div>
        )}
        {activeQuery.isError && (
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            {hasData && "Showing the last available chart. "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void activeQuery.refetch()}
            >
              Retry chart
            </Button>
          </p>
        )}
        {mode === "candles" && lastCandle && (
          <p className="mt-3 text-xs text-muted-foreground">
            Latest candle at {time(lastCandle.timestamp)} · Open{" "}
            {money(lastCandle.open, quote.data.currency)} · High{" "}
            {money(lastCandle.high, quote.data.currency)} · Low{" "}
            {money(lastCandle.low, quote.data.currency)} · Close{" "}
            {money(lastCandle.close, quote.data.currency)}
          </p>
        )}
      </section>
    </DetailLayout>
  );
}

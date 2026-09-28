import { useId } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { InstrumentSearchResult } from "@/features/instruments/api/search-instruments";
import type {
  ChartRange,
  MarketHistory,
  MarketSnapshot,
} from "@/features/market-data/types/market-data";
import { chartRanges } from "@/features/market-data/types/market-data";

const chartConfig = {
  price: { label: "Price" },
} satisfies ChartConfig;

const percentageFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const freshnessFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface InstrumentChartCardProps {
  readonly instrument: InstrumentSearchResult;
  readonly snapshot: MarketSnapshot | undefined;
  readonly history: MarketHistory | undefined;
  readonly range: ChartRange;
  readonly snapshotPending: boolean;
  readonly snapshotError: boolean;
  readonly historyPending: boolean;
  readonly historyError: boolean;
  readonly onHistoryRetry?: () => void;
  readonly onRangeChange: (range: ChartRange) => void;
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function formatChartTime(timestamp: string, range: ChartRange): string {
  const options: Intl.DateTimeFormatOptions =
    range === "1D"
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(timestamp),
  );
}

export function InstrumentChartCard({
  instrument,
  snapshot,
  history,
  range,
  snapshotPending,
  snapshotError,
  historyPending,
  historyError,
  onHistoryRetry,
  onRangeChange,
}: InstrumentChartCardProps) {
  const gradientId = `price-gradient-${useId().replaceAll(":", "")}`;
  const points = history?.points ?? [];
  const firstPoint = points[0];
  const lastPoint = points.at(-1);
  const chartIsPositive =
    firstPoint && lastPoint
      ? lastPoint.price >= firstPoint.price
      : (snapshot?.changePercent ?? 0) >= 0;
  const chartColor = chartIsPositive
    ? "var(--positive-chart)"
    : "var(--negative-chart)";
  const changeIsPositive = (snapshot?.changePercent ?? 0) >= 0;

  return (
    <article className="flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <header className="flex min-w-0 items-baseline gap-2">
        <h3 className="shrink-0 text-lg font-semibold tracking-tight">
          {instrument.symbol}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {instrument.name}
        </p>
      </header>

      <div className="mt-2 flex min-h-12 items-start gap-3">
        {snapshotPending ? (
          <>
            <span className="h-8 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <span className="mt-1 h-7 w-16 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </>
        ) : snapshotError || snapshot?.price === null || !snapshot ? (
          <p className="text-sm text-muted-foreground">Price unavailable</p>
        ) : (
          <>
            <div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatPrice(snapshot.price, instrument.currency)}
              </p>
              {snapshot.asOf ? (
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  As of {freshnessFormatter.format(new Date(snapshot.asOf))}
                </p>
              ) : null}
            </div>
            {snapshot.changePercent !== null ? (
              <span
                className={
                  changeIsPositive
                    ? "mt-0.5 rounded-full bg-positive-surface px-2.5 py-1 text-xs font-semibold text-positive"
                    : "mt-0.5 rounded-full bg-negative-surface px-2.5 py-1 text-xs font-semibold text-negative"
                }
              >
                {percentageFormatter.format(snapshot.changePercent)}%
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-2 flex min-h-28 flex-1 items-center">
        {historyPending ? (
          <div className="h-24 w-full animate-pulse rounded-xl bg-gradient-to-b from-muted/80 to-transparent motion-reduce:animate-none" />
        ) : historyError ? (
          <div className="mx-auto text-center text-xs text-muted-foreground">
            <p>Chart temporarily unavailable</p>
            {onHistoryRetry ? (
              <button
                type="button"
                className="mt-1.5 rounded-lg px-2 py-1 font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={onHistoryRetry}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : points.length < 2 ? (
          <p className="mx-auto text-xs text-muted-foreground">
            No chart data available
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-28 w-full aspect-auto"
            role="img"
            aria-label={`${instrument.symbol} ${range} price chart`}
            initialDimension={{ width: 280, height: 112 }}
            responsiveContainerProps={{ height: 112 }}
          >
            <AreaChart
              accessibilityLayer
              data={[...points]}
              margin={{ top: 6, right: 1, bottom: 0, left: 1 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis
                dataKey="price"
                hide
                domain={["dataMin", "dataMax"]}
                padding={{ top: 10, bottom: 10 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) =>
                      formatChartTime(String(value), range)
                    }
                    formatter={(value) => (
                      <span className="font-mono font-medium tabular-nums">
                        {formatPrice(Number(value), instrument.currency)}
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      <div
        role="group"
        aria-label={`${instrument.symbol} chart range`}
        className="mt-2 grid grid-cols-6 border-t border-border/70 pt-2"
      >
        {chartRanges.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={range === option}
            className="mx-auto min-w-8 rounded-lg px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-primary-soft aria-pressed:text-primary"
            onClick={() => onRangeChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </article>
  );
}

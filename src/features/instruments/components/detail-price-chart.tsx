import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type CandlestickData,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { InstrumentSession } from "@/features/market-data/types/instrument-detail";
import type { PricePoint } from "@/features/market-data/types/market-data";

export type DetailChartData =
  | { mode: "candles"; candles: InstrumentSession["candles"] }
  | { mode: "line"; points: readonly PricePoint[] };

const intradayTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
const tradingDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function unixTime(timestamp: string): UTCTimestamp {
  return Math.floor(Date.parse(timestamp) / 1000) as UTCTimestamp;
}

function orderedPoints<T extends { time: UTCTimestamp }>(points: T[]): T[] {
  return [...new Map(points.map((point) => [point.time, point])).values()].sort(
    (a, b) => a.time - b.time,
  );
}

export default function DetailPriceChart({
  data,
  intraday,
  label,
}: {
  data: DetailChartData;
  intraday: boolean;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const update = useRef<((data: DetailChartData) => void) | null>(null);
  const mode = data.mode;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const formatter = intraday ? intradayTime : tradingDate;
    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        attributionLogo: true,
      },
      timeScale: {
        timeVisible: intraday,
        tickMarkFormatter: (time: Time) =>
          typeof time === "number" ? formatter.format(time * 1000) : null,
      },
      localization: {
        timeFormatter: (time: Time) =>
          typeof time === "number"
            ? formatter.format(time * 1000)
            : String(time),
      },
    });
    const candles =
      mode === "candles"
        ? chart.addSeries(CandlestickSeries, { borderVisible: false })
        : null;
    const line =
      mode === "line" ? chart.addSeries(LineSeries, { lineWidth: 2 }) : null;

    function applyTheme() {
      if (!element) return;
      const style = getComputedStyle(element);
      const text = style.getPropertyValue("--muted-foreground").trim();
      const border = style.getPropertyValue("--border").trim();
      const positive = style.getPropertyValue("--positive-chart").trim();
      const negative = style.getPropertyValue("--negative-chart").trim();
      chart.applyOptions({
        layout: { textColor: text },
        grid: { vertLines: { visible: false }, horzLines: { color: border } },
        rightPriceScale: { borderColor: border },
        timeScale: { borderColor: border },
      });
      candles?.applyOptions({
        upColor: positive,
        downColor: negative,
        wickUpColor: positive,
        wickDownColor: negative,
      });
      line?.applyOptions({ color: style.getPropertyValue("--primary").trim() });
    }

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    let hasFit = false;
    update.current = (next) => {
      if (next.mode === "candles" && candles) {
        const values: CandlestickData<UTCTimestamp>[] = next.candles.map(
          ({ timestamp, open, high, low, close }) => ({
            time: unixTime(timestamp),
            open,
            high,
            low,
            close,
          }),
        );
        candles.setData(orderedPoints(values));
      } else if (next.mode === "line" && line) {
        const values: LineData<UTCTimestamp>[] = next.points.map(
          ({ timestamp, price }) => ({
            time: unixTime(timestamp),
            value: price,
          }),
        );
        line.setData(orderedPoints(values));
      }
      if (!hasFit) {
        chart.timeScale().fitContent();
        hasFit = true;
      }
    };
    return () => {
      update.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [mode, intraday]);

  useEffect(() => {
    update.current?.(data);
  }, [data, intraday]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className="h-80 min-w-0 sm:h-104"
    />
  );
}

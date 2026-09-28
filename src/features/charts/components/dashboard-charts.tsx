import {
  QueryErrorResetBoundary,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { CatchBoundary } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import type { InstrumentSearchResult } from "@/features/instruments/api/search-instruments";
import type {
  ChartRange,
  MarketHistory,
  MarketSnapshot,
} from "@/features/market-data/types/market-data";
import {
  marketHistoryBundleQueryOptions,
  marketIntradayHistoryQueryOptions,
  marketSnapshotsQueryOptions,
} from "@/features/market-data/queries/market-data";
import {
  getWatchlistInstrumentId,
  useWatchlistStore,
} from "@/features/watchlist/store/watchlist-store";
import { InstrumentChartCard } from "./instrument-chart-card";

interface ChartGridProps {
  readonly instruments: readonly InstrumentSearchResult[];
  readonly snapshots: readonly MarketSnapshot[];
  readonly histories?: readonly MarketHistory[];
  readonly selectedRanges: Readonly<Record<string, ChartRange>>;
  readonly snapshotPending?: boolean;
  readonly snapshotError?: boolean;
  readonly historyPending?: boolean;
  readonly historyError?: boolean;
  readonly onRangeChange: (instrumentId: string, range: ChartRange) => void;
  readonly onRetry?: () => void;
}

export function DashboardCharts() {
  const instruments = useWatchlistStore((state) => state.instruments);
  const hasHydrated = useWatchlistStore((state) => state.hasHydrated);

  if (!hasHydrated || instruments.length === 0) return null;

  const resetKey = instruments
    .map((instrument) => getWatchlistInstrumentId(instrument))
    .join(",");

  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <CatchBoundary
          getResetKey={() => resetKey}
          errorComponent={({ reset }) => (
            <DashboardChartGrid
              instruments={instruments}
              snapshots={[]}
              selectedRanges={{}}
              snapshotError
              historyError
              onRangeChange={() => undefined}
              onRetry={() => {
                resetQueries();
                reset();
              }}
            />
          )}
        >
          <Suspense
            fallback={
              <DashboardChartGrid
                instruments={instruments}
                snapshots={[]}
                selectedRanges={{}}
                snapshotPending
                historyPending
                onRangeChange={() => undefined}
              />
            }
          >
            <DashboardSnapshotCharts instruments={instruments} />
          </Suspense>
        </CatchBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function DashboardSnapshotCharts({
  instruments,
}: {
  readonly instruments: readonly InstrumentSearchResult[];
}) {
  const [selectedRanges, setSelectedRanges] = useState<
    Readonly<Record<string, ChartRange>>
  >({});
  const symbols = instruments.map((instrument) => instrument.symbol);
  const { data: snapshotsData } = useSuspenseQuery(
    marketSnapshotsQueryOptions(symbols),
  );
  const handleRangeChange = (instrumentId: string, range: ChartRange) => {
    setSelectedRanges((current) => ({
      ...current,
      [instrumentId]: range,
    }));
  };

  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <CatchBoundary
          getResetKey={() => symbols.join(",")}
          errorComponent={({ reset }) => (
            <DashboardChartGrid
              instruments={instruments}
              snapshots={snapshotsData.snapshots}
              selectedRanges={selectedRanges}
              historyError
              onRangeChange={handleRangeChange}
              onRetry={() => {
                resetQueries();
                reset();
              }}
            />
          )}
        >
          <Suspense
            fallback={
              <DashboardChartGrid
                instruments={instruments}
                snapshots={snapshotsData.snapshots}
                selectedRanges={selectedRanges}
                historyPending
                onRangeChange={handleRangeChange}
              />
            }
          >
            <DashboardHistoryGrid
              instruments={instruments}
              snapshots={snapshotsData.snapshots}
              selectedRanges={selectedRanges}
              marketOpen={snapshotsData.marketOpen}
              onRangeChange={handleRangeChange}
            />
          </Suspense>
        </CatchBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function DashboardHistoryGrid({
  instruments,
  snapshots,
  selectedRanges,
  marketOpen,
  onRangeChange,
}: {
  readonly instruments: readonly InstrumentSearchResult[];
  readonly snapshots: readonly MarketSnapshot[];
  readonly selectedRanges: Readonly<Record<string, ChartRange>>;
  readonly marketOpen: boolean;
  readonly onRangeChange: (instrumentId: string, range: ChartRange) => void;
}) {
  const symbols = instruments.map((instrument) => instrument.symbol);
  const { data: intradayData } = useSuspenseQuery(
    marketIntradayHistoryQueryOptions(symbols, marketOpen),
  );
  const historyBundleQuery = useQuery(
    marketHistoryBundleQueryOptions(symbols, marketOpen),
  );
  const snapshotsBySymbol = new Map(
    snapshots.map((snapshot) => [snapshot.symbol, snapshot]),
  );
  const historiesBySymbolAndRange = new Map(
    [
      ...intradayData.histories,
      ...(historyBundleQuery.data?.histories ?? []),
    ].map((history) => [`${history.symbol}:${history.range}`, history]),
  );

  return (
    <section aria-labelledby="market-charts-heading" className="mt-4">
      <h2 id="market-charts-heading" className="sr-only">
        Market charts
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instruments.map((instrument) => {
          const instrumentId = getWatchlistInstrumentId(instrument);
          const range = selectedRanges[instrumentId] ?? "1D";
          const usesHistoryBundle = range !== "1D";

          return (
            <InstrumentChartCard
              key={instrumentId}
              instrument={instrument}
              snapshot={snapshotsBySymbol.get(instrument.symbol)}
              history={historiesBySymbolAndRange.get(
                `${instrument.symbol}:${range}`,
              )}
              range={range}
              snapshotPending={false}
              snapshotError={false}
              historyPending={usesHistoryBundle && historyBundleQuery.isPending}
              historyError={usesHistoryBundle && historyBundleQuery.isError}
              onHistoryRetry={
                usesHistoryBundle && historyBundleQuery.isError
                  ? () => void historyBundleQuery.refetch()
                  : undefined
              }
              onRangeChange={(nextRange) =>
                onRangeChange(instrumentId, nextRange)
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function DashboardChartGrid({
  instruments,
  snapshots,
  histories = [],
  selectedRanges,
  snapshotPending = false,
  snapshotError = false,
  historyPending = false,
  historyError = false,
  onRangeChange,
  onRetry,
}: ChartGridProps) {
  const snapshotsBySymbol = new Map(
    snapshots.map((snapshot) => [snapshot.symbol, snapshot]),
  );
  const historiesBySymbolAndRange = new Map(
    histories.map((history) => [`${history.symbol}:${history.range}`, history]),
  );

  return (
    <section aria-labelledby="market-charts-heading" className="mt-4">
      <h2 id="market-charts-heading" className="sr-only">
        Market charts
      </h2>
      {onRetry ? (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
        >
          <span>Market data is temporarily unavailable.</span>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2.5 py-1 font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : null}
      <div
        aria-busy={snapshotPending || historyPending}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {instruments.map((instrument) => {
          const instrumentId = getWatchlistInstrumentId(instrument);
          const range = selectedRanges[instrumentId] ?? "1D";

          return (
            <InstrumentChartCard
              key={instrumentId}
              instrument={instrument}
              snapshot={snapshotsBySymbol.get(instrument.symbol)}
              history={historiesBySymbolAndRange.get(
                `${instrument.symbol}:${range}`,
              )}
              range={range}
              snapshotPending={snapshotPending}
              snapshotError={snapshotError}
              historyPending={historyPending}
              historyError={historyError}
              onRangeChange={(nextRange) =>
                onRangeChange(instrumentId, nextRange)
              }
            />
          );
        })}
      </div>
    </section>
  );
}

import { lazy, Suspense } from "react";
import { WatchlistSection } from "@/features/watchlist/components/watchlist-section";
import { useWatchlistStore } from "@/features/watchlist/store/watchlist-store";

const DashboardCharts = lazy(async () => ({
  default: (await import("@/features/charts/components/dashboard-charts"))
    .DashboardCharts,
}));

export function App() {
  const instrumentCount = useWatchlistStore(
    (state) => state.instruments.length,
  );
  const hasHydrated = useWatchlistStore((state) => state.hasHydrated);

  return (
    <main className="px-3 pb-12 pt-4 sm:px-5 sm:pt-5">
      <h1 className="sr-only">MarketLens</h1>
      <div className="mx-auto max-w-7xl">
        <WatchlistSection />
        {hasHydrated && instrumentCount > 0 ? (
          <Suspense
            fallback={<DashboardChartsFallback count={instrumentCount} />}
          >
            <DashboardCharts />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}

function DashboardChartsFallback({ count }: { readonly count: number }) {
  return (
    <div
      aria-label="Loading market charts"
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-h-72 animate-pulse flex-col rounded-2xl border border-border bg-card p-4 shadow-sm motion-reduce:animate-none"
        >
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="mt-4 flex gap-3">
            <div className="h-8 w-24 rounded-md bg-muted" />
            <div className="h-7 w-16 rounded-full bg-muted" />
          </div>
          <div className="mt-5 h-24 w-full rounded-xl bg-gradient-to-b from-muted/80 to-transparent" />
          <div className="mt-auto grid grid-cols-6 gap-2 border-t border-border/70 pt-3">
            {Array.from({ length: 6 }, (_, rangeIndex) => (
              <span
                key={rangeIndex}
                className="mx-auto h-4 w-5 rounded bg-muted"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

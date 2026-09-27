import { WatchlistSection } from "@/features/watchlist/components/watchlist-section";

export function App() {
  return (
    <main className="px-3 pb-12 pt-4 sm:px-5 sm:pt-5">
      <h1 className="sr-only">MarketLens</h1>
      <div className="mx-auto max-w-7xl">
        <WatchlistSection />
      </div>
    </main>
  );
}

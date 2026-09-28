import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { CatchBoundary } from "@tanstack/react-router";
import { ExternalLink, Newspaper } from "lucide-react";
import { Suspense, useState } from "react";
import { marketNewsQueryOptions } from "@/features/news/queries/market-news";
import type { MarketNewsItem } from "@/features/news/types/market-news";
import { useWatchlistStore } from "@/features/watchlist/store/watchlist-store";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function MarketNews() {
  const instruments = useWatchlistStore((state) => state.instruments);
  const hasHydrated = useWatchlistStore((state) => state.hasHydrated);

  if (!hasHydrated || instruments.length === 0) return null;

  const symbols = instruments.map((instrument) => instrument.symbol);
  const resetKey = [...symbols].sort().join(",");

  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <CatchBoundary
          getResetKey={() => resetKey}
          errorComponent={({ reset }) => (
            <MarketNewsError
              onRetry={() => {
                resetQueries();
                reset();
              }}
            />
          )}
        >
          <Suspense fallback={<MarketNewsSkeleton />}>
            <MarketNewsData symbols={symbols} />
          </Suspense>
        </CatchBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function MarketNewsData({ symbols }: { readonly symbols: readonly string[] }) {
  const { data } = useSuspenseQuery(marketNewsQueryOptions(symbols));

  return (
    <section aria-labelledby="market-news-heading" className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2
            id="market-news-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Market News
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Latest stories related to your watchlist
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {data.articles.length}{" "}
          {data.articles.length === 1 ? "story" : "stories"}
        </p>
      </div>

      {data.articles.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">
          No recent news is available for your watchlist.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

export function NewsCard({ article }: { readonly article: MarketNewsItem }) {
  return (
    <article className="grid min-h-40 grid-cols-[minmax(0,1fr)_6.5rem] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:grid-cols-[minmax(0,1fr)_8rem]">
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-medium text-primary">
            {article.source}
          </span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <time dateTime={article.publishedAt} className="shrink-0">
            {formatPublishedAt(article.publishedAt)}
          </time>
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none hover:text-primary focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {article.headline}
            <ExternalLink
              aria-hidden="true"
              className="ml-1 inline size-3.5 align-[-0.1em]"
            />
          </a>
        </h3>

        {article.summary ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {article.summary}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {article.symbols.map((symbol) => (
            <span
              key={symbol}
              className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary"
            >
              {symbol}
            </span>
          ))}
        </div>
      </div>

      <NewsImage src={article.imageUrl} />
    </article>
  );
}

function NewsImage({ src }: { readonly src: string | null }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex min-h-full items-center justify-center bg-muted text-muted-foreground">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width="256"
          height="256"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Newspaper aria-hidden="true" className="size-7" strokeWidth={1.5} />
      )}
    </div>
  );
}

export function MarketNewsSkeleton() {
  return (
    <section aria-label="Loading market news" className="mt-8" aria-busy="true">
      <div className="mb-3">
        <div className="h-6 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-40 grid-cols-[minmax(0,1fr)_6.5rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:grid-cols-[minmax(0,1fr)_8rem]"
          >
            <div className="animate-pulse p-4 motion-reduce:animate-none">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="mt-3 h-5 w-full rounded bg-muted" />
              <div className="mt-2 h-5 w-4/5 rounded bg-muted" />
              <div className="mt-3 h-3 w-full rounded bg-muted" />
            </div>
            <div className="animate-pulse bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketNewsError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <section aria-labelledby="market-news-heading" className="mt-8">
      <h2 id="market-news-heading" className="text-lg font-semibold">
        Market News
      </h2>
      <div
        role="alert"
        className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground"
      >
        <span>Market news is temporarily unavailable.</span>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2.5 py-1 font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function formatPublishedAt(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  const differenceInMinutes = Math.round((timestamp - now) / 60_000);
  const absoluteMinutes = Math.abs(differenceInMinutes);

  if (absoluteMinutes < 1) return "Just now";
  if (absoluteMinutes < 60) {
    return relativeTimeFormatter.format(differenceInMinutes, "minute");
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (Math.abs(differenceInHours) < 24) {
    return relativeTimeFormatter.format(differenceInHours, "hour");
  }

  const differenceInDays = Math.round(differenceInHours / 24);
  if (Math.abs(differenceInDays) <= 7) {
    return relativeTimeFormatter.format(differenceInDays, "day");
  }

  return dateFormatter.format(new Date(value));
}

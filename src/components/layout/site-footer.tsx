import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getUTCFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 px-3 py-5 text-xs text-muted-foreground sm:px-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="shrink-0">&copy; {currentYear} MarketLens</p>
        <div className="flex items-start gap-2.5 sm:justify-end">
          <ShieldCheck
            aria-hidden="true"
            className="size-10 shrink-0 text-primary"
            strokeWidth={1.75}
          />
          <p className="max-w-[27rem] leading-relaxed sm:text-left">
            <span className="block">
              MarketLens is for informational purposes only and not investment
              advice.
            </span>
            <span className="block">
              Past performance does not guarantee future results.
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

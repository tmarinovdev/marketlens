import { Link } from "@tanstack/react-router";
import { Info, LogIn, Menu, Moon, Search, Sun, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const themeStorageKey = "marketlens-theme";

function toggleTheme() {
  const browser = globalThis as typeof globalThis & {
    document?: {
      documentElement: {
        classList: { toggle(token: string): boolean };
      };
    };
    localStorage?: { setItem(key: string, value: string): void };
  };
  const root = browser.document?.documentElement;

  if (!root) return;

  const theme = root.classList.toggle("dark") ? "dark" : "light";

  try {
    browser.localStorage?.setItem(themeStorageKey, theme);
  } catch {
    // The theme still applies for this page if storage is unavailable.
  }
}

export function SiteHeader() {
  return (
    <header className="px-3 pt-3 sm:px-5 sm:pt-5">
      <nav
        aria-label="Primary navigation"
        className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-glass-border bg-glass-strong px-4 py-3 shadow-sm backdrop-blur-xl lg:grid-cols-[minmax(12rem,1fr)_minmax(18rem,2fr)_1fr] lg:px-5"
      >
        <Link
          to="/"
          activeOptions={{ exact: true }}
          aria-label="MarketLens dashboard"
          className="inline-flex w-fit items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-3"
        >
          <MarketLensLogo />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-lg font-bold tracking-[-0.03em] text-foreground sm:text-xl">
              MarketLens
            </span>
            <span className="mt-1.5 text-[0.7rem] font-medium text-muted-foreground sm:text-xs">
              Trade Smarter
            </span>
          </span>
        </Link>

        <div
          role="search"
          className="col-span-2 row-start-2 flex h-11 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/15 lg:col-span-1 lg:col-start-2 lg:row-start-1"
        >
          <Search aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <label htmlFor="instrument-search" className="sr-only">
            Search financial instruments
          </label>
          <input
            id="instrument-search"
            type="search"
            name="instrument-search"
            autoComplete="off"
            placeholder="Search stocks, indexes, ETFs, commodities…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:col-start-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Toggle color theme"
            title="Toggle color theme"
            onClick={toggleTheme}
          >
            <Moon aria-hidden="true" className="dark:hidden" />
            <Sun aria-hidden="true" className="hidden dark:block" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            id="site-menu-trigger"
            className="site-menu-trigger"
            popoverTarget="site-menu"
            popoverTargetAction="toggle"
            aria-label="Open site menu"
            title="Open site menu"
          >
            <Menu aria-hidden="true" />
          </Button>

          <div
            id="site-menu"
            popover="auto"
            aria-label="Site menu"
            className="site-menu-popover w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <Link
              to="/about"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
            >
              <Info aria-hidden="true" className="size-4" />
              About
            </Link>
            <div role="separator" className="my-1 h-px bg-border" />
            <Link
              to="/login"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
            >
              <LogIn aria-hidden="true" className="size-4" />
              Log in
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Create account
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

function MarketLensLogo() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="4 5 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="size-12 shrink-0 text-logo sm:size-14"
    >
      <rect
        x="7"
        y="20"
        width="3.8"
        height="21"
        rx="1.9"
        fill="currentColor"
        opacity="0.24"
      />
      <rect
        x="15.8"
        y="12.5"
        width="3.8"
        height="28.5"
        rx="1.9"
        fill="currentColor"
        opacity="0.4"
      />
      <rect
        x="24.6"
        y="16"
        width="3.8"
        height="25"
        rx="1.9"
        fill="currentColor"
        opacity="0.32"
      />
      <rect
        x="33.4"
        y="8.5"
        width="3.8"
        height="32.5"
        rx="1.9"
        fill="currentColor"
        opacity="0.56"
      />
      <path
        d="M7.8 30.8 14.4 27.1 20.7 28 27.2 24 33.6 20.1 40.3 15.8"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m37.2 14.9 3.1.9-.95 3.1"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

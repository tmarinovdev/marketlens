import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesCombined, LoaderCircle, Search } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { InstrumentSearchResult } from "../api/search-instruments";
import {
  instrumentSearchQueryOptions,
  normalizeInstrumentSearchTerm,
} from "../queries/instrument-search";

const searchDelay = 250;

export function InstrumentSearch() {
  const listboxId = useId();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedValue = useDebouncedValue(inputValue, searchDelay);
  const normalizedInput = normalizeInstrumentSearchTerm(inputValue);
  const normalizedDebouncedValue =
    normalizeInstrumentSearchTerm(debouncedValue);
  const query = useQuery({
    ...instrumentSearchQueryOptions(normalizedDebouncedValue),
    enabled: isOpen && normalizedDebouncedValue.length >= 2,
  });
  const isEligible = normalizedInput.length >= 2;
  const isDebouncing = normalizedInput !== normalizedDebouncedValue;
  const results = isDebouncing ? [] : (query.data ?? []);
  const showPanel = isOpen && isEligible;
  const activeResult = results[activeIndex];

  function selectInstrument(instrument: InstrumentSearchResult) {
    setInputValue(instrument.symbol);
    setActiveIndex(-1);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      selectInstrument(activeResult);
    }
  }

  return (
    <div
      role="search"
      className="relative col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1"
      onBlur={() => {
        setIsOpen(false);
        setActiveIndex(-1);
      }}
    >
      <div className="flex h-11 items-center gap-3 rounded-xl border border-input bg-background/80 px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/15">
        <Search aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <label htmlFor="instrument-search" className="sr-only">
          Search financial instruments
        </label>
        <input
          id="instrument-search"
          type="search"
          name="instrument-search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showPanel}
          aria-activedescendant={
            activeResult ? `${listboxId}-option-${activeResult.id}` : undefined
          }
          autoComplete="off"
          placeholder="Search stocks, indexes, ETFs, commodities…"
          value={inputValue}
          onChange={(event) => {
            const target = event.target as EventTarget & { value: string };
            setInputValue(target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {(isDebouncing || query.isFetching) && isEligible ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          />
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
          {isDebouncing || query.isPending ? (
            <SearchStatus>Searching instruments…</SearchStatus>
          ) : query.isError ? (
            <SearchStatus>
              Instrument search is temporarily unavailable.
            </SearchStatus>
          ) : results.length === 0 ? (
            <SearchStatus>No matching instruments found.</SearchStatus>
          ) : (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Matching instruments"
              className="max-h-80 overflow-y-auto p-1.5"
            >
              {results.map((instrument, index) => (
                <button
                  key={`${instrument.provider}-${instrument.providerAssetId}`}
                  id={`${listboxId}-option-${instrument.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  tabIndex={-1}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectInstrument(instrument)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ChartNoAxesCombined
                      aria-hidden="true"
                      className="size-4"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold text-foreground">
                        {instrument.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {instrument.exchange ?? instrument.currency}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {instrument.name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchStatus({ children }: { children: string }) {
  return (
    <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { InstrumentSearchResult } from "@/features/instruments/api/search-instruments";

interface WatchlistState {
  readonly instruments: readonly InstrumentSearchResult[];
  readonly hasHydrated: boolean;
  readonly addInstrument: (instrument: InstrumentSearchResult) => void;
  readonly removeInstrument: (
    provider: string,
    providerAssetId: string,
  ) => void;
  readonly reorderInstrument: (activeId: string, overId: string) => void;
}

export const watchlistStorageKey = "marketlens-watchlist";

export function getWatchlistInstrumentId(
  instrument: Pick<InstrumentSearchResult, "provider" | "providerAssetId">,
): string {
  return `${instrument.provider}:${instrument.providerAssetId}`;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      instruments: [],
      hasHydrated: false,
      addInstrument: (instrument) =>
        set((state) => {
          const isAlreadyAdded = state.instruments.some(
            (item) =>
              item.provider === instrument.provider &&
              item.providerAssetId === instrument.providerAssetId,
          );

          return isAlreadyAdded
            ? state
            : { instruments: [...state.instruments, instrument] };
        }),
      removeInstrument: (provider, providerAssetId) =>
        set((state) => ({
          instruments: state.instruments.filter(
            (item) =>
              item.provider !== provider ||
              item.providerAssetId !== providerAssetId,
          ),
        })),
      reorderInstrument: (activeId, overId) =>
        set((state) => {
          if (activeId === overId) return state;

          const activeIndex = state.instruments.findIndex(
            (instrument) => getWatchlistInstrumentId(instrument) === activeId,
          );
          const overIndex = state.instruments.findIndex(
            (instrument) => getWatchlistInstrumentId(instrument) === overId,
          );

          if (activeIndex < 0 || overIndex < 0) return state;

          const instruments = [...state.instruments];
          const [movedInstrument] = instruments.splice(activeIndex, 1);

          if (!movedInstrument) return state;

          instruments.splice(overIndex, 0, movedInstrument);
          return { instruments };
        }),
    }),
    {
      name: watchlistStorageKey,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ instruments: state.instruments }),
    },
  ),
);

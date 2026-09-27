import { queryOptions } from "@tanstack/react-query";

const searchStaleTime = 24 * 60 * 60 * 1_000;
const searchGarbageCollectionTime = 30 * 60 * 1_000;

export function normalizeInstrumentSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

export function instrumentSearchQueryOptions(searchTerm: string) {
  const normalizedTerm = normalizeInstrumentSearchTerm(searchTerm);

  return queryOptions({
    queryKey: ["instrument-search", normalizedTerm] as const,
    queryFn: async ({ signal }) => {
      const { searchInstruments } = await import("../api/search-instruments");
      return searchInstruments(normalizedTerm, signal);
    },
    enabled: normalizedTerm.length >= 2,
    staleTime: searchStaleTime,
    gcTime: searchGarbageCollectionTime,
    retry: 1,
  });
}

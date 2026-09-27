import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface InstrumentSearchResult {
  readonly id: number;
  readonly provider: string;
  readonly providerAssetId: string;
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: string;
  readonly instrumentType: string | null;
  readonly exchange: string | null;
  readonly currency: string;
}

export async function searchInstruments(
  searchTerm: string,
  signal: AbortSignal,
): Promise<InstrumentSearchResult[]> {
  const normalizedTerm = searchTerm.trim();
  if (normalizedTerm.length < 2) return [];

  const { data, error } = await getSupabaseBrowserClient()
    .rpc("search_instruments", {
      search_query: normalizedTerm,
      result_limit: 8,
    })
    .abortSignal(signal);

  if (error) {
    throw new Error("Unable to search instruments.", { cause: error });
  }

  return data.map((instrument) => ({
    id: instrument.id,
    provider: instrument.provider,
    providerAssetId: instrument.provider_asset_id,
    symbol: instrument.symbol,
    name: instrument.name,
    assetClass: instrument.asset_class,
    instrumentType: instrument.instrument_type ?? null,
    exchange: instrument.exchange ?? null,
    currency: instrument.currency,
  }));
}

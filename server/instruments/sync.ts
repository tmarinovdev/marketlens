import { createClient } from "@supabase/supabase-js";
import {
  fetchActiveUsEquities,
  normalizeAlpacaAsset,
  type InstrumentCatalogRow,
} from "../market-provider/alpaca/assets.ts";

const UPSERT_BATCH_SIZE = 500;

interface SynchronizeInstrumentCatalogOptions {
  readonly alpacaApiKey: string;
  readonly alpacaApiSecret: string;
  readonly supabaseUrl: string;
  readonly supabaseSecretKey: string;
}

export interface InstrumentSyncResult {
  readonly received: number;
  readonly searchable: number;
  readonly synchronizedAt: string;
}

function batches<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export async function synchronizeInstrumentCatalog({
  alpacaApiKey,
  alpacaApiSecret,
  supabaseUrl,
  supabaseSecretKey,
}: SynchronizeInstrumentCatalogOptions): Promise<InstrumentSyncResult> {
  const synchronizedAt = new Date().toISOString();
  const assets = await fetchActiveUsEquities({
    apiKey: alpacaApiKey,
    apiSecret: alpacaApiSecret,
  });
  const rows = assets.map((asset) =>
    normalizeAlpacaAsset(asset, synchronizedAt),
  );
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const batch of batches<InstrumentCatalogRow>(rows, UPSERT_BATCH_SIZE)) {
    const { error } = await supabase.from("instruments").upsert(batch, {
      onConflict: "provider,provider_asset_id",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Unable to upsert instrument catalog: ${error.message}`, {
        cause: error,
      });
    }
  }

  const { error: staleError } = await supabase
    .from("instruments")
    .update({ is_active: false, is_tradable: false })
    .eq("provider", "alpaca")
    .eq("asset_class", "us_equity")
    .lt("synced_at", synchronizedAt);

  if (staleError) {
    throw new Error(
      `Unable to deactivate stale instruments: ${staleError.message}`,
      { cause: staleError },
    );
  }

  return {
    received: rows.length,
    searchable: rows.filter((row) => row.is_active && row.is_tradable).length,
    synchronizedAt,
  };
}

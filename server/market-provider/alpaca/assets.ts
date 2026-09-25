import { z } from "zod";

const ALPACA_ASSETS_URL =
  "https://paper-api.alpaca.markets/v2/assets?status=active&asset_class=us_equity";

const AlpacaAssetSchema = z.object({
  id: z.string().trim().min(1),
  class: z.string().trim().min(1),
  exchange: z.string().trim().min(1),
  symbol: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: z.string().trim().min(1),
  tradable: z.boolean(),
});

const AlpacaAssetsSchema = z.array(AlpacaAssetSchema);

export type AlpacaAsset = z.infer<typeof AlpacaAssetSchema>;

export interface InstrumentCatalogRow {
  readonly provider: "alpaca";
  readonly provider_asset_id: string;
  readonly symbol: string;
  readonly name: string;
  readonly asset_class: string;
  readonly instrument_type: null;
  readonly exchange: string;
  readonly currency: "USD";
  readonly is_active: boolean;
  readonly is_tradable: boolean;
  readonly synced_at: string;
}

interface FetchAlpacaAssetsOptions {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly fetchImplementation?: typeof fetch;
}

export async function fetchActiveUsEquities({
  apiKey,
  apiSecret,
  fetchImplementation = fetch,
}: FetchAlpacaAssetsOptions): Promise<AlpacaAsset[]> {
  const response = await fetchImplementation(ALPACA_ASSETS_URL, {
    headers: {
      Accept: "application/json",
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 500);
    throw new Error(
      `Alpaca assets request failed with ${response.status}: ${responseBody}`,
    );
  }

  const payload: unknown = await response.json();
  return AlpacaAssetsSchema.parse(payload);
}

export function normalizeAlpacaAsset(
  asset: AlpacaAsset,
  synchronizedAt: string,
): InstrumentCatalogRow {
  return {
    provider: "alpaca",
    provider_asset_id: asset.id,
    symbol: asset.symbol.toUpperCase(),
    name: asset.name,
    asset_class: asset.class,
    instrument_type: null,
    exchange: asset.exchange,
    currency: "USD",
    is_active: asset.status === "active",
    is_tradable: asset.tradable,
    synced_at: synchronizedAt,
  };
}

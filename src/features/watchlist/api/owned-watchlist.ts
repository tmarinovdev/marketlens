import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const ownedWatchlistSchema = z.object({
  revision: z.number().int().nonnegative(),
  instruments: z
    .array(
      z.object({
        id: z.number().int().positive(),
        provider: z.string(),
        providerAssetId: z.string(),
        symbol: z.string(),
        name: z.string(),
        assetClass: z.string(),
        instrumentType: z.string().nullable(),
        exchange: z.string().nullable(),
        currency: z.string(),
      }),
    )
    .max(20),
});
export type OwnedWatchlist = z.infer<typeof ownedWatchlistSchema>;

export async function readOwnedWatchlist(
  client: SupabaseClient<Database>,
  signal?: AbortSignal,
): Promise<OwnedWatchlist> {
  const request = client.rpc("read_my_watchlist");
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw new Error("Unable to load your saved watchlist.");
  return ownedWatchlistSchema.parse(data);
}

export async function fetchOwnedWatchlist(signal: AbortSignal) {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  return readOwnedWatchlist(getSupabaseBrowserClient(), signal);
}

export async function saveOwnedWatchlist(
  userId: string,
  revision: number,
  instruments: OwnedWatchlist["instruments"],
): Promise<OwnedWatchlist> {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "save_my_watchlist",
    {
      expected_user_id: userId,
      expected_revision: revision,
      instrument_ids: instruments.map(({ id }) => id),
    },
  );
  if (error)
    throw new Error(
      error.code === "40001"
        ? "Your watchlist changed in another tab or device. It has been reloaded; please try again."
        : "Unable to save your watchlist. Please try again.",
    );
  return ownedWatchlistSchema.parse(data);
}

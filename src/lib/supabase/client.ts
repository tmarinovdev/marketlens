import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv } from "@/lib/env/client";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const env = getClientEnv();
    browserClient = createClient<Database>(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return browserClient;
}

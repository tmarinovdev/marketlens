import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { getServerEnv } from "../server/env.ts";
import { synchronizeInstrumentCatalog } from "../server/instruments/sync.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

try {
  loadEnvFile(resolve(root, ".env.local"));
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    throw new Error(
      "Missing .env.local. Copy .env.example to .env.local and add your local credentials.",
      { cause: error },
    );
  }

  throw error;
}

const env = getServerEnv();

console.log("Synchronizing active Alpaca US equities...");

const result = await synchronizeInstrumentCatalog({
  alpacaApiKey: env.ALPACA_API_KEY,
  alpacaApiSecret: env.ALPACA_API_SECRET,
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabaseSecretKey: env.SUPABASE_SECRET_KEY,
});

console.log(
  `Instrument synchronization complete: ${result.received} received, ${result.searchable} searchable, synchronized at ${result.synchronizedAt}.`,
);

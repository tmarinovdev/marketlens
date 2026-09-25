import { parseCronEnv } from "../env.ts";
import {
  synchronizeInstrumentCatalog,
  type InstrumentSyncResult,
} from "../instruments/sync.ts";

type Synchronize = (options: {
  readonly alpacaApiKey: string;
  readonly alpacaApiSecret: string;
  readonly supabaseUrl: string;
  readonly supabaseSecretKey: string;
}) => Promise<InstrumentSyncResult>;

interface InstrumentSyncCronDependencies {
  readonly environment?: Record<string, unknown>;
  readonly synchronize?: Synchronize;
  readonly logError?: (message: string, error: unknown) => void;
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function handleInstrumentSyncCron(
  request: Request,
  {
    environment = process.env,
    synchronize = synchronizeInstrumentCatalog,
    logError = console.error,
  }: InstrumentSyncCronDependencies = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "private, no-store",
      },
    });
  }

  const cronSecret = environment.CRON_SECRET;
  if (
    typeof cronSecret !== "string" ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return jsonResponse({ success: false }, 401);
  }

  try {
    const env = parseCronEnv(environment);
    const result = await synchronize({
      alpacaApiKey: env.ALPACA_API_KEY,
      alpacaApiSecret: env.ALPACA_API_SECRET,
      supabaseUrl: env.VITE_SUPABASE_URL,
      supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    });

    return jsonResponse({ success: true, ...result }, 200);
  } catch (error) {
    logError("Scheduled instrument synchronization failed:", error);
    return jsonResponse({ success: false }, 500);
  }
}

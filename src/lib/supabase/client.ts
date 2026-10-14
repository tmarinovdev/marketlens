import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv } from "@/lib/env/client";
import type { Database } from "./database.types";
import { sessionCookieOptions } from "./session-cookie";

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const env = getClientEnv();
    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      secure: window.location.protocol === "https:",
    };
    // Replace this project's pre-existing persistent cookies with session cookies.
    const prefix = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
    for (const { name, value } of parseCookieHeader(document.cookie)) {
      if (
        name === prefix ||
        name.startsWith(`${prefix}.`) ||
        name === `${prefix}-code-verifier`
      ) {
        document.cookie = serializeCookieHeader(name, value, cookieOptions);
      }
    }
    browserClient = createBrowserClient<Database>(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        cookieOptions,
        cookies: {
          getAll: () => parseCookieHeader(document.cookie),
          setAll: (cookies) => {
            for (const { name, value, options } of cookies) {
              document.cookie = serializeCookieHeader(
                name,
                value,
                sessionCookieOptions(options),
              );
            }
          },
        },
      },
    );
  }

  return browserClient;
}

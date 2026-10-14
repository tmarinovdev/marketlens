import type { CookieOptions } from "@supabase/ssr";

export function sessionCookieOptions(options: CookieOptions): CookieOptions {
  // Preserve expiry on deletion; active cookies belong to the browser session.
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  return { ...options, maxAge: undefined, expires: undefined };
}

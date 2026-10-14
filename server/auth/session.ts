import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { parseClientEnv } from "../../src/lib/env/client.ts";
import type { Database } from "../../src/lib/supabase/database.types.ts";
import { toAuthUser } from "../../src/features/auth/types.ts";
import { sessionCookieOptions } from "../../src/lib/supabase/session-cookie.ts";

export function createAuthRequest(request: Request) {
  const env = parseClientEnv(process.env);
  const cookies = new Map(
    parseCookieHeader(request.headers.get("Cookie") ?? "").map(
      ({ name, value }) => [name, value],
    ),
  );
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  const client = createServerClient<Database>(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
      },
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll(values, headers) {
          for (const { name, value, options } of values) {
            cookies.set(name, value);
            responseHeaders.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, sessionCookieOptions(options)),
            );
          }
          for (const [name, value] of Object.entries(headers))
            responseHeaders.set(name, value);
        },
      },
    },
  );

  return {
    client,
    async getUser() {
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return toAuthUser(data.user);
    },
    applyHeaders(response: Response) {
      for (const [name, value] of responseHeaders) {
        if (name !== "set-cookie") response.headers.set(name, value);
      }
      for (const cookie of responseHeaders.getSetCookie())
        response.headers.append("Set-Cookie", cookie);
      return response;
    },
  };
}

export async function handleAuthCallback(request: Request): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code");
  if (!code)
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/login?verification=failed",
        "Cache-Control": "private, no-store",
      },
    });
  const auth = createAuthRequest(request);
  try {
    const { error } = await auth.client.auth.exchangeCodeForSession(code);
    return auth.applyHeaders(
      new Response(null, {
        status: 303,
        headers: {
          Location: error ? "/login?verification=failed" : "/",
          "Referrer-Policy": "no-referrer",
        },
      }),
    );
  } catch {
    return auth.applyHeaders(
      new Response(null, {
        status: 303,
        headers: { Location: "/login?verification=failed" },
      }),
    );
  }
}

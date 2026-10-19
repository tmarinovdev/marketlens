// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createAuthRequest, handleAuthCallback } from "./session.ts";

const { getUser, exchangeCodeForSession } = vi.hoisted(() => ({
  getUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
vi.mock("@supabase/ssr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@supabase/ssr")>()),
  createServerClient: vi.fn(() => ({
    auth: { getUser, exchangeCodeForSession },
  })),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
});
afterEach(() => vi.unstubAllEnvs());

describe("SSR auth", () => {
  it("uses a fresh client per request and returns only verified public user fields", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "person@example.com",
          user_metadata: { private: "excluded" },
        },
      },
      error: null,
    });
    const first = createAuthRequest(new Request("https://marketlens.test/"));
    const second = createAuthRequest(new Request("https://marketlens.test/"));
    expect(first.client).not.toBe(second.client);
    expect(await first.getUser()).toEqual({
      id: "user-1",
      email: "person@example.com",
    });
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid cookie"),
    });
    expect(await second.getUser()).toBeNull();
  });
  it("preserves every refreshed cookie on an uncached response", () => {
    let cookies: CookieMethodsServer | undefined;
    vi.mocked(createServerClient).mockImplementationOnce(
      (_url, _key, options) => {
        cookies = options.cookies;
        return {
          auth: { getUser, exchangeCodeForSession },
        } as unknown as ReturnType<typeof createServerClient>;
      },
    );
    const auth = createAuthRequest(new Request("https://marketlens.test/"));
    cookies?.setAll?.(
      [
        {
          name: "sb-test-auth-token.0",
          value: "part-1",
          options: { path: "/", secure: true, maxAge: 34560000 },
        },
        {
          name: "sb-test-auth-token.1",
          value: "part-2",
          options: { path: "/", secure: true, maxAge: 34560000 },
        },
      ],
      { "Cache-Control": "private, no-store" },
    );
    const response = auth.applyHeaders(new Response("HTML"));
    expect(response.headers.getSetCookie()).toHaveLength(2);
    for (const cookie of response.headers.getSetCookie()) {
      expect(cookie).not.toMatch(/Max-Age|Expires/i);
    }
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("exchanges a verification code and redirects only to our dashboard", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await handleAuthCallback(
      new Request(
        "https://marketlens.test/auth/callback?code=one-time-code&next=https://evil.test",
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/");
  });
  it("distinguishes a missing verification code from an unsuccessful session exchange", async () => {
    const missing = await handleAuthCallback(
      new Request("https://marketlens.test/auth/callback"),
    );
    expect(missing.headers.get("Location")).toBe("/login?verification=failed");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    exchangeCodeForSession.mockResolvedValue({
      error: new Error("Expired code"),
    });
    const expired = await handleAuthCallback(
      new Request("https://marketlens.test/auth/callback?code=expired"),
    );
    expect(expired.headers.get("Location")).toBe(
      "/login?verification=signin_failed",
    );
  });
});

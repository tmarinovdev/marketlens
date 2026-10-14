import { describe, expect, it } from "vitest";
import { serializeCookieHeader } from "@supabase/ssr";
import { sessionCookieOptions } from "./session-cookie";

describe("session cookies", () => {
  it("removes persistence while preserving security and scope", () => {
    const header = serializeCookieHeader(
      "sb-example-auth-token",
      "session",
      sessionCookieOptions({
        path: "/",
        sameSite: "lax",
        secure: true,
        maxAge: 1000,
        expires: new Date("2030-01-01"),
      }),
    );
    expect(header).not.toMatch(/Max-Age|Expires/i);
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Path=/");
  });
  it("preserves deletion so logging out removes cookies", () => {
    const header = serializeCookieHeader(
      "sb-example-auth-token",
      "",
      sessionCookieOptions({ path: "/", maxAge: 0 }),
    );
    expect(header).toContain("Max-Age=0");
  });
});

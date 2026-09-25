import { describe, expect, it } from "vitest";
import { parseClientEnv } from "./client";

const validClientEnv = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("parseClientEnv", () => {
  it("returns only validated browser-safe configuration", () => {
    expect(
      parseClientEnv({
        ...validClientEnv,
        SUPABASE_SECRET_KEY: "sb_secret_must_not_cross_the_boundary",
      }),
    ).toEqual(validClientEnv);
  });

  it("rejects missing or invalid browser configuration", () => {
    expect(() =>
      parseClientEnv({
        VITE_SUPABASE_URL: "http://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "legacy-or-invalid-key",
      }),
    ).toThrowError("Invalid browser environment");
  });
});

// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseCronEnv, parseServerEnv } from "./env.ts";

const validServerEnv = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  ALPACA_API_KEY: "alpaca-key",
  ALPACA_API_SECRET: "alpaca-secret",
};

describe("parseServerEnv", () => {
  it("accepts the complete server-only environment", () => {
    expect(parseServerEnv(validServerEnv)).toEqual(validServerEnv);
  });

  it("rejects a publishable Supabase key as the server secret", () => {
    expect(() =>
      parseServerEnv({
        ...validServerEnv,
        SUPABASE_SECRET_KEY: "sb_publishable_wrong_boundary",
      }),
    ).toThrowError("Invalid server environment");
  });

  it("requires a sufficiently long secret for cron execution", () => {
    expect(() =>
      parseCronEnv({ ...validServerEnv, CRON_SECRET: "too-short" }),
    ).toThrowError("Invalid cron environment");

    expect(
      parseCronEnv({
        VITE_SUPABASE_URL: validServerEnv.VITE_SUPABASE_URL,
        SUPABASE_SECRET_KEY: validServerEnv.SUPABASE_SECRET_KEY,
        ALPACA_API_KEY: validServerEnv.ALPACA_API_KEY,
        ALPACA_API_SECRET: validServerEnv.ALPACA_API_SECRET,
        CRON_SECRET: "a-random-secret-with-32-characters",
      }).CRON_SECRET,
    ).toBe("a-random-secret-with-32-characters");
  });
});

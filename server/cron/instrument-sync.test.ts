// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { handleInstrumentSyncCron } from "./instrument-sync.ts";

const environment = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  ALPACA_API_KEY: "alpaca-key",
  ALPACA_API_SECRET: "alpaca-secret",
  CRON_SECRET: "a-random-secret-with-32-characters",
};

describe("instrument synchronization cron", () => {
  it("rejects a request without the configured bearer token", async () => {
    const synchronize = vi.fn();
    const response = await handleInstrumentSyncCron(
      new Request("https://marketlens.example/api/cron/sync-instruments"),
      { environment, synchronize },
    );

    expect(response.status).toBe(401);
    expect(synchronize).not.toHaveBeenCalled();
  });

  it("runs the synchronization for an authenticated GET request", async () => {
    const synchronize = vi.fn().mockResolvedValue({
      received: 14_384,
      searchable: 13_506,
      synchronizedAt: "2026-09-25T12:00:00.000Z",
    });
    const response = await handleInstrumentSyncCron(
      new Request("https://marketlens.example/api/cron/sync-instruments", {
        headers: { Authorization: `Bearer ${environment.CRON_SECRET}` },
      }),
      { environment, synchronize },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      received: 14_384,
      searchable: 13_506,
      synchronizedAt: "2026-09-25T12:00:00.000Z",
    });
    expect(synchronize).toHaveBeenCalledWith({
      alpacaApiKey: "alpaca-key",
      alpacaApiSecret: "alpaca-secret",
      supabaseUrl: "https://example.supabase.co",
      supabaseSecretKey: "sb_secret_example",
    });
  });

  it("returns a generic error response when synchronization fails", async () => {
    const logError = vi.fn();
    const response = await handleInstrumentSyncCron(
      new Request("https://marketlens.example/api/cron/sync-instruments", {
        headers: { Authorization: `Bearer ${environment.CRON_SECRET}` },
      }),
      {
        environment,
        synchronize: vi.fn().mockRejectedValue(new Error("provider failed")),
        logError,
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ success: false });
    expect(logError).toHaveBeenCalledOnce();
  });

  it("rejects methods other than GET", async () => {
    const response = await handleInstrumentSyncCron(
      new Request("https://marketlens.example/api/cron/sync-instruments", {
        method: "POST",
      }),
      { environment },
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});

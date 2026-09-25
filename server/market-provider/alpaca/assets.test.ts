// @vitest-environment node

import { describe, expect, it } from "vitest";
import { fetchActiveUsEquities, normalizeAlpacaAsset } from "./assets.ts";

const asset = {
  id: "904837e3-3b76-47ec-b432-046db621571b",
  class: "us_equity",
  exchange: "NASDAQ",
  symbol: "aapl",
  name: "Apple Inc.",
  status: "active",
  tradable: true,
};

describe("Alpaca assets", () => {
  it("validates the provider response and sends credentials as headers", async () => {
    const fetchImplementation: typeof fetch = async (input, init) => {
      expect(input).toBe(
        "https://paper-api.alpaca.markets/v2/assets?status=active&asset_class=us_equity",
      );
      expect(init?.headers).toMatchObject({
        "APCA-API-KEY-ID": "key",
        "APCA-API-SECRET-KEY": "secret",
      });
      return Response.json([asset]);
    };

    await expect(
      fetchActiveUsEquities({
        apiKey: "key",
        apiSecret: "secret",
        fetchImplementation,
      }),
    ).resolves.toEqual([asset]);
  });

  it("normalizes an Alpaca asset into the catalog model", () => {
    expect(normalizeAlpacaAsset(asset, "2026-09-25T12:00:00.000Z")).toEqual({
      provider: "alpaca",
      provider_asset_id: asset.id,
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_class: "us_equity",
      instrument_type: null,
      exchange: "NASDAQ",
      currency: "USD",
      is_active: true,
      is_tradable: true,
      synced_at: "2026-09-25T12:00:00.000Z",
    });
  });

  it("rejects a malformed provider response", async () => {
    const fetchImplementation: typeof fetch = async () =>
      Response.json([{ ...asset, tradable: "yes" }]);

    await expect(
      fetchActiveUsEquities({
        apiKey: "key",
        apiSecret: "secret",
        fetchImplementation,
      }),
    ).rejects.toThrow();
  });
});

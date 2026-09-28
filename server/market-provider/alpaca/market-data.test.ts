// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  fetchAlpacaHistory,
  fetchAlpacaHistoryBundle,
  fetchAlpacaSnapshots,
} from "./market-data.ts";

const options = {
  apiKey: "key",
  apiSecret: "secret",
};

function bar(timestamp: string, close: number) {
  return {
    t: timestamp,
    o: close - 1,
    h: close + 1,
    l: close - 2,
    c: close,
    v: 100,
  };
}

describe("Alpaca market data", () => {
  it("normalizes batched snapshots and market status", async () => {
    const fetchImplementation: typeof fetch = async (input, init) => {
      expect(init?.headers).toMatchObject({
        "APCA-API-KEY-ID": "key",
        "APCA-API-SECRET-KEY": "secret",
      });
      const url = String(input);

      if (url.includes("/v2/clock")) {
        return Response.json({
          is_open: true,
          next_open: "2026-09-29T09:30:00-04:00",
        });
      }

      expect(url).toContain("symbols=AAPL%2CMSFT");
      expect(url).toContain("feed=iex");
      return Response.json({
        AAPL: {
          latestTrade: { t: "2026-09-28T14:00:00Z", p: 105 },
          minuteBar: bar("2026-09-28T13:59:00Z", 104),
          dailyBar: bar("2026-09-28T04:00:00Z", 104),
          prevDailyBar: bar("2026-09-25T04:00:00Z", 100),
        },
      });
    };

    await expect(
      fetchAlpacaSnapshots(["AAPL", "MSFT"], {
        ...options,
        fetchImplementation,
      }),
    ).resolves.toMatchObject({
      marketOpen: true,
      snapshots: [
        {
          symbol: "AAPL",
          price: 105,
          changePercent: 5,
          asOf: "2026-09-28T14:00:00Z",
        },
        {
          symbol: "MSFT",
          price: null,
          changePercent: null,
          asOf: null,
        },
      ],
    });
  });

  it("uses 15-minute bars and selects the latest regular trading session", async () => {
    const fetchImplementation: typeof fetch = async (input) => {
      const url = String(input);
      expect(url).toContain("timeframe=15Min");
      expect(url).toContain("feed=iex");
      expect(url).toContain("adjustment=split");
      return Response.json({
        bars: {
          AAPL: [
            bar("2026-09-25T13:30:00Z", 100),
            bar("2026-09-28T12:00:00Z", 101),
            bar("2026-09-28T13:30:00Z", 102),
            bar("2026-09-28T13:45:00Z", 103),
          ],
        },
        next_page_token: null,
      });
    };

    const result = await fetchAlpacaHistory(
      ["AAPL"],
      "1D",
      { ...options, fetchImplementation },
      new Date("2026-09-28T15:00:00Z"),
    );

    expect(result).toEqual([
      {
        symbol: "AAPL",
        range: "1D",
        sessionDate: "2026-09-28",
        points: [
          { timestamp: "2026-09-28T13:30:00Z", price: 102 },
          { timestamp: "2026-09-28T13:45:00Z", price: 103 },
        ],
      },
    ]);
  });

  it("builds every longer range from one hourly and one daily request", async () => {
    const requestedTimeframes: string[] = [];
    const fetchImplementation: typeof fetch = async (input) => {
      const url = new URL(String(input));
      const timeframe = url.searchParams.get("timeframe");
      if (timeframe) requestedTimeframes.push(timeframe);

      return Response.json({
        bars: {
          AAPL:
            timeframe === "1Hour"
              ? [
                  bar("2026-09-25T14:00:00Z", 100),
                  bar("2026-09-28T14:00:00Z", 105),
                ]
              : [
                  bar("2025-09-27T04:00:00Z", 80),
                  bar("2026-01-02T05:00:00Z", 90),
                  bar("2026-07-01T04:00:00Z", 95),
                  bar("2026-09-01T04:00:00Z", 100),
                  bar("2026-09-28T04:00:00Z", 105),
                ],
        },
        next_page_token: null,
      });
    };

    const result = await fetchAlpacaHistoryBundle(
      ["AAPL"],
      { ...options, fetchImplementation },
      new Date("2026-09-28T15:00:00Z"),
    );

    expect(requestedTimeframes.sort()).toEqual(["1Day", "1Hour"]);
    expect(result.map((history) => history.range)).toEqual([
      "1W",
      "1M",
      "3M",
      "1Y",
      "YTD",
    ]);
    expect(
      result.find((history) => history.range === "1M")?.points,
    ).toHaveLength(2);
    expect(
      result.find((history) => history.range === "YTD")?.points,
    ).toHaveLength(4);
  });
});

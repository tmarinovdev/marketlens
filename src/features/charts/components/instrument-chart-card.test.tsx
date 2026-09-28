import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InstrumentChartCard } from "./instrument-chart-card";

const instrument = {
  id: 1,
  provider: "alpaca",
  providerAssetId: "apple-id",
  symbol: "AAPL",
  name: "Apple Inc.",
  assetClass: "us_equity",
  instrumentType: null,
  exchange: "NASDAQ",
  currency: "USD",
} as const;

describe("InstrumentChartCard", () => {
  it("shows snapshot data while history loads and changes ranges", async () => {
    const handleRangeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <InstrumentChartCard
        instrument={instrument}
        snapshot={{
          symbol: "AAPL",
          price: 195.86,
          changePercent: 1.42,
          asOf: "2026-09-28T14:00:00Z",
        }}
        history={undefined}
        range="1D"
        snapshotPending={false}
        snapshotError={false}
        historyPending
        historyError={false}
        onRangeChange={handleRangeChange}
      />,
    );

    expect(screen.getByText("$195.86")).toBeVisible();
    expect(screen.getByText("+1.42%")).toBeVisible();
    expect(screen.getByRole("button", { name: "1D" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "1W" }));

    expect(handleRangeChange).toHaveBeenCalledWith("1W");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("exposes the dashboard identity with accessible page content", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "MarketLens" }),
    ).toBeVisible();
    expect(
      screen.getByText("Your personal view of the markets."),
    ).toBeVisible();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders an accessible page title and watchlist section", async () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "MarketLens" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "My Watchlist" }),
    ).toBeVisible();
    expect(await screen.findByText("Your watchlist is empty.")).toBeVisible();
  });
});

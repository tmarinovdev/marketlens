import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { App } from "./App";
import { WatchlistProvider } from "@/features/watchlist/watchlist-provider";
vi.mock("@/features/auth/auth-provider", () => ({ useAuthUser: () => null }));

describe("App", () => {
  it("renders an accessible page title and watchlist section", async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <WatchlistProvider>
          <App />
        </WatchlistProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "MarketLens" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "My Watchlist" }),
    ).toBeVisible();
    expect(await screen.findByText("Your watchlist is empty.")).toBeVisible();
  });
});

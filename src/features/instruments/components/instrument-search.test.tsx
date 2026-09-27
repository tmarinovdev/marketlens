import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchInstruments } from "../api/search-instruments";
import { InstrumentSearch } from "./instrument-search";

vi.mock("../api/search-instruments", () => ({
  searchInstruments: vi.fn(),
}));

const mockedSearchInstruments = vi.mocked(searchInstruments);

function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("InstrumentSearch", () => {
  beforeEach(() => mockedSearchInstruments.mockReset());

  it("searches after the debounce and supports keyboard selection", async () => {
    const handleSelect = vi.fn();
    mockedSearchInstruments.mockResolvedValue([
      {
        id: 1,
        provider: "alpaca",
        providerAssetId: "apple-id",
        symbol: "AAPL",
        name: "Apple Inc. Common Stock",
        assetClass: "us_equity",
        instrumentType: null,
        exchange: "NASDAQ",
        currency: "USD",
      },
    ]);
    const user = userEvent.setup();
    render(<InstrumentSearch onSelect={handleSelect} />, {
      wrapper: TestProviders,
    });
    const input = screen.getByRole("combobox", {
      name: "Search financial instruments",
    });

    await user.type(input, "app");

    expect(await screen.findByRole("option", { name: /AAPL/i })).toBeVisible();
    expect(mockedSearchInstruments).toHaveBeenCalledOnce();
    expect(mockedSearchInstruments).toHaveBeenCalledWith(
      "app",
      expect.any(AbortSignal),
    );

    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("");
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "AAPL" }),
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOwnedWatchlist, saveOwnedWatchlist } from "./api/owned-watchlist";
import { useWatchlistStore } from "./store/watchlist-store";
import {
  mergeWatchlist,
  WatchlistProvider,
  useWatchlist,
} from "./watchlist-provider";
import type { AuthUser } from "@/features/auth/types";
import { wasWatchlistInitialized } from "./initialization";

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock("@/features/auth/auth-provider", () => ({
  useAuthUser: () => auth.user,
}));
vi.mock("./api/owned-watchlist", () => ({
  fetchOwnedWatchlist: vi.fn(),
  saveOwnedWatchlist: vi.fn(),
}));
const apple = {
  id: 1,
  provider: "alpaca",
  providerAssetId: "apple",
  symbol: "AAPL",
  name: "Apple",
  assetClass: "us_equity",
  instrumentType: null,
  exchange: "NASDAQ",
  currency: "USD",
};
const microsoft = {
  ...apple,
  id: 2,
  providerAssetId: "microsoft",
  symbol: "MSFT",
  name: "Microsoft",
};

function Consumer() {
  const view = useWatchlist();
  return (
    <>
      <p data-testid="symbols">
        {view.instruments.map(({ symbol }) => symbol).join(",")}
      </p>
      <p>{view.error}</p>
      <button onClick={() => view.removeInstrument("alpaca", "apple")}>
        Remove Apple
      </button>
      <button onClick={() => view.addInstrument(apple)}>Add Apple</button>
      <button
        onClick={() =>
          view.reorderInstrument("alpaca:microsoft", "alpaca:apple")
        }
      >
        Reorder
      </button>
    </>
  );
}
function tree(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <WatchlistProvider>
        <Consumer />
      </WatchlistProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  useWatchlistStore.setState({ instruments: [], hasHydrated: true });
  auth.user = { id: "owner-a", email: "a@example.com" };
});

describe("watchlist ownership in the UI", () => {
  it("does not mark a pending copy complete and recovers after login navigation", async () => {
    useWatchlistStore.setState({ instruments: [apple] });
    vi.mocked(fetchOwnedWatchlist).mockResolvedValue({
      revision: 0,
      instruments: [],
    });
    let finishFirstSave:
      | ((value: Awaited<ReturnType<typeof saveOwnedWatchlist>>) => void)
      | undefined;
    vi.mocked(saveOwnedWatchlist)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirstSave = resolve;
          }),
      )
      .mockResolvedValue({ revision: 1, instruments: [apple] });
    const beforeRedirect = render(tree(new QueryClient()));
    await waitFor(() => expect(saveOwnedWatchlist).toHaveBeenCalledTimes(1));
    expect(wasWatchlistInitialized("owner-a")).toBe(false);
    beforeRedirect.unmount();

    // A login redirect creates a fresh provider while the old request is pending.
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 0, instruments: [] })
      .mockResolvedValue({ revision: 1, instruments: [apple] });
    render(tree(new QueryClient()));
    await waitFor(() => expect(wasWatchlistInitialized("owner-a")).toBe(true));
    expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL");
    expect(saveOwnedWatchlist).toHaveBeenCalledTimes(2);
    await act(async () =>
      finishFirstSave?.({ revision: 1, instruments: [apple] }),
    );
    expect(useWatchlistStore.getState().instruments).toEqual([apple]);
  });
  it("does not restore a cleared private cache when a previous account's save completes", async () => {
    let completeSave:
      | ((data: Awaited<ReturnType<typeof saveOwnedWatchlist>>) => void)
      | undefined;
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 1, instruments: [apple] })
      .mockResolvedValue({ revision: 0, instruments: [] });
    vi.mocked(saveOwnedWatchlist).mockImplementation(
      () =>
        new Promise((resolve) => {
          completeSave = resolve;
        }),
    );
    const client = new QueryClient();
    const view = render(tree(client));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));
    await waitFor(() => expect(saveOwnedWatchlist).toHaveBeenCalled());
    auth.user = { id: "owner-b", email: "b@example.com" };
    act(() =>
      client.removeQueries({ queryKey: ["account-watchlist", "owner-a"] }),
    );
    view.rerender(tree(client));
    await act(async () => {
      completeSave?.({ revision: 2, instruments: [] });
    });
    expect(
      client.getQueryData(["account-watchlist", "owner-a"]),
    ).toBeUndefined();
    expect(screen.getByTestId("symbols")).not.toHaveTextContent("AAPL");
  });
  it("saves ordering with the loaded revision", async () => {
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 1, instruments: [apple, microsoft] })
      .mockResolvedValue({ revision: 2, instruments: [microsoft, apple] });
    vi.mocked(saveOwnedWatchlist).mockResolvedValue({
      revision: 2,
      instruments: [microsoft, apple],
    });
    render(tree(new QueryClient()));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL,MSFT"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Reorder" }));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("MSFT,AAPL"),
    );
    expect(saveOwnedWatchlist).toHaveBeenCalledWith("owner-a", 1, [
      microsoft,
      apple,
    ]);
  });
  it("does not show the previous account or copy its list into anonymous storage", async () => {
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 1, instruments: [apple] })
      .mockResolvedValueOnce({ revision: 1, instruments: [microsoft] });
    const client = new QueryClient();
    const view = render(tree(client));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL"),
    );
    auth.user = { id: "owner-b", email: "b@example.com" };
    view.rerender(tree(client));
    expect(screen.getByTestId("symbols")).not.toHaveTextContent("AAPL");
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("MSFT"),
    );
    expect(useWatchlistStore.getState().instruments).toEqual([]);
    expect(localStorage.getItem("marketlens-watchlist")).not.toContain("MSFT");
  });
  it("rolls back optimistic changes after a failed save", async () => {
    vi.mocked(fetchOwnedWatchlist).mockResolvedValue({
      revision: 1,
      instruments: [apple],
    });
    vi.mocked(saveOwnedWatchlist).mockRejectedValue(new Error("Save failed"));
    render(tree(new QueryClient()));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));
    expect(await screen.findByText("Save failed")).toBeVisible();
    expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL");
    expect(saveOwnedWatchlist).toHaveBeenCalledWith("owner-a", 1, []);
  });
  it("copies anonymous instruments automatically only into an empty account and preserves them on logout", async () => {
    useWatchlistStore.setState({ instruments: [apple, microsoft] });
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 0, instruments: [] })
      .mockResolvedValue({ revision: 1, instruments: [apple, microsoft] });
    vi.mocked(saveOwnedWatchlist).mockResolvedValue({
      revision: 1,
      instruments: [apple, microsoft],
    });
    const client = new QueryClient();
    const view = render(tree(client));
    await waitFor(() =>
      expect(saveOwnedWatchlist).toHaveBeenCalledWith("owner-a", 0, [
        apple,
        microsoft,
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL,MSFT"),
    );
    expect(useWatchlistStore.getState().instruments).toEqual([
      apple,
      microsoft,
    ]);
    auth.user = null;
    view.rerender(tree(client));
    expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL,MSFT");
  });
  it("never imports or merges into an already populated account", async () => {
    useWatchlistStore.setState({ instruments: [apple] });
    vi.mocked(fetchOwnedWatchlist).mockResolvedValue({
      revision: 3,
      instruments: [microsoft],
    });
    render(tree(new QueryClient()));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("MSFT"),
    );
    expect(saveOwnedWatchlist).not.toHaveBeenCalled();
    expect(useWatchlistStore.getState().instruments).toEqual([apple]);
  });
  it("keeps an empty account empty when the anonymous list is empty", async () => {
    vi.mocked(fetchOwnedWatchlist).mockResolvedValue({
      revision: 0,
      instruments: [],
    });
    render(tree(new QueryClient()));
    await waitFor(() => expect(fetchOwnedWatchlist).toHaveBeenCalled());
    expect(saveOwnedWatchlist).not.toHaveBeenCalled();
    expect(screen.getByTestId("symbols")).toBeEmptyDOMElement();
  });
  it("does not repopulate a deliberately emptied list during the same login or after reload", async () => {
    useWatchlistStore.setState({ instruments: [apple] });
    vi.mocked(fetchOwnedWatchlist)
      .mockResolvedValueOnce({ revision: 0, instruments: [] })
      .mockResolvedValue({ revision: 1, instruments: [apple] });
    vi.mocked(saveOwnedWatchlist).mockResolvedValue({
      revision: 1,
      instruments: [apple],
    });
    const client = new QueryClient();
    const view = render(tree(client));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toHaveTextContent("AAPL"),
    );
    vi.mocked(fetchOwnedWatchlist).mockResolvedValue({
      revision: 2,
      instruments: [],
    });
    vi.mocked(saveOwnedWatchlist).mockResolvedValue({
      revision: 2,
      instruments: [],
    });
    await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));
    await waitFor(() =>
      expect(screen.getByTestId("symbols")).toBeEmptyDOMElement(),
    );
    expect(saveOwnedWatchlist).toHaveBeenCalledTimes(2);
    view.unmount();
    render(tree(new QueryClient()));
    await waitFor(() => expect(fetchOwnedWatchlist).toHaveBeenCalledTimes(4));
    expect(saveOwnedWatchlist).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("symbols")).toBeEmptyDOMElement();
  });
  it("deduplicates additions while preserving existing order", () => {
    expect(mergeWatchlist([microsoft], [apple, microsoft, apple])).toEqual([
      microsoft,
      apple,
    ]);
  });
});

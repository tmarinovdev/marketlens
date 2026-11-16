import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOwnedWatchlist, saveOwnedWatchlist } from "./owned-watchlist";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ rpc }),
}));
beforeEach(() => vi.clearAllMocks());

describe("owned watchlist adapter", () => {
  it("reads through the authenticated RPC and passes cancellation", async () => {
    const abortSignal = vi.fn().mockResolvedValue({
      data: { revision: 0, instruments: [] },
      error: null,
    });
    rpc.mockReturnValue({ abortSignal });
    const signal = new AbortController().signal;
    expect(await fetchOwnedWatchlist(signal)).toEqual({
      revision: 0,
      instruments: [],
    });
    expect(rpc).toHaveBeenCalledWith("read_my_watchlist");
    expect(abortSignal).toHaveBeenCalledWith(signal);
  });
  it("asserts the owner and revision without sending catalog metadata", async () => {
    rpc.mockResolvedValue({
      data: { revision: 2, instruments: [] },
      error: null,
    });
    await saveOwnedWatchlist("owner-a", 1, []);
    expect(rpc).toHaveBeenCalledWith("save_my_watchlist", {
      expected_user_id: "owner-a",
      expected_revision: 1,
      instrument_ids: [],
    });
  });
  it("reports concurrent edits rather than silently overwriting them", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    await expect(saveOwnedWatchlist("owner-a", 0, [])).rejects.toThrow(
      "another tab or device",
    );
  });
  it("rejects invalid provider data", async () => {
    rpc.mockResolvedValue({
      data: { revision: -1, instruments: [] },
      error: null,
    });
    await expect(saveOwnedWatchlist("owner-a", 0, [])).rejects.toThrow();
  });
});

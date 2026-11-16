// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../src/entry-server.tsx";

const state = vi.hoisted(() => ({
  user: { id: "owner-a", email: "a@example.com" },
  instruments: [
    {
      id: 1,
      provider: "alpaca",
      providerAssetId: "ssr-private",
      symbol: "SSRPRIVATE",
      name: "Private SSR fixture",
      assetClass: "us_equity",
      instrumentType: null,
      exchange: "NASDAQ",
      currency: "USD",
    },
  ],
}));
vi.mock("./session.ts", () => ({
  createAuthRequest: () => ({
    getUser: async () => state.user,
    client: {
      rpc: async () => ({
        data: { revision: 1, instruments: state.instruments },
        error: null,
      }),
    },
    applyHeaders: (response: Response) => response,
  }),
  handleAuthCallback: vi.fn(),
}));

beforeEach(() => {
  state.user = { id: "owner-a", email: "a@example.com" };
});

describe("authenticated SSR", () => {
  it("renders and dehydrates the owner's watchlist without sharing it with another request", async () => {
    const makeRequest = () =>
      new Request("https://marketlens.test/", {
        headers: { Cookie: "sb-test-auth-token=mock-session" },
      });
    const first = await render({ request: makeRequest() });
    expect(first.status).toBe(200);
    const firstHtml = await first.text();
    expect(firstHtml).toContain("SSRPRIVATE");
    expect(firstHtml).toContain("a@example.com");
    expect(firstHtml).toContain("account-watchlist");
    state.user = { id: "owner-b", email: "b@example.com" };
    state.instruments = [];
    const second = await render({ request: makeRequest() });
    expect(second.status).toBe(200);
    const secondHtml = await second.text();
    expect(secondHtml).toContain("b@example.com");
    expect(secondHtml).not.toContain("SSRPRIVATE");
    expect(secondHtml).not.toContain("a@example.com");
  });
});

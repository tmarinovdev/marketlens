import { act, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuthUser } from "./auth-provider";

type Listener = (
  event: string,
  session: { user: { id: string; email: string } } | null,
) => void;
const { subscribe, unsubscribe } = vi.hoisted(() => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: subscribe } }),
}));
let listener: Listener | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  listener = undefined;
  subscribe.mockImplementation((callback: Listener) => {
    listener = callback;
    return { data: { subscription: { unsubscribe } } };
  });
});

function Identity() {
  const user = useAuthUser();
  return <p>{user?.email ?? "Anonymous"}</p>;
}

describe("auth UI state", () => {
  it("keeps server-rendered users isolated between provider instances", () => {
    const first = renderToString(
      <AuthProvider initialUser={{ id: "a", email: "a@example.com" }}>
        <Identity />
      </AuthProvider>,
    );
    const second = renderToString(
      <AuthProvider initialUser={{ id: "b", email: "b@example.com" }}>
        <Identity />
      </AuthProvider>,
    );
    expect(first).toContain("a@example.com");
    expect(second).toContain("b@example.com");
    expect(second).not.toContain("a@example.com");
  });
  it("reflects login/logout events and unsubscribes on unmount", async () => {
    const view = render(
      <AuthProvider initialUser={null}>
        <Identity />
      </AuthProvider>,
    );
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    act(() =>
      listener?.("SIGNED_IN", { user: { id: "a", email: "a@example.com" } }),
    );
    expect(screen.getByText("a@example.com")).toBeVisible();
    act(() => listener?.("SIGNED_OUT", null));
    expect(screen.getByText("Anonymous")).toBeVisible();
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

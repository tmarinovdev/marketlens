import { beforeEach, describe, expect, it, vi } from "vitest";
import { register, logIn, logOut, passwordSchema } from "./api";
import {
  markWatchlistInitialized,
  wasWatchlistInitialized,
} from "@/features/watchlist/initialization";

const { signUp, signInWithPassword, signOut } = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { signUp, signInWithPassword, signOut },
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("auth API", () => {
  it("resets before the login event and preserves initialization completed by subscribers", async () => {
    markWatchlistInitialized("owner-a");
    signInWithPassword.mockImplementation(async () => {
      expect(wasWatchlistInitialized("owner-a")).toBe(false);
      // Supabase notifies subscribers before resolving signInWithPassword.
      markWatchlistInitialized("owner-a");
      return { error: null };
    });
    await logIn({ email: "person@example.com", password: "Test-password1!" });
    expect(wasWatchlistInitialized("owner-a")).toBe(true);
  });
  it("allows a fresh watchlist copy decision on each successful login", async () => {
    markWatchlistInitialized("owner-a");
    signInWithPassword.mockResolvedValue({ error: null });
    await logIn({ email: "person@example.com", password: "Test-password1!" });
    expect(wasWatchlistInitialized("owner-a")).toBe(false);
  });
  it("resets the initialization marker on successful logout", async () => {
    markWatchlistInitialized("owner-a");
    signOut.mockResolvedValue({ error: null });
    await logOut();
    expect(wasWatchlistInitialized("owner-a")).toBe(false);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it.each(["Aa1!", "password1!", "Password!", "Password1", "Password1 "])(
    "rejects a password missing a required character: %s",
    (password) => {
      expect(passwordSchema.safeParse(password).success).toBe(false);
    },
  );
  it("accepts a password satisfying all requested rules", () => {
    expect(passwordSchema.safeParse("MarketLens1!").success).toBe(true);
  });
  it("sends only email/password and an origin-specific callback to Supabase", async () => {
    signUp.mockResolvedValue({ error: null });
    await register({
      email: "person@example.com",
      password: "Test-password1!",
      confirmPassword: "Test-password1!",
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "Test-password1!",
      options: {
        emailRedirectTo: new URL("/auth/callback", window.location.origin).href,
      },
    });
  });
  it("maps unconfirmed-account errors to a useful message", async () => {
    markWatchlistInitialized("owner-a");
    signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed" },
    });
    await expect(
      logIn({ email: "person@example.com", password: "Test-password1!" }),
    ).rejects.toThrow("Confirm your email");
    expect(wasWatchlistInitialized("owner-a")).toBe(true);
  });
});

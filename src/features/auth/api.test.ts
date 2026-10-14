import { beforeEach, describe, expect, it, vi } from "vitest";
import { register, logIn, passwordSchema } from "./api";

const { signUp, signInWithPassword } = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { signUp, signInWithPassword } }),
}));
beforeEach(() => vi.clearAllMocks());

describe("auth API", () => {
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
    signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed" },
    });
    await expect(
      logIn({ email: "person@example.com", password: "Test-password1!" }),
    ).rejects.toThrow("Confirm your email");
  });
});

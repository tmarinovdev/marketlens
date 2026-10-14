import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { register, logIn } from "../api";
import { AuthForm } from "./auth-form";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  register: vi.fn(),
  logIn: vi.fn(),
  resendVerification: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthForm mode="register" />
    </QueryClientProvider>,
  );
}

async function fillRegistration(confirmPassword: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "Test-password1!",
  );
  await user.type(screen.getByLabelText("Confirm password"), confirmPassword);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("registration form", () => {
  it("does not offer verification resend for an incorrect login password", async () => {
    vi.mocked(logIn).mockRejectedValue(
      new Error("The email or password is incorrect."),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthForm mode="login" />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(
      screen.getByLabelText("Password", { exact: true }),
      "incorrect-password",
    );
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "email or password is incorrect",
    );
    expect(
      screen.queryByRole("button", { name: "Resend verification link" }),
    ).not.toBeInTheDocument();
  });
  it("offers resend when a verification callback failed", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthForm mode="login" verificationFailed />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Resend verification link" }),
    ).toBeVisible();
  });
  it("rejects mismatched passwords before contacting Supabase", async () => {
    renderForm();
    await fillRegistration("different-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords must match.",
    );
    expect(register).not.toHaveBeenCalled();
  });

  it("shows email verification instructions and clears password fields after signup", async () => {
    vi.mocked(register).mockResolvedValue(undefined);
    renderForm();
    await fillRegistration("Test-password1!");
    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("person@example.com");
    expect(
      screen.queryByLabelText("Password", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Wait 60 seconds before resending" }),
    ).toBeDisabled();
  });

  it("shows delivery errors and permits a retry", async () => {
    vi.mocked(register).mockRejectedValue(
      new Error(
        "Email delivery is currently limited to approved test addresses.",
      ),
    );
    renderForm();
    await fillRegistration("Test-password1!");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "approved test addresses",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});

import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/components/auth-form";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { verification?: "failed" | "signin_failed" } =>
    search.verification === "failed" || search.verification === "signin_failed"
      ? { verification: search.verification }
      : {},
  component: LoginPage,
});

function LoginPage() {
  const { verification } = Route.useSearch();
  return (
    <AuthForm
      mode="login"
      verificationFailed={verification === "failed"}
      automaticSignInFailed={verification === "signin_failed"}
    />
  );
}

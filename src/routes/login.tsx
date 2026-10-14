import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/components/auth-form";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { verification?: "failed" } =>
    search.verification === "failed" ? { verification: "failed" } : {},
  component: LoginPage,
});

function LoginPage() {
  const { verification } = Route.useSearch();
  return (
    <AuthForm mode="login" verificationFailed={verification === "failed"} />
  );
}

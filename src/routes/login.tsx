import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/components/auth-form";
import { instrumentSymbolSchema } from "@/features/market-data/types/instrument-detail";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { verification?: "failed" | "signin_failed"; instrument?: string } => ({
    ...(search.verification === "failed" ||
    search.verification === "signin_failed"
      ? { verification: search.verification }
      : {}),
    instrument: instrumentSymbolSchema.safeParse(search.instrument).data,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { verification, instrument } = Route.useSearch();
  return (
    <AuthForm
      mode="login"
      returnInstrument={instrument}
      verificationFailed={verification === "failed"}
      automaticSignInFailed={verification === "signin_failed"}
    />
  );
}

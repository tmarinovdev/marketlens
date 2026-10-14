import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/components/auth-form";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return <AuthForm mode="register" />;
}

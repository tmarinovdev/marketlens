import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-2 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Create an account
      </h1>
      <p className="text-muted-foreground">
        Account registration will be available soon.
      </p>
    </main>
  );
}

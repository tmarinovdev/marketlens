import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-2 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="text-muted-foreground">
        Account access will be available soon.
      </p>
    </main>
  );
}

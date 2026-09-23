import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About | MarketLens" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main>
      <h1>About MarketLens</h1>
      <p>This route verifies type-safe navigation and direct SSR requests.</p>
      <Link to="/">Back to the dashboard</Link>
    </main>
  );
}

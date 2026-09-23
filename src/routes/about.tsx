import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

const queryIntegrationOptions = queryOptions({
  queryKey: ["query-integration-check"],
  queryFn: async () => ({
    source: import.meta.env.SSR ? "server" : "browser",
  }),
});

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About | MarketLens" }] }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(queryIntegrationOptions);
  },
  component: AboutPage,
});

function AboutPage() {
  const { data } = useSuspenseQuery(queryIntegrationOptions);

  return (
    <main>
      <h1>About MarketLens</h1>
      <p>This route verifies type-safe navigation and direct SSR requests.</p>
      <p data-query-source={data.source}>
        TanStack Query cache populated on the {data.source}.
      </p>
      <Link to="/">Back to the dashboard</Link>
    </main>
  );
}

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

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
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        About MarketLens
      </h1>
      <p className="text-muted-foreground">
        This route verifies type-safe navigation and direct SSR requests.
      </p>
      <p className="text-muted-foreground" data-query-source={data.source}>
        TanStack Query cache populated on the {data.source}.
      </p>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Back to the dashboard
      </Link>
    </main>
  );
}

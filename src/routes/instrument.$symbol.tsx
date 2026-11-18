import {
  ClientOnly,
  createFileRoute,
  Navigate,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { useAuthUser } from "@/features/auth/auth-provider";
import {
  InstrumentDetail,
  InstrumentDetailSkeleton,
} from "@/features/instruments/components/instrument-detail";
import { instrumentSymbolSchema } from "@/features/market-data/types/instrument-detail";

export const Route = createFileRoute("/instrument/$symbol")({
  beforeLoad: async ({ context, params }) => {
    const parsed = instrumentSymbolSchema.safeParse(params.symbol);
    if (!parsed.success) throw notFound();

    let authenticated = Boolean(context.initialAuthUser);
    if (typeof window !== "undefined") {
      const { getSupabaseBrowserClient } =
        await import("@/lib/supabase/client");
      const { data, error } = await getSupabaseBrowserClient().auth.getUser();
      authenticated = !error && Boolean(data.user);
    }
    if (!authenticated) {
      throw redirect({ to: "/login", search: { instrument: parsed.data } });
    }
    return { symbol: parsed.data };
  },
  head: ({ params }) => ({
    meta: [{ title: `${params.symbol.toUpperCase()} · MarketLens` }],
  }),
  component: InstrumentRoute,
});

function InstrumentRoute() {
  const { symbol } = Route.useRouteContext();
  const user = useAuthUser();
  return (
    <ClientOnly fallback={<InstrumentDetailSkeleton symbol={symbol} />}>
      {user ? (
        <InstrumentDetail
          key={`${user.id}:${symbol}`}
          symbol={symbol}
          userId={user.id}
        />
      ) : (
        <Navigate to="/login" search={{ instrument: symbol }} replace />
      )}
    </ClientOnly>
  );
}

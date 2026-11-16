import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { StrictMode, type ReactNode } from "react";
import { createQueryClient } from "@/lib/query-client";
import { routeTree } from "@/routeTree.gen";
import type { AuthUser } from "@/features/auth/types";
import type { OwnedWatchlist } from "@/features/watchlist/api/owned-watchlist";

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

export function createRouter(
  initialAuthUser: AuthUser | null = null,
  loadOwnedWatchlist?: () => Promise<OwnedWatchlist>,
) {
  const queryClient = createQueryClient();
  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      initialAuthUser,
      loadOwnedWatchlist,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    Wrap: StrictModeWrapper,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { StrictMode, type ReactNode } from "react";
import { routeTree } from "@/routeTree.gen";

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    Wrap: StrictModeWrapper,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      {
        name: "description",
        content: "A personal dashboard for following financial markets.",
      },
      { title: "MarketLens" },
    ],
  }),
  scripts: () => [
    ...(!import.meta.env.PROD
      ? [
          {
            type: "module",
            children: `import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true`,
          },
          { type: "module", src: "/@vite/client" },
        ]
      : []),
    {
      type: "module",
      src: import.meta.env.PROD
        ? "/assets/entry-client.js"
        : "/src/entry-client.tsx",
    },
  ],
  component: RootDocument,
  notFoundComponent: NotFoundPage,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav aria-label="Primary navigation">
            <Link to="/" activeOptions={{ exact: true }}>
              Dashboard
            </Link>{" "}
            <Link to="/about">About</Link>
          </nav>
        </header>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/">Return to MarketLens</Link>
    </main>
  );
}

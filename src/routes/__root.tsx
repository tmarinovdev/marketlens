import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";

interface RouterContext {
  queryClient: QueryClient;
}

const stylesheetHref = import.meta.env.PROD
  ? "/assets/styles.css"
  : "/src/styles/globals.css";
const interFontHref = import.meta.env.PROD
  ? "/assets/inter-latin-wght-normal.woff2"
  : "/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2";
const themeScript = `try{if(localStorage.getItem("marketlens-theme")==="dark"){document.documentElement.classList.add("dark")}}catch{}`;

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      {
        name: "description",
        content: "A personal dashboard for following financial markets.",
      },
      {
        name: "theme-color",
        content: "#6d28d9",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="preload"
          href={interFontHref}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="preload" href={stylesheetHref} as="style" />
        <link rel="stylesheet" href={stylesheetHref} />
        <HeadContent />
      </head>
      <body>
        <SiteHeader />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link to="/" className="text-primary underline-offset-4 hover:underline">
        Return to MarketLens
      </Link>
    </main>
  );
}

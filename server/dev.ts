import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const templatePath = new URL("../index.html", import.meta.url);
const server = createServer();
const vite = await createViteServer({
  root,
  appType: "custom",
  server: {
    middlewareMode: true,
    hmr: { server },
  },
});

async function renderPage(request: IncomingMessage, response: ServerResponse) {
  const url = request.url ?? "/";
  const pathname = new URL(url, "http://localhost").pathname;

  if (pathname !== "/") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const template = await vite.transformIndexHtml(
    url,
    await readFile(templatePath, "utf-8"),
  );
  const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
  // Vite's dynamic module loader is untyped, so validate its export at the boundary.
  if (typeof render !== "function") {
    throw new Error("The SSR entry must export a render function.");
  }
  const markup: unknown = render();
  if (typeof markup !== "string") {
    throw new Error("The SSR render function must return HTML.");
  }

  const html = template.replace("<!--ssr-outlet-->", () => markup);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(request.method === "HEAD" ? undefined : html);
}

function handleError(error: unknown, response: ServerResponse) {
  if (error instanceof Error) vite.ssrFixStacktrace(error);
  console.error(error);
  if (!response.headersSent) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  }
  response.end("Unable to render the page. Check the development terminal.");
}

server.on("request", (request, response) => {
  vite.middlewares(request, response, (error: unknown) => {
    if (error) {
      handleError(error, response);
      return;
    }
    void renderPage(request, response).catch((error: unknown) => {
      handleError(error, response);
    });
  });
});

server.on("error", async (error) => {
  console.error(error);
  await vite.close();
  process.exitCode = 1;
});

server.listen(5173, "127.0.0.1", () => {
  console.log("MarketLens: http://127.0.0.1:5173");
});

async function shutdown() {
  await vite.close();
  server.close();
  server.closeAllConnections();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

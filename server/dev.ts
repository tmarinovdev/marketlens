import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { sendWebResponse, toWebRequest } from "./node-http.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = createServer();
const vite = await createViteServer({
  root,
  appType: "custom",
  server: {
    middlewareMode: true,
    hmr: { server },
  },
});

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
    void (async () => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end();
        return;
      }

      const module: unknown = await vite.ssrLoadModule("/src/entry-server.tsx");
      if (
        typeof module !== "object" ||
        module === null ||
        !("render" in module) ||
        typeof module.render !== "function"
      ) {
        throw new Error("The SSR entry must export a render function.");
      }

      const result: unknown = await module.render({
        request: toWebRequest(request),
      });
      if (!(result instanceof Response)) {
        throw new Error("The SSR render function must return a Response.");
      }

      await sendWebResponse(result, response, {
        head: request.method === "HEAD",
        cacheControl: "no-store",
      });
    })().catch((error: unknown) => handleError(error, response));
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

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  const serverClosed = new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server.closeAllConnections();
  await Promise.all([vite.close(), serverClosed]);
}

function handleShutdownSignal() {
  void shutdown().catch((error: unknown) => {
    console.error("Development server shutdown failed:", error);
    process.exitCode = 1;
  });
}

process.once("SIGINT", handleShutdownSignal);
process.once("SIGTERM", handleShutdownSignal);

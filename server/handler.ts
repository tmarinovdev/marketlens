import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { render } from "@/entry-server";

// The build places the browser HTML template beside the bundled handler.
// Only the template is cached; request-specific rendered HTML is never shared.
const template = readFileSync(
  new URL("./index.html", import.meta.url),
  "utf-8",
);
const outlet = "<!--ssr-outlet-->";

if (!template.includes(outlet)) {
  throw new Error("The production HTML template is missing its SSR outlet.");
}

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  response.setHeader("Cache-Control", "private, no-store");

  try {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (pathname !== "/") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Not found");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const html = template.replace(outlet, () => render());
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : html);
  } catch (error) {
    console.error("SSR request failed:", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(
      request.method === "HEAD" ? undefined : "Unable to render the page.",
    );
  }
}

import type { IncomingMessage, ServerResponse } from "node:http";
import { render } from "@/entry-server";
import { sendWebResponse, toWebRequest } from "./node-http.ts";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {
        Allow: "GET, HEAD",
        "Cache-Control": "private, no-store",
      });
      response.end();
      return;
    }

    const result = await render({ request: toWebRequest(request) });
    await sendWebResponse(result, response, {
      head: request.method === "HEAD",
      cacheControl: "private, no-store",
    });
  } catch (error) {
    console.error("SSR request failed:", error);
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    response.end(
      request.method === "HEAD" ? undefined : "Unable to render the page.",
    );
  }
}

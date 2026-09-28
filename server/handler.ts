import type { IncomingMessage, ServerResponse } from "node:http";
import { render } from "@/entry-server";
import { handleMarketApiRequest } from "./market-api.ts";
import { sendWebResponse, toWebRequest } from "./node-http.ts";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const webRequest = toWebRequest(request);
    const apiResponse = await handleMarketApiRequest(webRequest);

    if (apiResponse) {
      await sendWebResponse(apiResponse, response, {
        head: request.method === "HEAD",
      });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {
        Allow: "GET, HEAD",
        "Cache-Control": "private, no-store",
      });
      response.end();
      return;
    }

    const result = await render({ request: webRequest });
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

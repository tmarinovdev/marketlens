import type { IncomingMessage, ServerResponse } from "node:http";
import { handleInstrumentSyncCron } from "./cron/instrument-sync.ts";
import { sendWebResponse, toWebRequest } from "./node-http.ts";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const result = await handleInstrumentSyncCron(toWebRequest(request));
    await sendWebResponse(result, response, {
      head: false,
      cacheControl: "private, no-store",
    });
  } catch (error) {
    console.error("Cron request failed:", error);
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    response.end(JSON.stringify({ success: false }));
  }
}

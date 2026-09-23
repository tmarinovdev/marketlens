import {
  createRequestHandler,
  defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { createRouter } from "@/app/router";

export function render({ request }: { request: Request }): Promise<Response> {
  const handler = createRequestHandler({ request, createRouter });

  return handler(defaultRenderHandler);
}

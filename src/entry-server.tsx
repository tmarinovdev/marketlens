import {
  createRequestHandler,
  defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { createRouter } from "@/app/router";
import {
  createAuthRequest,
  handleAuthCallback,
} from "../server/auth/session.ts";

export async function render({
  request,
}: {
  request: Request;
}): Promise<Response> {
  if (new URL(request.url).pathname === "/auth/callback")
    return handleAuthCallback(request);
  // Anonymous requests remain fast and can render without runtime credentials.
  const hasAuthCookie = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(
    request.headers.get("Cookie") ?? "",
  );
  const auth = hasAuthCookie ? createAuthRequest(request) : null;
  const user = auth ? await auth.getUser() : null;
  const handler = createRequestHandler({
    request,
    createRouter: () => createRouter(user),
  });
  const response = await handler(defaultRenderHandler);
  return auth ? auth.applyHeaders(response) : response;
}

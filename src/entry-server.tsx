import {
  createRequestHandler,
  defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { createRouter } from "@/app/router";
import { hasAuthSessionCookie } from "@/features/auth/session-cookie";
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
  const auth = hasAuthSessionCookie(request)
    ? createAuthRequest(request)
    : null;
  const user = auth ? await auth.getUser() : null;
  const handler = createRequestHandler({
    request,
    createRouter: () =>
      createRouter(
        user,
        auth && user
          ? async () =>
              (
                await import("@/features/watchlist/api/owned-watchlist")
              ).readOwnedWatchlist(auth.client)
          : undefined,
      ),
  });
  const response = await handler(defaultRenderHandler);
  return auth ? auth.applyHeaders(response) : response;
}

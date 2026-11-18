export function hasAuthSessionCookie(request: Request) {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(
    request.headers.get("Cookie") ?? "",
  );
}

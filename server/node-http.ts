import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value?.split(",", 1)[0]?.trim();
}

function copyRequestHeaders(source: IncomingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}

export function toWebRequest(request: IncomingMessage): Request {
  const protocol = firstHeader(request.headers["x-forwarded-proto"]) ?? "http";
  const host =
    firstHeader(request.headers["x-forwarded-host"]) ??
    request.headers.host ??
    "localhost";
  const url = new URL(request.url ?? "/", `${protocol}://${host}`);

  return new Request(url, {
    method: request.method,
    headers: copyRequestHeaders(request.headers),
  });
}

export async function sendWebResponse(
  source: Response,
  target: ServerResponse,
  options: { head: boolean; cacheControl?: string },
) {
  source.headers.forEach((value, name) => {
    if (name !== "set-cookie") target.setHeader(name, value);
  });

  for (const cookie of source.headers.getSetCookie()) {
    target.appendHeader("Set-Cookie", cookie);
  }

  if (options.cacheControl) {
    target.setHeader("Cache-Control", options.cacheControl);
  }

  target.writeHead(source.status, source.statusText);
  if (options.head || !source.body) {
    target.end();
    return;
  }

  target.end(Buffer.from(await source.arrayBuffer()));
}

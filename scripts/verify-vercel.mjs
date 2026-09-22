import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";

const output = new URL("../.vercel/output/", import.meta.url);
const config = JSON.parse(
  await readFile(new URL("config.json", output), "utf8"),
);
assert.equal(config.version, 3);
await assert.rejects(access(new URL("static/index.html", output)), {
  code: "ENOENT",
});

const { default: handler } = await import(
  new URL("functions/ssr.func/index.mjs", output).href
);
const server = createServer(handler);
server.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const html = await response.text();
  assert.match(html, /<h1>MarketLens<\/h1>/);
  assert.doesNotMatch(html, /ssr-outlet|@react-refresh|\/src\/entry-client/);

  const script = html.match(/src="(\/assets\/[^"?#]+\.js)"/);
  assert.ok(script, "Rendered HTML must reference a built browser script");
  await access(new URL(`static${script[1]}`, output));

  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal((await fetch(`${url}/?example=1`)).status, 200);
  assert.equal((await fetch(`${url}/missing`)).status, 404);
  const post = await fetch(url, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  console.log(
    "Vercel artifact checks passed: SSR, assets, routing, HEAD, and methods.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

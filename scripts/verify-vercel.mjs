import assert from "node:assert/strict";
import { once } from "node:events";
import { access, cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const output = new URL("../.vercel/output/", import.meta.url);
const functionSource = fileURLToPath(new URL("functions/ssr.func/", output));
const config = JSON.parse(
  await readFile(new URL("config.json", output), "utf8"),
);
assert.equal(config.version, 3);
await assert.rejects(access(new URL("static/index.html", output)), {
  code: "ENOENT",
});

const serverChunks = await readdir(join(functionSource, "assets"));
assert.ok(serverChunks.length > 0, "The SSR function must contain its chunks");
assert.ok(
  serverChunks.every((file) => file.endsWith(".mjs")),
  "Every JavaScript server chunk must use an explicit ESM extension",
);

// Vercel runs the function from /var/task without the repository package.json.
// Import an isolated copy so local module resolution cannot hide ESM mistakes.
const isolatedFunction = await mkdtemp(
  join(tmpdir(), "marketlens-vercel-function-"),
);
await cp(functionSource, isolatedFunction, { recursive: true });
const { default: handler } = await import(
  pathToFileURL(join(isolatedFunction, "index.mjs")).href
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
  assert.match(html, /<h1\b[^>]*>MarketLens<\/h1>/);
  assert.doesNotMatch(html, /ssr-outlet|@react-refresh|\/src\/entry-client/);

  const fontPreload = html.match(
    /<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="font")(?=[^>]*\btype="font\/woff2")(?=[^>]*\bcrossorigin="anonymous")(?=[^>]*\bhref="(\/assets\/inter-latin-wght-normal\.woff2)")[^>]*>/,
  );
  assert.ok(fontPreload, "Rendered HTML must preload the Inter font");

  const stylesheetPreload = html.match(
    /<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="style")(?=[^>]*\bhref="(\/assets\/[^"?#]+\.css)")[^>]*>/,
  );
  assert.ok(
    stylesheetPreload,
    "Rendered HTML must preload the built stylesheet",
  );

  const stylesheet = html.match(
    /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(\/assets\/[^"?#]+\.css)")[^>]*>/,
  );
  assert.ok(stylesheet, "Rendered HTML must reference a built stylesheet");
  assert.equal(
    stylesheetPreload[1],
    stylesheet[1],
    "The preload and stylesheet links must use the same URL",
  );
  assert.ok(
    stylesheetPreload.index < stylesheet.index,
    "The stylesheet preload must appear before the stylesheet link",
  );
  assert.ok(
    fontPreload.index < stylesheet.index,
    "The font preload must appear before the stylesheet link",
  );
  await access(new URL(`static${fontPreload[1]}`, output));
  await access(new URL(`static${stylesheet[1]}`, output));
  assert.match(
    await readFile(new URL(`static${stylesheet[1]}`, output), "utf8"),
    /inter-latin-wght-normal\.woff2/,
  );
  await access(new URL("static/favicon.svg", output));
  await access(new URL("static/site.webmanifest", output));

  const script = html.match(/src="(\/assets\/[^"?#]+\.js)"/);
  assert.ok(script, "Rendered HTML must reference a built browser script");
  await access(new URL(`static${script[1]}`, output));

  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal((await fetch(`${url}/?example=1`)).status, 200);
  const about = await fetch(`${url}/about`);
  assert.equal(about.status, 200);
  const aboutHtml = await about.text();
  assert.match(aboutHtml, /<h1\b[^>]*>About MarketLens<\/h1>/);
  assert.match(aboutHtml, /data-query-source="server"/);
  assert.match(aboutHtml, /query-integration-check/);

  const missing = await fetch(`${url}/missing`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /<h1\b[^>]*>Page not found<\/h1>/);
  const post = await fetch(url, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  console.log(
    "Vercel artifact checks passed: SSR, scripts, styles, fonts, favicons, direct routes, router 404, HEAD, and methods.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(isolatedFunction, { recursive: true, force: true });
}

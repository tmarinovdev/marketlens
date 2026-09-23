import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, ".vercel/output");
const client = resolve(root, "dist/client");
const functionDirectory = join(output, "functions/ssr.func");

// Delete only generated deployment output, never .vercel project metadata.
if (relative(root, output).replaceAll("\\", "/") !== ".vercel/output") {
  throw new Error("Refusing to clean a path outside the deployment output.");
}
await rm(output, { recursive: true, force: true });

await build({
  root,
  ssr: { noExternal: true },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    ssr: "server/handler.ts",
    outDir: functionDirectory,
    target: "node24",
    rollupOptions: {
      output: { entryFileNames: "index.mjs" },
    },
  },
});

await mkdir(join(output, "static"), { recursive: true });
for (const entry of await readdir(client)) {
  // The unrendered HTML template must never be served as a static homepage.
  if (entry !== "index.html") {
    await cp(join(client, entry), join(output, "static", entry), {
      recursive: true,
    });
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

await writeJson(join(functionDirectory, ".vc-config.json"), {
  runtime: "nodejs24.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
});
await writeJson(join(output, "config.json"), {
  version: 3,
  routes: [{ handle: "filesystem" }, { src: "/.*", dest: "/ssr" }],
});

console.log("Vercel deployment output created in .vercel/output");

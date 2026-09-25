import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseServerEnv } from "../server/env.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const localEnvPath = resolve(root, ".env.local");

try {
  loadEnvFile(localEnvPath);
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    throw new Error(
      "Missing .env.local. Copy .env.example to .env.local and add your local credentials.",
      { cause: error },
    );
  }

  throw error;
}

parseServerEnv(process.env);
console.log("Local environment variables are valid.");

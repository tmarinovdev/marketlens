import { z } from "zod";

const ServerEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url().refine((value) => value.startsWith("https://"), {
    error: "VITE_SUPABASE_URL must use HTTPS",
  }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .startsWith("sb_publishable_"),
  SUPABASE_SECRET_KEY: z.string().trim().startsWith("sb_secret_"),
  ALPACA_API_KEY: z.string().trim().min(1),
  ALPACA_API_SECRET: z.string().trim().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function parseServerEnv(source: Record<string, unknown>): ServerEnv {
  const result = ServerEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid server environment:\n${z.prettifyError(result.error)}`,
      { cause: result.error },
    );
  }

  return result.data;
}

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);
  return cachedServerEnv;
}

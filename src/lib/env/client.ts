import { z } from "zod";

const ClientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url().refine((value) => value.startsWith("https://"), {
    error: "VITE_SUPABASE_URL must use HTTPS",
  }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .startsWith("sb_publishable_"),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

export function parseClientEnv(source: Record<string, unknown>): ClientEnv {
  const result = ClientEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid browser environment:\n${z.prettifyError(result.error)}`,
      { cause: result.error },
    );
  }

  return result.data;
}

let cachedClientEnv: ClientEnv | undefined;

export function getClientEnv(): ClientEnv {
  cachedClientEnv ??= parseClientEnv(import.meta.env);
  return cachedClientEnv;
}

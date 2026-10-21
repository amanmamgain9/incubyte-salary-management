// The only reader of `process.env` in src/ and scripts/. Script-safe: no `server-only`.
import { z } from "zod";

type EnvSource = Readonly<Record<string, string | undefined>>;

const appEnvSchema = z
  .object({
    DATABASE_URL: z.url(),
    APP_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    CURSOR_SECRET: z.string().min(32),
    DEMO_HR_EMAIL: z.email(),
    DEMO_HR_PASSWORD: z.string().min(12),
  })
  .refine((e) => e.CURSOR_SECRET !== e.BETTER_AUTH_SECRET, {
    path: ["CURSOR_SECRET"],
    message: "must differ from BETTER_AUTH_SECRET",
  });

const ownerEnvSchema = z.object({
  DATABASE_OWNER_URL: z.url(),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type OwnerEnv = z.infer<typeof ownerEnvSchema>;

function parseWith<T>(schema: z.ZodType<T>, source: EnvSource): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    // prettifyError reports paths and rule messages only, never the submitted values.
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function parseEnv(source: EnvSource): AppEnv {
  return parseWith(appEnvSchema, source);
}

/** Owner-role settings for migrate, reset, seed, verify and test setup only. */
export function ownerEnv(source: EnvSource = process.env): OwnerEnv {
  return parseWith(ownerEnvSchema, source);
}

export const env: AppEnv = parseEnv(process.env);

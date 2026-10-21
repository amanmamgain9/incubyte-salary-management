// The only reader of `process.env` in src/ and scripts/. Script-safe: no `server-only`.
// Importing this module never parses anything; each getter validates its own variables on first use.
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
  })
  // Compare request Origin headers with `appOrigin`, never with the raw APP_URL string.
  .transform((e) => ({ ...e, appOrigin: new URL(e.APP_URL).origin }));

const ownerEnvSchema = z.object({
  DATABASE_OWNER_URL: z.url(),
});

export type AppEnv = z.output<typeof appEnvSchema>;
export type OwnerEnv = z.output<typeof ownerEnvSchema>;

function parseWith<T>(schema: z.ZodType<T, EnvSource>, source: EnvSource): T {
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

export function parseOwnerEnv(source: EnvSource): OwnerEnv {
  return parseWith(ownerEnvSchema, source);
}

let appEnv: AppEnv | undefined;
let ownerOnlyEnv: OwnerEnv | undefined;

/** App settings (app role, auth, cursor, demo account). Parsed once, on first call. */
export function getEnv(): AppEnv {
  appEnv ??= parseEnv(process.env);
  return appEnv;
}

/** Owner-role settings for drizzle-kit, migrate, reset, seed, verify and test setup. Needs only DATABASE_OWNER_URL. */
export function ownerEnv(): OwnerEnv {
  ownerOnlyEnv ??= parseOwnerEnv(process.env);
  return ownerOnlyEnv;
}

import { z } from "zod";

export function parseBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") return defaultValue;
  return !["false", "0", "no", "off"].includes(value.toLowerCase());
}

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("EU Financial Reg Scanner <alerts@example.com>"),
  SLACK_WEBHOOK_URL: z.string().optional(),
  TEAMS_WEBHOOK_URL: z.string().optional(),
  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  HORIZON_ALLOW_DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => parseBooleanFlag(value, process.env.NODE_ENV !== "production")),
  HORIZON_EMAIL_DRY_RUN: z
    .string()
    .optional()
    .transform((value) => parseBooleanFlag(value, true)),
  HORIZON_BOT_USER_AGENT: z
    .string()
    .default("EUFinancialRegHorizonScanner/0.1 (+https://gunnercooke.com)"),
  HORIZON_AI_PROVIDER: z.string().default("stub"),
  HORIZON_AI_MODEL: z.string().default("stub-classifier-v0"),
});

let cachedEnv: z.infer<typeof EnvSchema> | null = null;

export function getEnv() {
  cachedEnv ??= EnvSchema.parse(process.env);
  return cachedEnv;
}

export function hasDatabaseUrl() {
  return Boolean(getEnv().DATABASE_URL);
}

export function isDemoModeAllowed() {
  return getEnv().HORIZON_ALLOW_DEMO_MODE;
}

export function assertDemoModeAllowed() {
  if (!isDemoModeAllowed()) {
    throw new Error("Demo fallback is disabled in production. Configure DATABASE_URL, auth, and required integrations.");
  }
}

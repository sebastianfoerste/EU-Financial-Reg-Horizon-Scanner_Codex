import { getEnv, hasDatabaseUrl, isDemoModeAllowed } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export type RuntimeCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "info" | "warning" | "error";
  message: string;
};

export function getRuntimeChecks(): RuntimeCheck[] {
  const env = getEnv();
  const isProduction = process.env.NODE_ENV === "production";

  return [
    {
      key: "database",
      label: "Database",
      ok: hasDatabaseUrl(),
      severity: isProduction ? "error" : "warning",
      message: hasDatabaseUrl() ? "Postgres configured." : "Using local demo data.",
    },
    {
      key: "auth",
      label: "Clerk",
      ok: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
      severity: isProduction ? "error" : "warning",
      message:
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY
          ? "Clerk configured."
          : "Auth is in demo mode.",
    },
    {
      key: "demo",
      label: "Demo fallback",
      ok: isDemoModeAllowed() || hasDatabaseUrl(),
      severity: isProduction ? "error" : "info",
      message: isDemoModeAllowed()
        ? "Demo fallback allowed for local work."
        : "Demo fallback disabled.",
    },
  ];
}

export async function getRuntimeChecksWithDatabaseProbe() {
  const checks = getRuntimeChecks();
  if (!hasDatabaseUrl()) return checks;

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return checks.map((check) =>
      check.key === "database"
        ? { ...check, ok: true, message: "Postgres configured and reachable." }
        : check,
    );
  } catch {
    return checks.map((check) =>
      check.key === "database"
        ? { ...check, ok: false, severity: "error" as const, message: "Postgres configured but unavailable." }
        : check,
    );
  }
}

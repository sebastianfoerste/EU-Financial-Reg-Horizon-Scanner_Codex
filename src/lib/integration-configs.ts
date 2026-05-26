import type { IntegrationProvider, IntegrationStatus, Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit";
import { assertOrganisationAccess, requireOperator } from "@/lib/authz";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export type IntegrationConfigView = {
  id: string;
  organisationId: string | null;
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  nonSecretConfigJson: Prisma.JsonValue | null;
  lastHealthCheckAt: string | null;
  lastHealthMessage: string | null;
};

export const integrationProviders: IntegrationProvider[] = ["RESEND", "SLACK", "MS_TEAMS", "HUBSPOT"];

const secretKeyPattern = /(secret|token|api[_-]?key|password|webhook|bearer|credential)/i;

function containsSecretLikeKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (secretKeyPattern.test(key)) return true;
    if (Array.isArray(nested)) return nested.some((item) => containsSecretLikeKey(item));
    return containsSecretLikeKey(nested);
  });
}

export function parseNonSecretIntegrationConfig(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Integration config must be a JSON object.");
  }
  if (containsSecretLikeKey(parsed)) {
    throw new Error("Integration config may not contain secret-like keys. Use environment variables for secrets.");
  }

  return parsed as Record<string, unknown>;
}

function demoConfig(provider: IntegrationProvider): IntegrationConfigView {
  return {
    id: `demo-${provider.toLowerCase()}`,
    organisationId: null,
    provider,
    displayName: provider,
    status: "DISABLED",
    nonSecretConfigJson: {
      managedIn: "demo",
    },
    lastHealthCheckAt: null,
    lastHealthMessage: "Demo mode. Secrets must be provided through environment variables.",
  };
}

export async function listIntegrationConfigs(organisationId?: string | null): Promise<IntegrationConfigView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return integrationProviders.map(demoConfig);
  }

  const configs = await getPrisma().integrationConfig.findMany({
    where: {
      OR: [{ organisationId: null }, organisationId ? { organisationId } : { id: "__none__" }],
    },
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
  });
  return integrationProviders.map((provider) => {
    const config =
      configs.find((item) => item.provider === provider && item.organisationId === organisationId) ??
      configs.find((item) => item.provider === provider && item.organisationId === null);
    return {
      id: config?.id ?? `missing-${provider.toLowerCase()}`,
      organisationId: config?.organisationId ?? null,
      provider,
      displayName: config?.displayName ?? provider,
      status: config?.status ?? "DISABLED",
      nonSecretConfigJson: config?.nonSecretConfigJson ?? {},
      lastHealthCheckAt: config?.lastHealthCheckAt?.toISOString() ?? null,
      lastHealthMessage: config?.lastHealthMessage ?? null,
    };
  });
}

export async function upsertIntegrationConfig(input: {
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  nonSecretConfigJson: Record<string, unknown>;
  organisationId?: string | null;
}) {
  const operator = await requireOperator();

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    await writeAuditLog({
      action: "integration_config.upsert",
      entityType: "integration_config",
      entityId: input.provider,
      actorUserId: operator.userId,
      organisationId: operator.organisationId,
      payloadJson: { mode: "demo", provider: input.provider, status: input.status },
    });
    return { ok: true, mode: "demo" as const };
  }

  const prisma = getPrisma();
  if (input.organisationId) {
    assertOrganisationAccess(operator, input.organisationId);
  }
  if (operator.mode === "clerk" && !operator.organisationId) {
    throw new Error("An active organisation is required before integration settings can be updated.");
  }
  const organisationId = operator.mode === "clerk" ? operator.organisationId : (input.organisationId ?? null);
  const existing = await prisma.integrationConfig.findFirst({
    where: {
      organisationId,
      provider: input.provider,
    },
  });
  const configData = {
    displayName: input.displayName,
    status: input.status,
    nonSecretConfigJson: input.nonSecretConfigJson as Prisma.InputJsonValue,
    lastHealthCheckAt: new Date(),
    lastHealthMessage: "Config reviewed by operator. Secret availability is checked from environment variables.",
  };
  const config = existing
    ? await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: configData,
      })
    : await prisma.integrationConfig.create({
        data: {
          organisationId,
          provider: input.provider,
          ...configData,
        },
      });

  await writeAuditLog({
    action: "integration_config.upsert",
    entityType: "integration_config",
    entityId: config.id,
    actorUserId: operator.userId,
    organisationId: organisationId ?? operator.organisationId,
    payloadJson: { provider: input.provider, status: input.status },
  });

  return { ok: true, mode: "database" as const, config };
}

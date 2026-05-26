import { Prisma } from "@prisma/client";

import { hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  organisationId?: string | null;
  payloadJson?: unknown;
};

export async function writeAuditLog(input: AuditInput) {
  if (!hasDatabaseUrl()) return null;

  const prisma = getPrisma();
  return prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId ?? null,
      organisationId: input.organisationId ?? null,
      payloadJson:
        input.payloadJson === undefined
          ? undefined
          : (input.payloadJson as Prisma.InputJsonValue),
    },
  });
}

export async function listAuditLogs(organisationId?: string) {
  if (!hasDatabaseUrl()) {
    return [
      {
        id: "audit-demo-review",
        action: "review.approved",
        entityType: "publication",
        entityId: "pub-esma-qa-2845",
        createdAt: new Date().toISOString(),
        actorUserId: null,
        organisationId: null,
        payloadJson: { mode: "demo" },
      },
    ];
  }

  const logs = await getPrisma().auditLog.findMany({
    where: organisationId ? { organisationId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));
}

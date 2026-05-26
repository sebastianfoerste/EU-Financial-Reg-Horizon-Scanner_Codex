import type { Prisma, SourceReuseStatus } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit";
import { requireInternalOperator } from "@/lib/authz";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getTierOneAdapters } from "@/lib/ingestion/adapters";
import { getPrisma } from "@/lib/prisma";

export type SourceDiligenceView = {
  id: string;
  sourceId: string;
  sourceCode: string;
  sourceName: string;
  baseUrl: string;
  reuseStatus: SourceReuseStatus;
  attributionRequirement: string | null;
  robotsNotes: string | null;
  allowedCadenceMin: number | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  ownerNotes: string | null;
  lastFetchedAt: string | null;
  lastRun: {
    status: string;
    finishedAt: string | null;
    message: string | null;
  } | null;
};

const defaultDiligence: Record<
  string,
  Omit<SourceDiligenceView, "id" | "sourceId" | "sourceCode" | "sourceName" | "baseUrl" | "lastFetchedAt" | "lastRun">
> = {
  bafin: {
    reuseStatus: "ATTRIBUTION_REQUIRED",
    attributionRequirement: "Attribute BaFin as source and preserve source links.",
    robotsNotes: "Use RSS discovery and polite conditional requests.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Commercial reuse diligence to be confirmed before paid launch.",
  },
  esma: {
    reuseStatus: "ATTRIBUTION_REQUIRED",
    attributionRequirement: "Attribute ESMA and link to original publication.",
    robotsNotes: "RSS and search pages only in MVP.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Q&A search page parsing needs periodic manual review.",
  },
  eba: {
    reuseStatus: "ATTRIBUTION_REQUIRED",
    attributionRequirement: "Attribute EBA and link to original publication.",
    robotsNotes: "RSS and Single Rulebook Q&A search page only.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Single Rulebook terms to be checked before broader reuse.",
  },
  esma_qna: {
    reuseStatus: "ATTRIBUTION_REQUIRED",
    attributionRequirement: "Attribute ESMA and link to original Q&A publication.",
    robotsNotes: "Parse the public Q&A search page with conservative conditional requests.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Q&A search-page parsing needs periodic manual review.",
  },
  eba_qna: {
    reuseStatus: "ATTRIBUTION_REQUIRED",
    attributionRequirement: "Attribute EBA and link to original Single Rulebook Q&A publication.",
    robotsNotes: "Parse the public Single Rulebook page with conservative conditional requests.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Single Rulebook page parsing needs periodic manual review.",
  },
  eurlex: {
    reuseStatus: "REUSE_PERMITTED",
    attributionRequirement: "Follow European Commission reuse attribution requirements.",
    robotsNotes: "Prefer Cellar and SPARQL endpoints over scraping.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-11-20T00:00:00.000Z",
    ownerNotes: "EUR-Lex is the lowest legal-risk source for full-text reuse.",
  },
  bundesbank: {
    reuseStatus: "REVIEW_REQUIRED",
    attributionRequirement: "Attribute Deutsche Bundesbank and link to source.",
    robotsNotes: "Use RSS discovery. Keep cadence conservative.",
    allowedCadenceMin: 60,
    lastReviewedAt: "2026-05-20T00:00:00.000Z",
    nextReviewAt: "2026-08-20T00:00:00.000Z",
    ownerNotes: "Reuse diligence needs a source-specific pass.",
  },
};

export function getDefaultSourceDiligence(sourceCode: string, pollIntervalMin: number) {
  return (
    defaultDiligence[sourceCode] ?? {
      reuseStatus: "UNKNOWN" as SourceReuseStatus,
      attributionRequirement: null,
      robotsNotes: null,
      allowedCadenceMin: pollIntervalMin,
      lastReviewedAt: null,
      nextReviewAt: null,
      ownerNotes: "Complete source diligence before live polling.",
    }
  );
}

type DbSourceWithDiligence = Prisma.SourceGetPayload<{
  include: {
    diligenceRecords: true;
    fetchRuns: {
      orderBy: { startedAt: "desc" };
      take: 1;
    };
  };
}>;

function mapDbSource(source: DbSourceWithDiligence): SourceDiligenceView {
  const record = source.diligenceRecords[0];
  const fallback = getDefaultSourceDiligence(source.code, source.pollIntervalMin);

  return {
    id: record?.id ?? `source-diligence-${source.code}`,
    sourceId: source.id,
    sourceCode: source.code,
    sourceName: source.displayName,
    baseUrl: source.baseUrl,
    reuseStatus: record?.reuseStatus ?? fallback.reuseStatus,
    attributionRequirement: record?.attributionRequirement ?? fallback.attributionRequirement,
    robotsNotes: record?.robotsNotes ?? fallback.robotsNotes,
    allowedCadenceMin: record?.allowedCadenceMin ?? fallback.allowedCadenceMin,
    lastReviewedAt: record?.lastReviewedAt?.toISOString() ?? fallback.lastReviewedAt,
    nextReviewAt: record?.nextReviewAt?.toISOString() ?? fallback.nextReviewAt,
    ownerNotes: record?.ownerNotes ?? fallback.ownerNotes,
    lastFetchedAt: source.lastFetchedAt?.toISOString() ?? null,
    lastRun: source.fetchRuns[0]
      ? {
          status: source.fetchRuns[0].status,
          finishedAt: source.fetchRuns[0].finishedAt?.toISOString() ?? null,
          message: source.fetchRuns[0].errorMessage,
        }
      : null,
  };
}

export async function listSourceDiligence(): Promise<SourceDiligenceView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return getTierOneAdapters().map((adapter) => {
      const fallback = getDefaultSourceDiligence(adapter.source.code, adapter.source.pollIntervalMin);
      return {
        id: `source-diligence-${adapter.source.code}`,
        sourceId: adapter.source.code,
        sourceCode: adapter.source.code,
        sourceName: adapter.source.displayName,
        baseUrl: adapter.source.baseUrl,
        ...fallback,
        lastFetchedAt: null,
        lastRun: null,
      };
    });
  }

  const sources = await getPrisma().source.findMany({
    orderBy: { code: "asc" },
    include: {
      diligenceRecords: true,
      fetchRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  return sources.map(mapDbSource);
}

export async function upsertSourceDiligence(input: {
  sourceId: string;
  reuseStatus: SourceReuseStatus;
  attributionRequirement?: string | null;
  robotsNotes?: string | null;
  allowedCadenceMin?: number | null;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
  ownerNotes?: string | null;
}) {
  const operator = await requireInternalOperator();

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    await writeAuditLog({
      action: "source_diligence.upsert",
      entityType: "source",
      entityId: input.sourceId,
      actorUserId: operator.userId,
      organisationId: operator.organisationId,
      payloadJson: { mode: "demo", reuseStatus: input.reuseStatus },
    });
    return { ok: true, mode: "demo" as const };
  }

  const record = await getPrisma().sourceDiligence.upsert({
    where: { sourceId: input.sourceId },
    update: {
      reuseStatus: input.reuseStatus,
      attributionRequirement: input.attributionRequirement,
      robotsNotes: input.robotsNotes,
      allowedCadenceMin: input.allowedCadenceMin,
      lastReviewedAt: input.lastReviewedAt,
      nextReviewAt: input.nextReviewAt,
      ownerNotes: input.ownerNotes,
    },
    create: {
      sourceId: input.sourceId,
      reuseStatus: input.reuseStatus,
      attributionRequirement: input.attributionRequirement,
      robotsNotes: input.robotsNotes,
      allowedCadenceMin: input.allowedCadenceMin,
      lastReviewedAt: input.lastReviewedAt,
      nextReviewAt: input.nextReviewAt,
      ownerNotes: input.ownerNotes,
    },
  });

  await writeAuditLog({
    action: "source_diligence.upsert",
    entityType: "source",
    entityId: input.sourceId,
    actorUserId: operator.userId,
    organisationId: operator.organisationId,
    payloadJson: { reuseStatus: input.reuseStatus, allowedCadenceMin: input.allowedCadenceMin },
  });

  return { ok: true, mode: "database" as const, record };
}

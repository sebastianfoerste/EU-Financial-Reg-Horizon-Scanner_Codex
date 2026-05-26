import { Prisma } from "@prisma/client";

import { fetchAndExtractDetail } from "@/lib/extraction";
import { sha256 } from "@/lib/hash";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getTierOneAdapters } from "@/lib/ingestion/adapters";
import { syncSources, syncTaxonomyConfig, upsertCanonicalPublication } from "@/lib/ingestion/store";
import type { CanonicalPublication, SourceAdapter, SourceCursor } from "@/lib/ingestion/types";
import { getPrisma } from "@/lib/prisma";
import { getDefaultSourceDiligence } from "@/lib/source-diligence";

function asInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

export type PollSourceResult = {
  sourceCode: string;
  seen: number;
  createdOrUpdated: number;
  skipped: number;
  status: "OK" | "PARTIAL" | "SKIPPED" | "FAILED";
  errorMessage?: string;
};

export function evaluateSourcePollingPolicy(input: {
  reuseStatus: string | null | undefined;
  sourceCadenceMin: number;
  allowedCadenceMin: number | null | undefined;
  lastFetchedAt?: Date | null;
  now?: Date;
}) {
  if (!["REUSE_PERMITTED", "ATTRIBUTION_REQUIRED"].includes(input.reuseStatus ?? "")) {
    return {
      allowed: false,
      reason: `Live polling is blocked while source reuse status is ${input.reuseStatus ?? "UNKNOWN"}.`,
    };
  }

  const cadenceMin = Math.max(input.sourceCadenceMin, input.allowedCadenceMin ?? 0);
  const now = input.now ?? new Date();
  if (input.lastFetchedAt && now.getTime() - input.lastFetchedAt.getTime() < cadenceMin * 60_000) {
    return {
      allowed: false,
      reason: `Live polling is not due before the approved ${cadenceMin}-minute cadence expires.`,
    };
  }

  return { allowed: true, reason: null };
}

async function enrichPublicationDetail(publication: CanonicalPublication): Promise<CanonicalPublication> {
  if (publication.bodyText.length > 800) return publication;

  try {
    const detail = await fetchAndExtractDetail(publication.sourceUrl);
    const bodyText = detail.text.length > publication.bodyText.length ? detail.text : publication.bodyText;
    const title = detail.title && detail.title.length > publication.title.length ? detail.title : publication.title;
    return {
      ...publication,
      title,
      bodyText,
      rawHash: sha256(`${title}\n${bodyText}`),
      hasAttachments: publication.hasAttachments || detail.attachments.length > 0,
      attachments: detail.attachments,
      sourceMetadataJson: {
        ...publication.sourceMetadataJson,
        detailExtraction: detail.sourceMetadataJson,
        attachmentCount: detail.attachments.length,
      },
    };
  } catch (error) {
    return {
      ...publication,
      sourceMetadataJson: {
        ...publication.sourceMetadataJson,
        detailExtractionError: error instanceof Error ? error.message : "Unknown extraction error",
      },
    };
  }
}

export async function pollSource(adapter: SourceAdapter): Promise<PollSourceResult> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    const diligence = getDefaultSourceDiligence(adapter.source.code, adapter.source.pollIntervalMin);
    const policy = evaluateSourcePollingPolicy({
      reuseStatus: diligence.reuseStatus,
      sourceCadenceMin: adapter.source.pollIntervalMin,
      allowedCadenceMin: diligence.allowedCadenceMin,
    });
    if (!policy.allowed) {
      return {
        sourceCode: adapter.source.code,
        seen: 0,
        createdOrUpdated: 0,
        skipped: 0,
        status: "SKIPPED",
        errorMessage: policy.reason ?? undefined,
      };
    }
    const result = await adapter.fetch();
    return {
      sourceCode: adapter.source.code,
      seen: result.publications.length,
      createdOrUpdated: result.publications.length,
      skipped: 0,
      status: "OK",
    };
  }

  const prisma = getPrisma();
  await syncTaxonomyConfig();
  await syncSources([adapter]);
  const source = await prisma.source.findUniqueOrThrow({
    where: { code: adapter.source.code },
    include: { diligenceRecords: true },
  });
  const run = await prisma.fetchRun.create({
    data: { sourceId: source.id },
  });
  const diligence = source.diligenceRecords[0];
  const policy = evaluateSourcePollingPolicy({
    reuseStatus: diligence?.reuseStatus,
    sourceCadenceMin: source.pollIntervalMin,
    allowedCadenceMin: diligence?.allowedCadenceMin,
    lastFetchedAt: source.lastFetchedAt,
  });
  if (!policy.allowed) {
    await Promise.all([
      prisma.fetchRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: "SKIPPED",
          errorMessage: policy.reason,
        },
      }),
      prisma.source.update({
        where: { id: source.id },
        data: {
          adapterStatusJson: asInputJson({
            skipped: true,
            policy: "source_diligence",
            reason: policy.reason,
          }),
        },
      }),
    ]);
    return {
      sourceCode: adapter.source.code,
      seen: 0,
      createdOrUpdated: 0,
      skipped: 0,
      status: "SKIPPED",
      errorMessage: policy.reason ?? undefined,
    };
  }

  try {
    const cursor: SourceCursor = {
      etag: source.etag,
      lastModified: source.lastModified,
      cursorJson: source.cursorJson,
    };
    const result = await adapter.fetch(cursor);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const publication of result.publications) {
      const enrichedPublication = await enrichPublicationDetail(publication);
      const saved = await upsertCanonicalPublication(enrichedPublication);
      if (saved.action === "skipped") skipped += 1;
      else if (saved.action === "version") updated += 1;
      else created += 1;
    }

    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        etag: result.state?.etag,
        lastModified: result.state?.lastModified,
        cursorJson: asInputJson(result.state?.cursorJson),
        adapterStatusJson: asInputJson(result.status),
      },
    });

    await prisma.fetchRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "OK",
        publicationsSeen: result.publications.length,
        publicationsNew: created,
        publicationsUpdated: updated,
      },
    });

    return {
      sourceCode: adapter.source.code,
      seen: result.publications.length,
      createdOrUpdated: created + updated,
      skipped,
      status: "OK",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown ingestion error";
    await prisma.fetchRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "FAILED",
        errorMessage,
      },
    });
    return {
      sourceCode: adapter.source.code,
      seen: 0,
      createdOrUpdated: 0,
      skipped: 0,
      status: "FAILED",
      errorMessage,
    };
  }
}

export async function pollTierOneSources() {
  const adapters = getTierOneAdapters();
  if (hasDatabaseUrl()) {
    await syncSources(adapters);
  }

  const results: PollSourceResult[] = [];
  for (const adapter of adapters) {
    results.push(await pollSource(adapter));
  }

  return results;
}

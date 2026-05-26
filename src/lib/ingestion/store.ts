import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Prisma } from "@prisma/client";

import { classifyPublicationStub } from "@/lib/ai/classification";
import { buildTextDiff, summarizeDiff } from "@/lib/diff";
import { hasDatabaseUrl } from "@/lib/env";
import { scoreStoredPublicationForAllProductMaps } from "@/lib/impact-recalculation";
import type { CanonicalPublication, SourceAdapter } from "@/lib/ingestion/types";
import { buildParagraphDiffs, createParagraphSnapshots } from "@/lib/paragraph-diff";
import { getPrisma } from "@/lib/prisma";
import { matchGovernedServiceOfferingIds } from "@/lib/service-offerings";
import { loadTaxonomy } from "@/lib/taxonomy";

function asInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

const serviceRuleAxisMap = {
  regulation_family: "REGULATION_FAMILY",
  activity: "ACTIVITY",
  licence_type: "LICENCE_TYPE",
  topic: "TOPIC",
  jurisdiction: "JURISDICTION",
} as const;

export type VersionDecision = {
  action: "create" | "skip" | "version";
  versionNumber: number;
  diffFromPrevious: string | null;
  changeSummary: string | null;
};

export function decideVersionChange(input: {
  previousRawHash?: string | null;
  previousBodyText?: string | null;
  nextRawHash: string;
  nextBodyText: string;
  previousVersionCount: number;
}): VersionDecision {
  if (!input.previousRawHash) {
    return {
      action: "create",
      versionNumber: 1,
      diffFromPrevious: null,
      changeSummary: "Initial captured version.",
    };
  }

  if (input.previousRawHash === input.nextRawHash) {
    return {
      action: "skip",
      versionNumber: input.previousVersionCount,
      diffFromPrevious: null,
      changeSummary: null,
    };
  }

  return {
    action: "version",
    versionNumber: input.previousVersionCount + 1,
    diffFromPrevious: buildTextDiff(input.previousBodyText ?? "", input.nextBodyText),
    changeSummary: summarizeDiff(input.previousBodyText ?? "", input.nextBodyText),
  };
}

export async function syncTaxonomyConfig() {
  if (!hasDatabaseUrl()) return null;

  const prisma = getPrisma();
  const taxonomy = loadTaxonomy();
  const yamlContent = readFileSync(resolve(process.cwd(), "config/taxonomy.yaml"), "utf8");

  const taxonomyVersion = await prisma.taxonomyVersion.upsert({
    where: { version: taxonomy.version },
    update: { yamlContent },
    create: { version: taxonomy.version, yamlContent },
  });

  for (const offering of taxonomy.service_offerings) {
    await prisma.serviceOffering.upsert({
      where: { id: offering.id },
      update: {},
      create: {
        id: offering.id,
        name: offering.name,
        description: `Triggered by taxonomy rules for ${offering.id}.`,
        priceIndication: offering.price_indication,
      },
    });

    for (const [axis, values] of Object.entries(offering.triggers)) {
      const ruleId = `${offering.id}_${axis}`;
      await prisma.serviceOfferingRule.upsert({
        where: { id: ruleId },
        update: {},
        create: {
          id: ruleId,
          serviceOfferingId: offering.id,
          axis: serviceRuleAxisMap[axis as keyof typeof serviceRuleAxisMap],
          values,
          isActive: true,
        },
      });
    }
  }

  return taxonomyVersion;
}

export async function syncSources(adapters: SourceAdapter[]) {
  if (!hasDatabaseUrl()) return [];

  const prisma = getPrisma();
  return Promise.all(
    adapters.map((adapter) =>
      prisma.source.upsert({
        where: { code: adapter.source.code },
        update: {
          displayName: adapter.source.displayName,
          jurisdictionCode: adapter.source.jurisdictionCode,
          baseUrl: adapter.source.baseUrl,
          feedType: adapter.source.feedType,
          feedUrl: adapter.source.feedUrl,
          pollIntervalMin: adapter.source.pollIntervalMin,
          language: adapter.source.language,
          notes: adapter.source.notes,
          isActive: true,
        },
        create: {
          code: adapter.source.code,
          displayName: adapter.source.displayName,
          jurisdictionCode: adapter.source.jurisdictionCode,
          baseUrl: adapter.source.baseUrl,
          feedType: adapter.source.feedType,
          feedUrl: adapter.source.feedUrl,
          pollIntervalMin: adapter.source.pollIntervalMin,
          language: adapter.source.language,
          notes: adapter.source.notes,
        },
      }),
    ),
  );
}

export async function upsertCanonicalPublication(publication: CanonicalPublication) {
  if (!hasDatabaseUrl()) {
    return { action: "demo", publicationId: publication.externalId };
  }

  const prisma = getPrisma();
  const taxonomyVersion = await syncTaxonomyConfig();
  const source = await prisma.source.findUniqueOrThrow({
    where: { code: publication.sourceCode },
  });
  const existing = await prisma.publication.findFirst({
    where: {
      sourceId: source.id,
      OR: [{ externalId: publication.externalId }, { sourceUrl: publication.sourceUrl }],
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  const decision = decideVersionChange({
    previousRawHash: existing?.rawHash,
    previousBodyText: existing?.bodyText,
    nextRawHash: publication.rawHash,
    nextBodyText: publication.bodyText,
    previousVersionCount: existing?.versions.length ?? 0,
  });

  if (existing && decision.action === "skip") {
    return { action: "skipped", publicationId: existing.id };
  }

  const saved = existing
    ? await prisma.publication.update({
        where: { id: existing.id },
        data: {
          title: publication.title,
          publishedAt: publication.publishedAt,
          fetchedAt: publication.fetchedAt,
          language: publication.language,
          publicationType: publication.publicationType,
          rawHash: publication.rawHash,
          bodyText: publication.bodyText,
          bodyMarkdown: publication.bodyMarkdown,
          canonicalUrl: publication.canonicalUrl,
          sourceMetadataJson: asInputJson(publication.sourceMetadataJson),
          hasAttachments: publication.hasAttachments ?? false,
        },
      })
    : await prisma.publication.create({
        data: {
          sourceId: source.id,
          sourceUrl: publication.sourceUrl,
          canonicalUrl: publication.canonicalUrl,
          externalId: publication.externalId,
          title: publication.title,
          publishedAt: publication.publishedAt,
          fetchedAt: publication.fetchedAt,
          language: publication.language,
          publicationType: publication.publicationType,
          rawHash: publication.rawHash,
          bodyText: publication.bodyText,
          bodyMarkdown: publication.bodyMarkdown,
          sourceMetadataJson: asInputJson(publication.sourceMetadataJson),
          hasAttachments: publication.hasAttachments ?? false,
        },
      });

  const publicationVersion = await prisma.publicationVersion.create({
    data: {
      publicationId: saved.id,
      versionNumber: decision.versionNumber,
      rawHash: publication.rawHash,
      bodyText: publication.bodyText,
      diffFromPrevious: decision.diffFromPrevious,
      changeSummary: decision.changeSummary,
    },
  });

  if (publication.attachments) {
    await prisma.attachment.deleteMany({ where: { publicationId: saved.id } });
    if (publication.attachments.length) {
      await prisma.attachment.createMany({
        data: publication.attachments.map((attachment) => ({
          publicationId: saved.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storageUrl: attachment.sourceUrl,
          sourceUrl: attachment.sourceUrl,
          sizeBytes: attachment.sizeBytes,
          extractedText: attachment.extractedText,
          extractionStatus: attachment.extractionStatus,
          ocrRequired: attachment.ocrRequired,
        })),
      });
    }
  }

  const paragraphSnapshots = createParagraphSnapshots(publication.bodyText);
  if (paragraphSnapshots.length) {
    await prisma.publicationParagraph.createMany({
      data: paragraphSnapshots.map((paragraph) => ({
        publicationId: saved.id,
        publicationVersionId: publicationVersion.id,
        paragraphIndex: paragraph.paragraphIndex,
        contentHash: paragraph.contentHash,
        bodyText: paragraph.bodyText,
      })),
      skipDuplicates: true,
    });
  }

  const paragraphDiffs = buildParagraphDiffs(existing?.bodyText, publication.bodyText);
  if (paragraphDiffs.length) {
    await prisma.paragraphDiff.createMany({
      data: paragraphDiffs.map((diff) => ({
        publicationId: saved.id,
        publicationVersionId: publicationVersion.id,
        paragraphIndex: diff.paragraphIndex,
        changeType: diff.changeType,
        beforeHash: diff.beforeHash,
        afterHash: diff.afterHash,
        beforeText: diff.beforeText,
        afterText: diff.afterText,
        unifiedDiff: diff.unifiedDiff,
        semanticSummary: diff.semanticSummary,
      })),
    });
  }

  if (taxonomyVersion) {
    const classification = classifyPublicationStub({
      title: publication.title,
      bodyText: publication.bodyText,
      sourceCode: publication.sourceCode,
      language: publication.language,
      publicationType: publication.publicationType,
    });
    const serviceOfferingIds = await matchGovernedServiceOfferingIds(classification);

    await prisma.classification.upsert({
      where: {
        publicationId_taxonomyVersionId: {
          publicationId: saved.id,
          taxonomyVersionId: taxonomyVersion.id,
        },
      },
      update: {
        regulationFamilies: classification.regulationFamilies,
        subTopics: classification.subTopics,
        activities: classification.activities,
        licenceTypes: classification.licenceTypes,
        topicPaths: classification.topicPaths,
        jurisdictions: classification.jurisdictions,
        summary: classification.summary,
        whatChanged: classification.whatChanged,
        whoIsAffected: classification.whoIsAffected,
        deadline: classification.deadline ? new Date(classification.deadline) : null,
        recommendedAction: classification.recommendedAction,
        serviceOfferingIds,
        classifierModel: classification.classifierModel,
        classifierVersion: classification.classifierVersion,
        confidence: classification.confidence,
      },
      create: {
        publicationId: saved.id,
        taxonomyVersionId: taxonomyVersion.id,
        regulationFamilies: classification.regulationFamilies,
        subTopics: classification.subTopics,
        activities: classification.activities,
        licenceTypes: classification.licenceTypes,
        topicPaths: classification.topicPaths,
        jurisdictions: classification.jurisdictions,
        summary: classification.summary,
        whatChanged: classification.whatChanged,
        whoIsAffected: classification.whoIsAffected,
        deadline: classification.deadline ? new Date(classification.deadline) : null,
        recommendedAction: classification.recommendedAction,
        serviceOfferingIds,
        classifierModel: classification.classifierModel,
        classifierVersion: classification.classifierVersion,
        confidence: classification.confidence,
      },
    });

    await scoreStoredPublicationForAllProductMaps(saved.id);
  }

  await prisma.reviewQueueItem.upsert({
    where: { publicationId: saved.id },
    update: {
      status: "PENDING",
      priority: publication.publicationType.includes("q_and_a") ? 75 : 50,
    },
    create: {
      publicationId: saved.id,
      status: "PENDING",
      priority: publication.publicationType.includes("q_and_a") ? 75 : 50,
    },
  });

  return { action: decision.action, publicationId: saved.id };
}

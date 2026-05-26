import type { Prisma, ReviewStatus } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit";
import { getReviewerName, requireInternalOperator } from "@/lib/authz";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { scoreStoredPublicationForAllProductMaps } from "@/lib/impact-recalculation";
import { mockPublications, type PublicationListItem } from "@/lib/mock-data";
import { getPrisma } from "@/lib/prisma";
import { assertTaxonomyValue, loadTaxonomy } from "@/lib/taxonomy";

export type ReviewDecisionInput = {
  publicationId: string;
  status: ReviewStatus;
  reason: string;
  reviewerName: string;
  corrections?: {
    regulationFamilies?: string[];
    activities?: string[];
    licenceTypes?: string[];
    topicPaths?: string[];
    jurisdictions?: string[];
    summary?: string;
    whatChanged?: string;
    whoIsAffected?: string;
    deadline?: string | null;
    recommendedAction?: string;
    serviceOfferingIds?: string[];
    confidence?: number;
  };
};

export type ClassificationRevisionView = {
  id: string;
  beforeJson: unknown;
  afterJson: unknown;
  reason: string;
  reviewerName: string;
  createdAt: string;
};

export type ReviewQueueView = {
  id: string;
  publicationId: string;
  status: ReviewStatus;
  priority: number;
  reviewerName: string | null;
  decisionReason: string | null;
  updatedAt: string;
  publication: PublicationListItem;
  revisions: ClassificationRevisionView[];
};

export function transitionReviewStatus(current: ReviewStatus, next: ReviewStatus) {
  if (current === "ARCHIVED") {
    throw new Error("Archived review items cannot be changed.");
  }
  if (current === "FALSE_POSITIVE" && next === "APPROVED") {
    throw new Error("False positives must be returned to IN_REVIEW before approval.");
  }
  return next;
}

function serializeClassification(classification: {
  regulationFamilies: string[];
  subTopics: string[];
  activities: string[];
  licenceTypes: string[];
  topicPaths: string[];
  jurisdictions: string[];
  summary: string;
  whatChanged: string | null;
  whoIsAffected: string | null;
  deadline: Date | null;
  recommendedAction: string | null;
  serviceOfferingIds: string[];
  confidence: number;
  classifierModel: string;
  classifierVersion: string;
}) {
  return {
    regulationFamilies: classification.regulationFamilies,
    subTopics: classification.subTopics,
    activities: classification.activities,
    licenceTypes: classification.licenceTypes,
    topicPaths: classification.topicPaths,
    jurisdictions: classification.jurisdictions,
    summary: classification.summary,
    whatChanged: classification.whatChanged,
    whoIsAffected: classification.whoIsAffected,
    deadline: classification.deadline?.toISOString() ?? null,
    recommendedAction: classification.recommendedAction,
    serviceOfferingIds: classification.serviceOfferingIds,
    confidence: classification.confidence,
    classifierModel: classification.classifierModel,
    classifierVersion: classification.classifierVersion,
  };
}

function mapReviewPublication(publication: {
  id: string;
  title: string;
  sourceUrl: string;
  publicationType: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  language: string;
  bodyText: string;
  rawHash: string;
  source: { code: string; displayName: string };
  classifications: Array<{
    regulationFamilies: string[];
    activities: string[];
    licenceTypes: string[];
    topicPaths: string[];
    jurisdictions: string[];
    confidence: number;
    summary: string;
    whatChanged: string | null;
    whoIsAffected: string | null;
    recommendedAction: string | null;
    serviceOfferingIds: string[];
    deadline: Date | null;
  }>;
  impactScores: Array<{
    bucket: PublicationListItem["impactBucket"];
    score: number;
    rationale: string;
    matchedLicences: string[];
    matchedActivities: string[];
    matchedJurisdictions: string[];
    ruleVersion: string;
  }>;
}): PublicationListItem {
  const classification = publication.classifications[0];
  const impact = publication.impactScores[0];

  return {
    id: publication.id,
    title: publication.title,
    sourceCode: publication.source.code,
    sourceName: publication.source.displayName,
    sourceUrl: publication.sourceUrl,
    publicationType: publication.publicationType,
    publishedAt: publication.publishedAt?.toISOString() ?? null,
    fetchedAt: publication.fetchedAt.toISOString(),
    language: publication.language,
    bodyText: publication.bodyText,
    tags: {
      regulationFamilies: classification?.regulationFamilies ?? [],
      activities: classification?.activities ?? [],
      licenceTypes: classification?.licenceTypes ?? [],
      topicPaths: classification?.topicPaths ?? [],
      jurisdictions: classification?.jurisdictions ?? [],
    },
    confidence: classification?.confidence ?? 0,
    deadline: classification?.deadline?.toISOString() ?? null,
    impactBucket: impact?.bucket ?? "NONE",
    impactScore: impact?.score ?? 0,
    summary: classification?.summary ?? "Classification has not run yet.",
    whatChanged: classification?.whatChanged ?? "No change summary is available.",
    whoIsAffected: classification?.whoIsAffected ?? "Affected actor mapping is pending.",
    recommendedAction: classification?.recommendedAction ?? "Review the source publication.",
    serviceOfferingIds: classification?.serviceOfferingIds ?? [],
    rawHash: publication.rawHash,
    scoreRationale: impact?.rationale ?? "No stored impact rationale yet.",
    matchedLicences: impact?.matchedLicences ?? [],
    matchedActivities: impact?.matchedActivities ?? [],
    matchedJurisdictions: impact?.matchedJurisdictions ?? [],
    matchedTopics: [],
    scoringRuleVersion: impact?.ruleVersion ?? "unscored",
  };
}

export function validateClassificationCorrections(
  corrections: NonNullable<ReviewDecisionInput["corrections"]>,
) {
  corrections.regulationFamilies?.forEach((value) => assertTaxonomyValue("regulation_family", value));
  corrections.activities?.forEach((value) => assertTaxonomyValue("activity", value));
  corrections.licenceTypes?.forEach((value) => assertTaxonomyValue("licence_type", value));
  corrections.topicPaths?.forEach((value) => assertTaxonomyValue("topic", value));
  corrections.jurisdictions?.forEach((value) => assertTaxonomyValue("jurisdiction", value));

  const offeringIds = new Set(loadTaxonomy().service_offerings.map((offering) => offering.id));
  corrections.serviceOfferingIds?.forEach((value) => {
    if (!offeringIds.has(value)) throw new Error(`Unknown service offering: ${value}`);
  });

  if (corrections.confidence !== undefined && (corrections.confidence < 0 || corrections.confidence > 1)) {
    throw new Error("Confidence must be between 0 and 1.");
  }

  return corrections;
}

export async function listReviewQueue(organisationId?: string) {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return mockPublications.map((publication, index) => ({
      id: `review-${publication.id}`,
      publicationId: publication.id,
      status: (index === 0 ? "PENDING" : "IN_REVIEW") as ReviewStatus,
      priority: publication.impactScore,
      reviewerName: null,
      decisionReason: null,
      updatedAt: publication.fetchedAt,
      publication,
      revisions: [],
    })) satisfies ReviewQueueView[];
  }

  const prisma = getPrisma();
  const items = await prisma.reviewQueueItem.findMany({
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
    include: {
      publication: {
        include: {
          source: true,
          classifications: { orderBy: { createdAt: "desc" }, take: 1 },
          impactScores: {
            where: organisationId ? { organisationId } : undefined,
            orderBy: { scoredAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return items.map((item) => ({
    id: item.id,
    publicationId: item.publicationId,
    status: item.status,
    priority: item.priority,
    reviewerName: item.reviewerName,
    decisionReason: item.decisionReason,
    updatedAt: item.updatedAt.toISOString(),
    publication: mapReviewPublication(item.publication),
    revisions: [],
  })) satisfies ReviewQueueView[];
}

export async function getReviewItem(publicationId: string, organisationId?: string) {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    const publication = mockPublications.find((item) => item.id === publicationId);
    if (!publication) return null;
    return {
      id: `review-${publication.id}`,
      publicationId: publication.id,
      status: "PENDING" as ReviewStatus,
      priority: publication.impactScore,
      reviewerName: null,
      decisionReason: null,
      updatedAt: publication.fetchedAt,
      publication,
      revisions: [],
    };
  }

  const prisma = getPrisma();
  const item = await prisma.reviewQueueItem.findFirst({
    where: {
      publication: {
        OR: [{ id: publicationId }, { externalId: publicationId }],
      },
    },
    include: {
      publication: {
        include: {
          source: true,
          classifications: { orderBy: { createdAt: "desc" }, take: 1 },
          impactScores: {
            where: organisationId ? { organisationId } : undefined,
            orderBy: { scoredAt: "desc" },
            take: 1,
          },
          classificationRevisions: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!item) return null;

  return {
    id: item.id,
    publicationId: item.publicationId,
    status: item.status,
    priority: item.priority,
    reviewerName: item.reviewerName,
    decisionReason: item.decisionReason,
    updatedAt: item.updatedAt.toISOString(),
    publication: mapReviewPublication(item.publication),
    revisions: item.publication.classificationRevisions.map((revision) => ({
      id: revision.id,
      beforeJson: revision.beforeJson,
      afterJson: revision.afterJson,
      reason: revision.reason,
      reviewerName: revision.reviewerName,
      createdAt: revision.createdAt.toISOString(),
    })),
  } satisfies ReviewQueueView;
}

export async function decideReviewItem(input: ReviewDecisionInput) {
  const operator = await requireInternalOperator();
  const reviewerName = getReviewerName(operator, input.reviewerName);
  const corrections = input.corrections ? validateClassificationCorrections(input.corrections) : undefined;

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    await writeAuditLog({
      action: `review.${input.status.toLowerCase()}`,
      entityType: "publication",
      entityId: input.publicationId,
      actorUserId: operator.userId,
      organisationId: operator.organisationId,
      payloadJson: { mode: "demo", reason: input.reason, reviewerName },
    });
    return { ok: true, mode: "demo" as const };
  }

  const prisma = getPrisma();
  const publication = await prisma.publication.findFirst({
    where: { OR: [{ id: input.publicationId }, { externalId: input.publicationId }] },
    select: { id: true },
  });
  if (!publication) {
    throw new Error("Publication was not found for review.");
  }
  const publicationId = publication.id;
  const existing = await prisma.reviewQueueItem.findUnique({
    where: { publicationId },
  });
  const currentStatus = existing?.status ?? "PENDING";
  const nextStatus = transitionReviewStatus(currentStatus, input.status);
  const classification = await prisma.classification.findFirst({
    where: { publicationId },
    orderBy: { createdAt: "desc" },
  });

  if (classification && corrections) {
    const beforeJson = serializeClassification(classification);
    const afterJson = {
      ...beforeJson,
      ...Object.fromEntries(
        Object.entries(corrections).filter(([, value]) => value !== undefined && value !== ""),
      ),
    };

    await prisma.classificationRevision.create({
      data: {
        publicationId,
        classificationId: classification.id,
        beforeJson: beforeJson as Prisma.InputJsonValue,
        afterJson: afterJson as Prisma.InputJsonValue,
        reason: input.reason,
        reviewerName,
      },
    });

    await prisma.classification.update({
      where: { id: classification.id },
      data: {
        regulationFamilies: afterJson.regulationFamilies,
        activities: afterJson.activities,
        licenceTypes: afterJson.licenceTypes,
        topicPaths: afterJson.topicPaths,
        jurisdictions: afterJson.jurisdictions,
        summary: afterJson.summary,
        whatChanged: afterJson.whatChanged,
        whoIsAffected: afterJson.whoIsAffected,
        deadline: afterJson.deadline ? new Date(afterJson.deadline) : null,
        recommendedAction: afterJson.recommendedAction,
        serviceOfferingIds: afterJson.serviceOfferingIds,
        confidence: afterJson.confidence,
        reviewedByHuman: true,
        reviewedById: operator.userId,
      },
    });

    await scoreStoredPublicationForAllProductMaps(publicationId);
    await prisma.alert.updateMany({
      where: {
        publicationId,
        status: { in: ["DRAFT", "APPROVED", "BLOCKED_BY_CONFIG", "FAILED"] },
      },
      data: {
        status: "SKIPPED",
        errorMessage: "Classification was revised. Generate a new reviewed alert draft.",
      },
    });
  } else if (classification) {
    await prisma.classification.update({
      where: { id: classification.id },
      data: {
        reviewedByHuman: true,
        reviewedById: operator.userId,
      },
    });
  }

  const item = await prisma.reviewQueueItem.upsert({
    where: { publicationId },
    update: {
      status: nextStatus,
      reviewerName,
      decisionReason: input.reason,
      decidedAt: ["APPROVED", "FALSE_POSITIVE", "ARCHIVED"].includes(nextStatus) ? new Date() : null,
    },
    create: {
      publicationId,
      status: nextStatus,
      reviewerName,
      decisionReason: input.reason,
      decidedAt: ["APPROVED", "FALSE_POSITIVE", "ARCHIVED"].includes(nextStatus) ? new Date() : null,
    },
  });

  await writeAuditLog({
    action: `review.${nextStatus.toLowerCase()}`,
    entityType: "publication",
    entityId: publicationId,
    actorUserId: operator.userId,
    organisationId: operator.organisationId,
    payloadJson: { reason: input.reason, reviewerName },
  });

  return { ok: true, mode: "database" as const, item };
}

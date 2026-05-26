import { Prisma } from "@prisma/client";

import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import {
  mockParagraphDiffs,
  mockPublications,
  mockVersions,
  type ParagraphDiffView,
  type PublicationListItem,
  type PublicationVersionView,
} from "@/lib/mock-data";

export type PublicationFilters = {
  source?: string;
  type?: string;
  tag?: string;
  query?: string;
  bucket?: string;
  from?: string;
  to?: string;
};

type DbPublication = Prisma.PublicationGetPayload<{
  include: {
    source: true;
    classifications: {
      orderBy: { createdAt: "desc" };
      take: 1;
    };
    impactScores: {
      orderBy: { scoredAt: "desc" };
      take: 1;
    };
  };
}>;

function includesFilter(publication: PublicationListItem, filters: PublicationFilters) {
  if (filters.source && publication.sourceCode !== filters.source) return false;
  if (filters.type && publication.publicationType !== filters.type) return false;
  if (filters.tag) {
    const allTags = [
      ...publication.tags.regulationFamilies,
      ...publication.tags.activities,
      ...publication.tags.licenceTypes,
      ...publication.tags.topicPaths,
      ...publication.tags.jurisdictions,
    ];
    if (!allTags.includes(filters.tag)) return false;
  }
  if (filters.query) {
    const haystack = `${publication.title} ${publication.summary} ${publication.bodyText}`.toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  if (filters.bucket) {
    if (filters.bucket === "HIGH" && !["CRITICAL", "HIGH"].includes(publication.impactBucket)) return false;
    if (filters.bucket !== "HIGH" && publication.impactBucket !== filters.bucket) return false;
  }
  if (filters.from) {
    const published = publication.publishedAt ? new Date(publication.publishedAt).getTime() : 0;
    if (published && published < new Date(filters.from).getTime()) return false;
  }
  if (filters.to) {
    const published = publication.publishedAt ? new Date(publication.publishedAt).getTime() : 0;
    if (published && published > new Date(filters.to).getTime()) return false;
  }
  return true;
}

function mapDbPublication(publication: DbPublication): PublicationListItem {
  const classification = publication.classifications[0];
  const impactScore = publication.impactScores[0];

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
    impactBucket: impactScore?.bucket ?? "NONE",
    impactScore: impactScore?.score ?? 0,
    summary: classification?.summary ?? "Classification has not run yet.",
    whatChanged: classification?.whatChanged ?? "Diff pipeline has not produced a change summary yet.",
    whoIsAffected: classification?.whoIsAffected ?? "Affected entity mapping is pending.",
    recommendedAction: classification?.recommendedAction ?? "Review the source publication.",
    serviceOfferingIds: classification?.serviceOfferingIds ?? [],
    rawHash: publication.rawHash,
    scoreRationale: impactScore?.rationale ?? "No stored impact rationale yet.",
    matchedLicences: impactScore?.matchedLicences ?? [],
    matchedActivities: impactScore?.matchedActivities ?? [],
    matchedJurisdictions: impactScore?.matchedJurisdictions ?? [],
    matchedTopics: [],
    scoringRuleVersion: impactScore?.ruleVersion ?? "unscored",
  };
}

export async function listPublications(filters: PublicationFilters = {}, organisationId?: string) {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return mockPublications.filter((publication) => includesFilter(publication, filters));
  }

  const prisma = getPrisma();
  const publications = await prisma.publication.findMany({
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    include: {
      source: true,
      classifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      impactScores: {
        where: organisationId ? { organisationId } : undefined,
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
    },
    take: 100,
  });

  return publications.map(mapDbPublication).filter((publication) => includesFilter(publication, filters));
}

export async function getPublication(id: string, organisationId?: string) {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return mockPublications.find((publication) => publication.id === id) ?? null;
  }

  const prisma = getPrisma();
  const publication = await prisma.publication.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    include: {
      source: true,
      classifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      impactScores: {
        where: organisationId ? { organisationId } : undefined,
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
    },
  });

  return publication ? mapDbPublication(publication) : null;
}

export async function getPublicationVersions(id: string): Promise<PublicationVersionView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return mockVersions[id] ?? [];
  }

  const prisma = getPrisma();
  const publication = await prisma.publication.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    select: { id: true },
  });
  if (!publication) return [];
  const versions = await prisma.publicationVersion.findMany({
    where: { publicationId: publication.id },
    orderBy: { versionNumber: "desc" },
  });

  return versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    fetchedAt: version.fetchedAt.toISOString(),
    rawHash: version.rawHash,
    changeSummary: version.changeSummary,
    diffFromPrevious: version.diffFromPrevious,
  }));
}

export async function getPublicationParagraphDiffs(id: string): Promise<ParagraphDiffView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return mockParagraphDiffs[id] ?? [];
  }

  const prisma = getPrisma();
  const publication = await prisma.publication.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    select: { id: true },
  });
  if (!publication) return [];
  const diffs = await prisma.paragraphDiff.findMany({
    where: { publicationId: publication.id, changeType: { not: "UNCHANGED" } },
    orderBy: [{ createdAt: "desc" }, { paragraphIndex: "asc" }],
    take: 50,
  });

  return diffs.map((diff) => ({
    id: diff.id,
    paragraphIndex: diff.paragraphIndex,
    changeType: diff.changeType,
    beforeText: diff.beforeText,
    afterText: diff.afterText,
    unifiedDiff: diff.unifiedDiff,
    semanticSummary: diff.semanticSummary,
  }));
}

export async function getAvailableFilters(organisationId?: string) {
  const publications = await listPublications({}, organisationId);

  return {
    sources: [...new Map(publications.map((publication) => [publication.sourceCode, publication.sourceName]))],
    publicationTypes: [...new Set(publications.map((publication) => publication.publicationType))].sort(),
    tags: [
      ...new Set(
        publications.flatMap((publication) => [
          ...publication.tags.regulationFamilies,
          ...publication.tags.licenceTypes,
          ...publication.tags.topicPaths,
          ...publication.tags.jurisdictions,
        ]),
      ),
    ].sort(),
  };
}

export async function getDigestPreview(organisationId?: string) {
  const publications = await listPublications({}, organisationId);
  const items = publications
    .filter((publication) => ["CRITICAL", "HIGH", "MEDIUM"].includes(publication.impactBucket))
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  return {
    subject: `EU Financial Reg Scanner digest: ${items.length} relevant items`,
    generatedAt: new Date().toISOString(),
    items,
  };
}

import { hasDatabaseUrl } from "@/lib/env";
import { scorePublicationForProductMap, type ProductMapFootprint } from "@/lib/impact-scoring";
import { listProductMaps } from "@/lib/product-maps";
import { getPrisma } from "@/lib/prisma";
import { listPublications } from "@/lib/publications";

export type ImpactRecalculationResult = {
  productMaps: number;
  publications: number;
  scoresWritten: number;
  mode: "demo" | "database";
};

function productMapToFootprint(productMap: {
  id: string;
  organisationId: string;
  name: string;
  licences: Array<{ licenceType: string; issuingAuthority: string; status: string }>;
  productLines: Array<{ name: string; activities: string[]; isCritical: boolean }>;
  jurisdictions: Array<{
    jurisdictionCode: string;
    authority: string | null;
    isHomeMember: boolean;
    isPassportedInto: boolean;
  }>;
}): ProductMapFootprint {
  return {
    id: productMap.id,
    organisationId: productMap.organisationId,
    name: productMap.name,
    licences: productMap.licences.map((licence) => ({
      licenceType: licence.licenceType,
      issuingAuthority: licence.issuingAuthority,
      status: licence.status,
    })),
    productLines: productMap.productLines.map((line) => ({
      name: line.name,
      activities: line.activities,
      isCritical: line.isCritical,
    })),
    jurisdictions: productMap.jurisdictions.map((jurisdiction) => ({
      jurisdictionCode: jurisdiction.jurisdictionCode,
      authority: jurisdiction.authority,
      isHomeMember: jurisdiction.isHomeMember,
      isPassportedInto: jurisdiction.isPassportedInto,
    })),
  };
}

async function writeImpactScore(input: {
  publicationId: string;
  publicationType: string;
  classification: {
    regulationFamilies: string[];
    activities: string[];
    licenceTypes: string[];
    topicPaths: string[];
    jurisdictions: string[];
  };
  productMap: ProductMapFootprint;
}) {
  const prisma = getPrisma();
  const score = scorePublicationForProductMap({
    publicationType: input.publicationType,
    productMap: input.productMap,
    classification: input.classification,
  });

  await prisma.impactScore.upsert({
    where: {
      publicationId_productMapId: {
        publicationId: input.publicationId,
        productMapId: input.productMap.id,
      },
    },
    update: {
      organisationId: input.productMap.organisationId,
      score: score.score,
      bucket: score.bucket,
      rationale: score.rationale,
      matchedLicences: score.matchedLicences,
      matchedActivities: score.matchedActivities,
      matchedJurisdictions: score.matchedJurisdictions,
      ruleVersion: score.ruleVersion,
    },
    create: {
      publicationId: input.publicationId,
      organisationId: input.productMap.organisationId,
      productMapId: input.productMap.id,
      score: score.score,
      bucket: score.bucket,
      rationale: score.rationale,
      matchedLicences: score.matchedLicences,
      matchedActivities: score.matchedActivities,
      matchedJurisdictions: score.matchedJurisdictions,
      ruleVersion: score.ruleVersion,
    },
  });

  return score;
}

export async function scoreStoredPublicationForAllProductMaps(publicationId: string) {
  if (!hasDatabaseUrl()) return { productMaps: 0, scoresWritten: 0, mode: "demo" as const };

  const prisma = getPrisma();
  const publication = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: {
      classifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const classification = publication?.classifications[0];
  if (!publication || !classification) {
    return { productMaps: 0, scoresWritten: 0, mode: "database" as const };
  }

  const productMaps = await prisma.productMap.findMany({
    where: { isActive: true },
    include: {
      licences: true,
      productLines: true,
      jurisdictions: true,
    },
  });

  let scoresWritten = 0;
  for (const productMap of productMaps) {
    await writeImpactScore({
      publicationId: publication.id,
      publicationType: publication.publicationType,
      productMap: productMapToFootprint(productMap),
      classification: {
        regulationFamilies: classification.regulationFamilies,
        activities: classification.activities,
        licenceTypes: classification.licenceTypes,
        topicPaths: classification.topicPaths,
        jurisdictions: classification.jurisdictions,
      },
    });
    scoresWritten += 1;
  }

  return { productMaps: productMaps.length, scoresWritten, mode: "database" as const };
}

export async function recalculateImpactScores(organisationId?: string): Promise<ImpactRecalculationResult> {
  if (!hasDatabaseUrl()) {
    const [productMaps, publications] = await Promise.all([listProductMaps(), listPublications()]);
    return {
      productMaps: productMaps.length,
      publications: publications.length,
      scoresWritten: productMaps.length * publications.length,
      mode: "demo",
    };
  }

  const prisma = getPrisma();
  const productMaps = await prisma.productMap.findMany({
    where: { isActive: true, organisationId },
    include: {
      organisation: true,
      licences: true,
      productLines: true,
      jurisdictions: true,
    },
  });
  const publications = await prisma.publication.findMany({
    include: {
      classifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let scoresWritten = 0;

  for (const productMap of productMaps) {
    const footprint = productMapToFootprint(productMap);

    for (const publication of publications) {
      const classification = publication.classifications[0];
      if (!classification) continue;

      await writeImpactScore({
        publicationId: publication.id,
        publicationType: publication.publicationType,
        productMap: footprint,
        classification: {
          regulationFamilies: classification.regulationFamilies,
          activities: classification.activities,
          licenceTypes: classification.licenceTypes,
          topicPaths: classification.topicPaths,
          jurisdictions: classification.jurisdictions,
        },
      });

      scoresWritten += 1;
    }
  }

  return {
    productMaps: productMaps.length,
    publications: publications.length,
    scoresWritten,
    mode: "database",
  };
}

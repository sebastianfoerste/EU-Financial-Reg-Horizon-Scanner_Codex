import type { Prisma, ServiceOfferingRuleAxis } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit";
import { requireInternalOperator } from "@/lib/authz";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { assertTaxonomyValue, loadTaxonomy, type ServiceOfferingConfig } from "@/lib/taxonomy";

export type ClassificationVector = {
  regulationFamilies: string[];
  activities: string[];
  licenceTypes: string[];
  topicPaths: string[];
  jurisdictions: string[];
};

function intersects(values: string[], required: string[]) {
  return required.some((value) => values.includes(value));
}

export function serviceOfferingMatches(
  offering: ServiceOfferingConfig,
  vector: ClassificationVector,
) {
  const triggers = offering.triggers;
  const entries = Object.entries(triggers);
  if (entries.length === 0) return false;

  return entries.every(([axis, required]) => {
    if (axis === "regulation_family") {
      return intersects(vector.regulationFamilies, required);
    }
    if (axis === "activity") {
      return intersects(vector.activities, required);
    }
    if (axis === "licence_type") {
      return intersects(vector.licenceTypes, required);
    }
    if (axis === "topic") {
      return intersects(vector.topicPaths, required);
    }
    if (axis === "jurisdiction") {
      return intersects(vector.jurisdictions, required);
    }

    return false;
  });
}

export function matchServiceOfferings(vector: ClassificationVector) {
  const taxonomy = loadTaxonomy();
  const matched = taxonomy.service_offerings.filter((offering) =>
    serviceOfferingMatches(offering, vector),
  );

  if (matched.length > 0) return matched;

  return taxonomy.service_offerings.filter(
    (offering) => offering.id === "gc_regulatory_strategy_retainer",
  );
}

function governedRuleMatches(
  rule: { axis: ServiceOfferingRuleAxis; values: string[] },
  vector: ClassificationVector,
) {
  const vectorValues = {
    REGULATION_FAMILY: vector.regulationFamilies,
    ACTIVITY: vector.activities,
    LICENCE_TYPE: vector.licenceTypes,
    TOPIC: vector.topicPaths,
    JURISDICTION: vector.jurisdictions,
  }[rule.axis];

  return intersects(vectorValues, rule.values);
}

export async function matchGovernedServiceOfferingIds(vector: ClassificationVector) {
  if (!hasDatabaseUrl()) return matchServiceOfferings(vector).map((offering) => offering.id);

  const offerings = await getPrisma().serviceOffering.findMany({
    where: { isActive: true },
    include: {
      rules: {
        where: { isActive: true },
      },
    },
  });
  const matched = offerings.filter(
    (offering) => offering.rules.length > 0 && offering.rules.every((rule) => governedRuleMatches(rule, vector)),
  );
  const selected = matched.length
    ? matched
    : offerings.filter((offering) => offering.id === "gc_regulatory_strategy_retainer");

  return selected.map((offering) => offering.id);
}

export type ServiceCatalogueRuleView = {
  id: string;
  serviceOfferingId: string;
  axis: ServiceOfferingRuleAxis;
  values: string[];
  isActive: boolean;
};

export type ServiceCatalogueOfferingView = {
  id: string;
  name: string;
  description: string;
  priceIndication: string;
  calendlyUrl: string | null;
  hubspotDealStage: string | null;
  isActive: boolean;
  rules: ServiceCatalogueRuleView[];
};

const axisMap: Record<string, ServiceOfferingRuleAxis> = {
  regulation_family: "REGULATION_FAMILY",
  activity: "ACTIVITY",
  licence_type: "LICENCE_TYPE",
  topic: "TOPIC",
  jurisdiction: "JURISDICTION",
};

export function validateServiceOfferingRuleValues(axis: ServiceOfferingRuleAxis, values: string[]) {
  if (!values.length) throw new Error("At least one trigger value is required.");
  const taxonomyAxis = {
    REGULATION_FAMILY: "regulation_family",
    ACTIVITY: "activity",
    LICENCE_TYPE: "licence_type",
    TOPIC: "topic",
    JURISDICTION: "jurisdiction",
  }[axis] as "regulation_family" | "activity" | "licence_type" | "topic" | "jurisdiction";

  values.forEach((value) => assertTaxonomyValue(taxonomyAxis, value));
  return values;
}

function taxonomyOfferingToCatalogue(offering: ServiceOfferingConfig): ServiceCatalogueOfferingView {
  return {
    id: offering.id,
    name: offering.name,
    description: `Triggered by taxonomy rules for ${offering.id}.`,
    priceIndication: offering.price_indication,
    calendlyUrl: null,
    hubspotDealStage: null,
    isActive: true,
    rules: Object.entries(offering.triggers).map(([axis, values], index) => ({
      id: `${offering.id}-${axis}-${index}`,
      serviceOfferingId: offering.id,
      axis: axisMap[axis] ?? "TOPIC",
      values,
      isActive: true,
    })),
  };
}

type DbServiceOffering = Prisma.ServiceOfferingGetPayload<{
  include: {
    rules: {
      orderBy: { createdAt: "asc" };
    };
  };
}>;

function mapDbServiceOffering(offering: DbServiceOffering): ServiceCatalogueOfferingView {
  return {
    id: offering.id,
    name: offering.name,
    description: offering.description,
    priceIndication: offering.priceIndication,
    calendlyUrl: offering.calendlyUrl,
    hubspotDealStage: offering.hubspotDealStage,
    isActive: offering.isActive,
    rules: offering.rules.map((rule) => ({
      id: rule.id,
      serviceOfferingId: rule.serviceOfferingId,
      axis: rule.axis,
      values: rule.values,
      isActive: rule.isActive,
    })),
  };
}

export async function listServiceCatalogue(): Promise<ServiceCatalogueOfferingView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return loadTaxonomy().service_offerings.map(taxonomyOfferingToCatalogue);
  }

  const offerings = await getPrisma().serviceOffering.findMany({
    orderBy: { name: "asc" },
    include: {
      rules: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return offerings.map(mapDbServiceOffering);
}

export async function getRoutedServiceOfferings(ids: string[]): Promise<ServiceCatalogueOfferingView[]> {
  if (!ids.length) return [];
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    const byId = new Map(
      loadTaxonomy().service_offerings.map((offering) => [
        offering.id,
        taxonomyOfferingToCatalogue(offering),
      ]),
    );
    return ids.flatMap((id) => {
      const offering = byId.get(id);
      return offering ? [offering] : [];
    });
  }

  const offerings = await getPrisma().serviceOffering.findMany({
    where: { id: { in: ids }, isActive: true },
    include: {
      rules: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const byId = new Map(offerings.map((offering) => [offering.id, mapDbServiceOffering(offering)]));
  return ids.flatMap((id) => {
    const offering = byId.get(id);
    return offering ? [offering] : [];
  });
}

async function refreshGovernedServiceRoutes() {
  const prisma = getPrisma();
  const classifications = await prisma.classification.findMany({
    select: {
      id: true,
      serviceOfferingIds: true,
      regulationFamilies: true,
      activities: true,
      licenceTypes: true,
      topicPaths: true,
      jurisdictions: true,
    },
  });

  let routesUpdated = 0;
  for (const classification of classifications) {
    const serviceOfferingIds = await matchGovernedServiceOfferingIds(classification);
    if (serviceOfferingIds.join("|") !== classification.serviceOfferingIds.join("|")) {
      await prisma.classification.update({
        where: { id: classification.id },
        data: { serviceOfferingIds },
      });
      routesUpdated += 1;
    }
  }

  const invalidated = await prisma.alert.updateMany({
    where: { status: { in: ["DRAFT", "APPROVED", "BLOCKED_BY_CONFIG", "FAILED"] } },
    data: {
      status: "SKIPPED",
      errorMessage: "Service catalogue changed. Generate a new reviewed alert draft.",
    },
  });

  return { routesUpdated, invalidatedDrafts: invalidated.count };
}

export async function updateServiceOffering(input: {
  id: string;
  name: string;
  description: string;
  priceIndication: string;
  calendlyUrl?: string | null;
  hubspotDealStage?: string | null;
  isActive: boolean;
}) {
  const operator = await requireInternalOperator();

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    await writeAuditLog({
      action: "service.update",
      entityType: "service_offering",
      entityId: input.id,
      actorUserId: operator.userId,
      organisationId: operator.organisationId,
      payloadJson: { mode: "demo" },
    });
    return { ok: true, mode: "demo" as const };
  }

  const offering = await getPrisma().serviceOffering.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description,
      priceIndication: input.priceIndication,
      calendlyUrl: input.calendlyUrl || null,
      hubspotDealStage: input.hubspotDealStage || null,
      isActive: input.isActive,
    },
  });
  const refresh = await refreshGovernedServiceRoutes();

  await writeAuditLog({
    action: "service.update",
    entityType: "service_offering",
    entityId: input.id,
    actorUserId: operator.userId,
    organisationId: operator.organisationId,
    payloadJson: { isActive: input.isActive, ...refresh },
  });

  return { ok: true, mode: "database" as const, offering };
}

export async function upsertServiceOfferingRule(input: {
  id?: string;
  serviceOfferingId: string;
  axis: ServiceOfferingRuleAxis;
  values: string[];
  isActive: boolean;
}) {
  const operator = await requireInternalOperator();
  validateServiceOfferingRuleValues(input.axis, input.values);

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    await writeAuditLog({
      action: "service.rule.upsert",
      entityType: "service_offering",
      entityId: input.serviceOfferingId,
      actorUserId: operator.userId,
      organisationId: operator.organisationId,
      payloadJson: { mode: "demo", axis: input.axis, values: input.values },
    });
    return { ok: true, mode: "demo" as const };
  }

  const prisma = getPrisma();
  const rule = input.id
    ? await prisma.serviceOfferingRule.update({
        where: { id: input.id },
        data: {
          axis: input.axis,
          values: input.values,
          isActive: input.isActive,
        },
      })
    : await prisma.serviceOfferingRule.create({
        data: {
          serviceOfferingId: input.serviceOfferingId,
          axis: input.axis,
          values: input.values,
          isActive: input.isActive,
        },
      });
  const refresh = await refreshGovernedServiceRoutes();

  await writeAuditLog({
    action: "service.rule.upsert",
    entityType: "service_offering",
    entityId: input.serviceOfferingId,
    actorUserId: operator.userId,
    organisationId: operator.organisationId,
    payloadJson: {
      ruleId: rule.id,
      axis: input.axis,
      values: input.values,
      isActive: input.isActive,
      ...refresh,
    },
  });

  return { ok: true, mode: "database" as const, rule };
}

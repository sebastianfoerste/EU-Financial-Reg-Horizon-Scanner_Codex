"use server";

import { redirect } from "next/navigation";

import { getActiveOrganisationId, requireOperator } from "@/lib/authz";
import { hasDatabaseUrl } from "@/lib/env";
import { recalculateImpactScores } from "@/lib/impact-recalculation";
import { getPrisma } from "@/lib/prisma";
import { assertTaxonomyValue } from "@/lib/taxonomy";

const customerSegments = [
  "RETAIL",
  "PROFESSIONAL",
  "ELIGIBLE_COUNTERPARTY",
  "CORPORATE",
  "INSTITUTIONAL",
] as const;

type CustomerSegmentValue = (typeof customerSegments)[number];

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

function readCustomerSegment(formData: FormData): CustomerSegmentValue {
  const value = readRequired(formData, "customerSegment");
  if (!customerSegments.includes(value as CustomerSegmentValue)) {
    throw new Error(`Unknown customer segment: ${value}`);
  }
  return value as CustomerSegmentValue;
}

export async function createProductMapAction(formData: FormData) {
  const operator = await requireOperator();

  if (!hasDatabaseUrl()) {
    redirect("/product-maps/demo-product-map-casp?created=demo");
  }

  const organisationName = readRequired(formData, "organisationName");
  const productMapName = readRequired(formData, "productMapName");
  const licenceType = assertTaxonomyValue("licence_type", readRequired(formData, "licenceType"));
  const issuingAuthority = readRequired(formData, "issuingAuthority");
  const productLineName = readRequired(formData, "productLineName");
  const activity = assertTaxonomyValue("activity", readRequired(formData, "activity"));
  const jurisdictionCode = assertTaxonomyValue("jurisdiction", readRequired(formData, "jurisdictionCode").toLowerCase());
  const customerSegment = readCustomerSegment(formData);
  const isCritical = formData.get("isCritical") === "on";

  const prisma = getPrisma();
  const activeOrganisationId = operator.organisationId ?? (await getActiveOrganisationId());
  const organisation = activeOrganisationId
    ? await prisma.organisation.findUniqueOrThrow({ where: { id: activeOrganisationId } })
    : (await prisma.organisation.findFirst({ where: { name: organisationName } })) ??
      (await prisma.organisation.create({
        data: {
          name: organisationName,
          tier: "TRIAL",
        },
      }));

  const productMap = await prisma.productMap.create({
    data: {
      organisationId: organisation.id,
      name: productMapName,
      notes: "Created from MVP product-map intake.",
      licences: {
        create: {
          licenceType,
          issuingAuthority,
          status: "ACTIVE",
        },
      },
      productLines: {
        create: {
          name: productLineName,
          activities: [activity],
          customerSegment: [customerSegment],
          isCritical,
        },
      },
      jurisdictions: {
        create: {
          jurisdictionCode,
          authority: issuingAuthority,
          isHomeMember: true,
        },
      },
    },
  });

  await recalculateImpactScores(organisation.id);
  redirect(`/product-maps/${productMap.id}?created=1`);
}

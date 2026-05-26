import type { Prisma } from "@prisma/client";

import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import type { ProductMapFootprint } from "@/lib/impact-scoring";
import { getPrisma } from "@/lib/prisma";

export const demoProductMap: ProductMapFootprint = {
  id: "demo-product-map-casp",
  organisationId: "demo-org",
  name: "EU CASP and payments footprint",
  licences: [
    { licenceType: "casp_micar", issuingAuthority: "bafin", status: "ACTIVE" },
    { licenceType: "payment_institution_psd", issuingAuthority: "bafin", status: "APPLIED" },
  ],
  productLines: [
    {
      name: "Crypto exchange and custody",
      activities: ["exchange_crypto_for_fiat", "custody_safekeeping_crypto", "transfer_services_crypto"],
      isCritical: true,
    },
    {
      name: "Payment initiation",
      activities: ["payment_initiation", "account_information"],
      isCritical: false,
    },
  ],
  jurisdictions: [
    { jurisdictionCode: "de", authority: "bafin", isHomeMember: true, isPassportedInto: false },
    { jurisdictionCode: "eu", authority: "esma", isHomeMember: false, isPassportedInto: true },
  ],
};

type DbProductMap = Prisma.ProductMapGetPayload<{
  include: {
    organisation: true;
    licences: true;
    productLines: true;
    jurisdictions: true;
  };
}>;

function mapDbProductMap(productMap: DbProductMap): ProductMapFootprint & {
  organisationName: string;
  updatedAt: string;
} {
  return {
    id: productMap.id,
    organisationId: productMap.organisationId,
    organisationName: productMap.organisation.name,
    name: productMap.name,
    updatedAt: productMap.updatedAt.toISOString(),
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

export type ProductMapView = ReturnType<typeof mapDbProductMap>;

export async function listProductMaps(organisationId?: string): Promise<ProductMapView[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return [
      {
        ...demoProductMap,
        organisationName: "Demo organisation",
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const prisma = getPrisma();
  const productMaps = await prisma.productMap.findMany({
    where: { isActive: true, organisationId },
    orderBy: { updatedAt: "desc" },
    include: {
      organisation: true,
      licences: true,
      productLines: true,
      jurisdictions: true,
    },
  });

  return productMaps.map(mapDbProductMap);
}

export async function getProductMap(id: string, organisationId?: string): Promise<ProductMapView | null> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return id === demoProductMap.id
      ? { ...demoProductMap, organisationName: "Demo organisation", updatedAt: new Date().toISOString() }
      : null;
  }

  const prisma = getPrisma();
  const productMap = await prisma.productMap.findFirst({
    where: { id, organisationId },
    include: {
      organisation: true,
      licences: true,
      productLines: true,
      jurisdictions: true,
    },
  });

  return productMap ? mapDbProductMap(productMap) : null;
}

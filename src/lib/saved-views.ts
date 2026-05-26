import type { Prisma } from "@prisma/client";

import { assertOrganisationAccess, requireOperator } from "@/lib/authz";
import { assertDemoModeAllowed, hasDatabaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import type { PublicationFilters } from "@/lib/publications";

export type SavedViewDefinition = {
  id: string;
  name: string;
  description: string;
  filters: PublicationFilters;
  isDefault: boolean;
};

export const defaultSavedViews: SavedViewDefinition[] = [
  {
    id: "default-micar",
    name: "MiCAR watch",
    description: "MiCAR publications across EU and national sources.",
    filters: { tag: "micar" },
    isDefault: true,
  },
  {
    id: "default-dora",
    name: "DORA watch",
    description: "ICT, resilience, and outsourcing publications.",
    filters: { tag: "dora" },
    isDefault: true,
  },
  {
    id: "default-bafin",
    name: "BaFin",
    description: "German supervisory publications.",
    filters: { source: "bafin" },
    isDefault: true,
  },
  {
    id: "default-high-impact",
    name: "High impact",
    description: "Items scored critical or high.",
    filters: { bucket: "HIGH" },
    isDefault: true,
  },
];

function mapSavedView(row: {
  id: string;
  name: string;
  description: string | null;
  filtersJson: Prisma.JsonValue;
  isDefault: boolean;
}): SavedViewDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    filters: row.filtersJson as unknown as PublicationFilters,
    isDefault: row.isDefault,
  };
}

export function savedViewToSearchParams(filters: PublicationFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export async function listSavedViews(organisationId?: string | null): Promise<SavedViewDefinition[]> {
  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return defaultSavedViews;
  }

  const views = await getPrisma().savedView.findMany({
    where: {
      OR: [{ organisationId: null }, organisationId ? { organisationId } : { id: "__none__" }],
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return views.length ? views.map(mapSavedView) : defaultSavedViews;
}

export async function seedDefaultSavedViews() {
  if (!hasDatabaseUrl()) return;
  const prisma = getPrisma();
  for (const view of defaultSavedViews) {
    await prisma.savedView.upsert({
      where: { id: view.id },
      update: {
        name: view.name,
        description: view.description,
        filtersJson: view.filters as Prisma.InputJsonValue,
        isDefault: true,
      },
      create: {
        id: view.id,
        name: view.name,
        description: view.description,
        filtersJson: view.filters as Prisma.InputJsonValue,
        isDefault: true,
      },
    });
  }
}

export async function createSavedView(input: {
  name: string;
  description?: string | null;
  filters: PublicationFilters;
  organisationId?: string | null;
}) {
  const operator = await requireOperator();

  if (!hasDatabaseUrl()) {
    assertDemoModeAllowed();
    return { ok: true, mode: "demo" as const, id: "demo-saved-view" };
  }

  if (input.organisationId) {
    assertOrganisationAccess(operator, input.organisationId);
  }
  if (operator.mode === "clerk" && !operator.organisationId) {
    throw new Error("An active organisation is required before a saved view can be created.");
  }
  const organisationId = operator.mode === "clerk" ? operator.organisationId : (input.organisationId ?? null);

  const savedView = await getPrisma().savedView.create({
    data: {
      organisationId,
      name: input.name,
      description: input.description,
      filtersJson: input.filters as Prisma.InputJsonValue,
      isDefault: false,
    },
  });

  return { ok: true, mode: "database" as const, id: savedView.id };
}

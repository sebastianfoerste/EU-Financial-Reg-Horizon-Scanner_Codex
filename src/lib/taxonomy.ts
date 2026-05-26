import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

const ServiceOfferingSchema = z.object({
  id: z.string(),
  name: z.string(),
  triggers: z.record(z.string(), z.array(z.string())).default({}),
  price_indication: z.string(),
});

const TaxonomySchema = z.object({
  version: z.string(),
  maintainer: z.string(),
  review_cadence: z.string(),
  regulation_family: z.record(z.string(), z.unknown()),
  activity: z.array(z.string()),
  licence_type: z.array(z.string()),
  topic: z.record(z.string(), z.array(z.string())),
  jurisdiction: z.record(z.string(), z.unknown()),
  publication_type: z.record(z.string(), z.array(z.string())),
  urgency_weights: z.record(z.string(), z.number()),
  service_offerings: z.array(ServiceOfferingSchema),
});

export type Taxonomy = z.infer<typeof TaxonomySchema>;
export type ServiceOfferingConfig = z.infer<typeof ServiceOfferingSchema>;

let cachedTaxonomy: Taxonomy | null = null;

export function loadTaxonomy(path = resolve(process.cwd(), "config/taxonomy.yaml")) {
  if (!cachedTaxonomy || path !== resolve(process.cwd(), "config/taxonomy.yaml")) {
    const file = readFileSync(path, "utf8");
    cachedTaxonomy = TaxonomySchema.parse(parse(file));
  }

  return cachedTaxonomy;
}

export function getTaxonomyVersion() {
  return loadTaxonomy().version;
}

export function getPublicationTypes(taxonomy = loadTaxonomy()) {
  return Object.values(taxonomy.publication_type).flat();
}

export function getTopicPaths(taxonomy = loadTaxonomy()) {
  return Object.entries(taxonomy.topic).flatMap(([group, topics]) =>
    topics.map((topic) => `${group}.${topic}`),
  );
}

export function getRegulationFamilies(taxonomy = loadTaxonomy()) {
  return Object.keys(taxonomy.regulation_family);
}

export function getJurisdictionValues(taxonomy = loadTaxonomy()) {
  const values = new Set<string>(["eu"]);

  function visit(node: unknown, parentKey?: string) {
    if (Array.isArray(node)) {
      for (const value of node) {
        if (typeof value === "string") values.add(value);
      }
      return;
    }

    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (parentKey === "member_states") values.add(key);
        visit(value, key);
      }
    }
  }

  visit(taxonomy.jurisdiction);
  return [...values].sort();
}

export function assertTaxonomyValue(
  axis: "regulation_family" | "activity" | "licence_type" | "publication_type" | "topic" | "jurisdiction",
  value: string,
  taxonomy = loadTaxonomy(),
) {
  const allowed =
    axis === "publication_type"
      ? getPublicationTypes(taxonomy)
      : axis === "topic"
        ? getTopicPaths(taxonomy)
        : axis === "regulation_family"
          ? getRegulationFamilies(taxonomy)
          : axis === "jurisdiction"
            ? getJurisdictionValues(taxonomy)
        : taxonomy[axis];

  if (!allowed.includes(value)) {
    throw new Error(`Unknown taxonomy value for ${axis}: ${value}`);
  }

  return value;
}

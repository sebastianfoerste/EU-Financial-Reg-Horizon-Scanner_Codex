import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

const ScoringRulesSchema = z.object({
  version: z.string(),
  maintainer: z.string(),
  weights: z.object({
    licence_match: z.number(),
    activity_overlap: z.number(),
    jurisdiction_home_match: z.number(),
    jurisdiction_passported_match: z.number(),
    topic_watchlist_match: z.number(),
    critical_product_line_bonus: z.number(),
  }),
  publication_type_floor: z.record(z.string(), z.number()),
  buckets: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  topic_watchlist: z.array(z.string()),
});

export type ScoringRules = z.infer<typeof ScoringRulesSchema>;

let cachedRules: ScoringRules | null = null;

export function loadScoringRules(path = resolve(process.cwd(), "config/scoring-rules.yaml")) {
  if (!cachedRules || path !== resolve(process.cwd(), "config/scoring-rules.yaml")) {
    cachedRules = ScoringRulesSchema.parse(parse(readFileSync(path, "utf8")));
  }

  return cachedRules;
}

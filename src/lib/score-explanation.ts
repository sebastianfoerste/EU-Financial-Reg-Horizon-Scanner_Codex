import { loadScoringRules } from "@/lib/scoring-rules";
import type { ClassificationVector } from "@/lib/service-offerings";

export type ScoreExplanationItem = {
  label: string;
  value: string;
  points: number;
  matched: boolean;
};

export function buildScoreExplanation(input: {
  publicationType: string;
  classification: ClassificationVector;
  matchedLicences?: string[];
  matchedActivities?: string[];
  matchedJurisdictions?: string[];
  matchedTopics?: string[];
  criticalProductLineMatched?: boolean;
}) {
  const rules = loadScoringRules();
  const floor = rules.publication_type_floor[input.publicationType] ?? 0;
  const matchedLicences = input.matchedLicences ?? [];
  const matchedActivities = input.matchedActivities ?? [];
  const matchedJurisdictions = input.matchedJurisdictions ?? [];
  const matchedTopics =
    input.matchedTopics ??
    input.classification.topicPaths.filter((topic) => rules.topic_watchlist.includes(topic));

  const items: ScoreExplanationItem[] = [
    {
      label: "Licence match",
      value: matchedLicences.join(", ") || "No direct licence match",
      points: matchedLicences.length ? rules.weights.licence_match : 0,
      matched: matchedLicences.length > 0,
    },
    {
      label: "Activity overlap",
      value: matchedActivities.join(", ") || "No activity overlap",
      points: matchedActivities.length ? rules.weights.activity_overlap : 0,
      matched: matchedActivities.length > 0,
    },
    {
      label: "Jurisdiction match",
      value: matchedJurisdictions.join(", ") || "No jurisdiction overlap",
      points: matchedJurisdictions.length ? rules.weights.jurisdiction_home_match : 0,
      matched: matchedJurisdictions.length > 0,
    },
    {
      label: "Watchlist topic",
      value: matchedTopics.join(", ") || "No watchlist topic",
      points: matchedTopics.length ? rules.weights.topic_watchlist_match : 0,
      matched: matchedTopics.length > 0,
    },
    {
      label: "Critical product line",
      value: input.criticalProductLineMatched ? "Critical line affected" : "No critical line match",
      points: input.criticalProductLineMatched ? rules.weights.critical_product_line_bonus : 0,
      matched: Boolean(input.criticalProductLineMatched),
    },
    {
      label: "Publication-type floor",
      value: input.publicationType,
      points: floor,
      matched: floor > 0,
    },
  ];

  return {
    ruleVersion: rules.version,
    items,
  };
}

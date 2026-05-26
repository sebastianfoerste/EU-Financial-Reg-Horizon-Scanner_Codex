import { z } from "zod";

import { getEnv } from "@/lib/env";
import { matchServiceOfferings } from "@/lib/service-offerings";
import { getTaxonomyVersion, loadTaxonomy } from "@/lib/taxonomy";

export const ClassificationOutputSchema = z.object({
  regulationFamilies: z.array(z.string()),
  subTopics: z.array(z.string()),
  activities: z.array(z.string()),
  licenceTypes: z.array(z.string()),
  topicPaths: z.array(z.string()),
  jurisdictions: z.array(z.string()),
  summary: z.string(),
  whatChanged: z.string().nullable(),
  whoIsAffected: z.string().nullable(),
  deadline: z.string().datetime().nullable(),
  recommendedAction: z.string().nullable(),
  serviceOfferingIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

const keywordRules = [
  {
    tokens: ["micar", "crypto-asset", "crypto asset", "white paper", "casp", "emt", "art"],
    regulationFamily: "micar",
    activities: ["issuance_of_other_crypto_assets"],
    licenceTypes: ["casp_micar", "art_issuer_micar", "emt_issuer_micar"],
    topicPaths: ["digital_assets_specific.white_paper_review"],
  },
  {
    tokens: ["dora", "ict", "operational resilience", "third-party", "incident"],
    regulationFamily: "dora",
    activities: ["custody_safekeeping_crypto", "payment_initiation"],
    licenceTypes: ["casp_micar", "emi_emd", "payment_institution_psd"],
    topicPaths: ["ict_and_resilience.ict_risk_management"],
  },
  {
    tokens: ["payment", "psd", "psr", "strong customer authentication", "open banking"],
    regulationFamily: "psd",
    activities: ["payment_initiation", "account_information", "money_remittance"],
    licenceTypes: ["payment_institution_psd", "emi_emd"],
    topicPaths: ["consumer_protection.retail_disclosure"],
  },
  {
    tokens: ["aml", "travel rule", "sanctions", "beneficial ownership"],
    regulationFamily: "aml",
    activities: ["transfer_services_crypto", "money_remittance"],
    licenceTypes: ["casp_micar", "payment_institution_psd", "emi_emd"],
    topicPaths: ["aml_cft_sanctions.travel_rule"],
  },
];

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean);
}

export function classifyPublicationStub(input: {
  title: string;
  bodyText: string;
  sourceCode: string;
  language: string;
  publicationType: string;
}): ClassificationOutput & { taxonomyVersion: string; classifierModel: string; classifierVersion: string } {
  const taxonomy = loadTaxonomy();
  const env = getEnv();
  const text = `${input.title}\n${input.bodyText}`.toLowerCase();
  const matchedRules = keywordRules.filter((rule) =>
    rule.tokens.some((token) => text.includes(token)),
  );

  const regulationFamilies = unique(matchedRules.map((rule) => rule.regulationFamily));
  const activities = unique(matchedRules.flatMap((rule) => rule.activities));
  const licenceTypes = unique(matchedRules.flatMap((rule) => rule.licenceTypes));
  const topicPaths = unique(matchedRules.flatMap((rule) => rule.topicPaths));
  const jurisdictions = unique([
    input.sourceCode === "bafin" ? "de" : "eu",
    input.sourceCode,
  ]);

  const vector = {
    regulationFamilies: regulationFamilies.length ? regulationFamilies : ["micar"],
    activities: activities.length ? activities : [taxonomy.activity[0]],
    licenceTypes: licenceTypes.length ? licenceTypes : ["casp_micar"],
    topicPaths: topicPaths.length ? topicPaths : ["authorisation_and_passporting.initial_authorisation"],
    jurisdictions,
  };
  const serviceOfferings = matchServiceOfferings(vector);
  const summary =
    input.bodyText.length > 360
      ? `${input.bodyText.slice(0, 357).trim()}...`
      : input.bodyText || "Publication captured and queued for human classification.";

  const parsed = ClassificationOutputSchema.parse({
    ...vector,
    subTopics: vector.regulationFamilies,
    summary,
    whatChanged:
      input.publicationType === "press_release"
        ? "Supervisory signal captured. No binding-rule diff is available yet."
        : "Publication captured. Paragraph-level semantic diff remains queued.",
    whoIsAffected:
      "Potentially affected entities are inferred from licence type, activity, topic, and jurisdiction tags.",
    deadline: null,
    recommendedAction:
      "Review the source publication, confirm the taxonomy tags, and decide whether a client alert is warranted.",
    serviceOfferingIds: serviceOfferings.map((offering) => offering.id),
    confidence: matchedRules.length ? 0.72 : 0.38,
  });

  return {
    ...parsed,
    taxonomyVersion: getTaxonomyVersion(),
    classifierModel: env.HORIZON_AI_MODEL,
    classifierVersion: `${env.HORIZON_AI_PROVIDER}:mvp-stub-v0`,
  };
}

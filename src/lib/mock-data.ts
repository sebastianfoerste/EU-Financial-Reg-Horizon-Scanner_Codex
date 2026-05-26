import type { ClassificationVector } from "@/lib/service-offerings";

export type PublicationListItem = {
  id: string;
  title: string;
  sourceCode: string;
  sourceName: string;
  sourceUrl: string;
  publicationType: string;
  publishedAt: string | null;
  fetchedAt: string;
  language: string;
  bodyText: string;
  tags: ClassificationVector;
  confidence: number;
  deadline?: string | null;
  impactBucket: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  impactScore: number;
  summary: string;
  whatChanged: string;
  whoIsAffected: string;
  recommendedAction: string;
  serviceOfferingIds: string[];
  rawHash: string;
  scoreRationale: string;
  matchedLicences: string[];
  matchedActivities: string[];
  matchedJurisdictions: string[];
  matchedTopics: string[];
  scoringRuleVersion: string;
};

export type PublicationVersionView = {
  id: string;
  versionNumber: number;
  fetchedAt: string;
  rawHash: string;
  changeSummary: string | null;
  diffFromPrevious: string | null;
};

export type ParagraphDiffView = {
  id: string;
  paragraphIndex: number;
  changeType: "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";
  beforeText: string | null;
  afterText: string | null;
  unifiedDiff: string | null;
  semanticSummary: string | null;
};

export const mockPublications: PublicationListItem[] = [
  {
    id: "pub-esma-qa-2845",
    title: "Machine-readable format requirement for modified MiCA white papers",
    sourceCode: "esma",
    sourceName: "ESMA",
    sourceUrl: "https://www.esma.europa.eu/esma-qa-search-page/all",
    publicationType: "q_and_a_published",
    publishedAt: "2026-05-12T10:00:00.000Z",
    fetchedAt: "2026-05-20T00:35:00.000Z",
    language: "en",
    bodyText:
      "Question: When a reporting entity notifies a modification of a white paper originally submitted before the entry into application of Commission Implementing Regulation (EU) 2024/2984, is the reporting entity required to submit the modified white paper in the machine-readable format specified in the regulation?",
    tags: {
      regulationFamilies: ["micar"],
      activities: ["issuance_of_other_crypto_assets", "issuance_of_art", "issuance_of_emt"],
      licenceTypes: ["casp_micar", "art_issuer_micar", "emt_issuer_micar"],
      topicPaths: ["digital_assets_specific.white_paper_review"],
      jurisdictions: ["eu", "esma"],
    },
    confidence: 0.82,
    impactBucket: "HIGH",
    impactScore: 82,
    summary:
      "ESMA has published a MiCA Q&A on modified crypto-asset white papers and machine-readable filing requirements.",
    whatChanged:
      "The item clarifies how modified white papers interact with the machine-readable XBRL format under the implementing regulation.",
    whoIsAffected:
      "Issuers, offerors, persons seeking admission to trading, and crypto asset service providers involved in MiCA white paper workflows.",
    recommendedAction:
      "Check whether any pending or previously notified white paper modifications need a revised machine-readable filing process.",
    serviceOfferingIds: ["gc_micar_white_paper"],
    rawHash: "demo-esma-qa-2845",
    scoreRationale:
      "Licence match: casp_micar, art_issuer_micar, emt_issuer_micar; jurisdiction overlap: eu, esma; watchlist topic: digital_assets_specific.white_paper_review.",
    matchedLicences: ["casp_micar", "art_issuer_micar", "emt_issuer_micar"],
    matchedActivities: ["issuance_of_other_crypto_assets", "issuance_of_art", "issuance_of_emt"],
    matchedJurisdictions: ["eu", "esma"],
    matchedTopics: ["digital_assets_specific.white_paper_review"],
    scoringRuleVersion: "mvp-seed-v0",
  },
  {
    id: "pub-eba-dora-jc",
    title: "Joint Committee annual report highlights DORA implementation priorities",
    sourceCode: "eba",
    sourceName: "EBA",
    sourceUrl:
      "https://www.eba.europa.eu/publications-and-media/press-releases/esas-joint-committee-highlights-digitalisation-cyber-resilience-and-sustainable-finance-key",
    publicationType: "press_release",
    publishedAt: "2026-04-24T12:00:00.000Z",
    fetchedAt: "2026-05-20T00:36:00.000Z",
    language: "en",
    bodyText:
      "The Joint Committee focused on protecting consumers in increasingly digital financial markets, strengthening operational and cyber resilience through DORA, and improving sustainable finance disclosures.",
    tags: {
      regulationFamilies: ["dora"],
      activities: ["custody_safekeeping_crypto", "payment_initiation"],
      licenceTypes: ["casp_micar", "payment_institution_psd", "emi_emd"],
      topicPaths: ["ict_and_resilience.ict_risk_management", "ict_and_resilience.third_party_arrangements"],
      jurisdictions: ["eu", "eba", "joint_committee_esas"],
    },
    confidence: 0.74,
    impactBucket: "MEDIUM",
    impactScore: 64,
    summary:
      "The EBA-published Joint Committee report signals continued supervisory focus on DORA, digitalisation, and cyber resilience.",
    whatChanged:
      "The publication confirms supervisory priorities rather than introducing a new binding rule.",
    whoIsAffected:
      "Financial entities in scope of DORA, including payment institutions, e-money institutions, CASPs, and ICT third-party risk owners.",
    recommendedAction:
      "Use the item as a board-reporting signal and check whether the DORA register and incident playbook are ready for supervisory review.",
    serviceOfferingIds: ["gc_dora_register"],
    rawHash: "demo-eba-dora-jc",
    scoreRationale:
      "Activity overlap: custody_safekeeping_crypto, payment_initiation; jurisdiction overlap: eu; watchlist topic: ict_and_resilience.third_party_arrangements.",
    matchedLicences: ["casp_micar", "payment_institution_psd", "emi_emd"],
    matchedActivities: ["custody_safekeeping_crypto", "payment_initiation"],
    matchedJurisdictions: ["eu", "eba", "joint_committee_esas"],
    matchedTopics: ["ict_and_resilience.third_party_arrangements"],
    scoringRuleVersion: "mvp-seed-v0",
  },
  {
    id: "pub-bafin-supervisory-practice",
    title: "BaFin supervisory publication queue ready for live polling",
    sourceCode: "bafin",
    sourceName: "BaFin",
    sourceUrl: "https://www.bafin.de/EN/Service/TopNavigation/RSS/rss_artikel_en.html",
    publicationType: "merkblatt",
    publishedAt: null,
    fetchedAt: "2026-05-20T00:37:00.000Z",
    language: "de",
    bodyText:
      "BaFin RSS feeds are configured for all publications, press and public relations, and supervisory publications. The MVP adapter stores ETag and Last-Modified state for polite polling.",
    tags: {
      regulationFamilies: ["micar", "psd"],
      activities: ["exchange_crypto_for_fiat", "issuance_of_e_money"],
      licenceTypes: ["casp_micar", "emi_emd", "payment_institution_psd"],
      topicPaths: ["authorisation_and_passporting.initial_authorisation"],
      jurisdictions: ["de", "bafin"],
    },
    confidence: 0.68,
    impactBucket: "LOW",
    impactScore: 38,
    summary:
      "The BaFin adapter is configured for the supervisory-publication channel and ready for live MVP polling.",
    whatChanged: "Demo publication used to verify source provenance, filtering, and digest rendering.",
    whoIsAffected: "Internal design-partner review only.",
    recommendedAction: "Run the fixture ingestion command or connect Postgres before live polling.",
    serviceOfferingIds: ["gc_regulatory_strategy_retainer"],
    rawHash: "demo-bafin-ready",
    scoreRationale: "Low-priority readiness item for the source adapter.",
    matchedLicences: ["casp_micar", "emi_emd", "payment_institution_psd"],
    matchedActivities: ["exchange_crypto_for_fiat", "issuance_of_e_money"],
    matchedJurisdictions: ["de", "bafin"],
    matchedTopics: [],
    scoringRuleVersion: "mvp-seed-v0",
  },
];

export const mockVersions: Record<string, PublicationVersionView[]> = {
  "pub-esma-qa-2845": [
    {
      id: "version-esma-1",
      versionNumber: 1,
      fetchedAt: "2026-05-12T10:10:00.000Z",
      rawHash: "demo-esma-qa-2845-v1",
      changeSummary: "Initial captured Q&A text.",
      diffFromPrevious: null,
    },
    {
      id: "version-esma-2",
      versionNumber: 2,
      fetchedAt: "2026-05-20T00:35:00.000Z",
      rawHash: "demo-esma-qa-2845",
      changeSummary: "Paragraph-level diff placeholder generated by the MVP pipeline.",
      diffFromPrevious:
        "--- previous\n+++ current\n@@\n- modified white paper format requirement\n+ machine-readable (XBRL) format requirement for modified white papers",
    },
  ],
};

export const mockParagraphDiffs: Record<string, ParagraphDiffView[]> = {
  "pub-esma-qa-2845": [
    {
      id: "paragraph-diff-esma-1",
      paragraphIndex: 0,
      changeType: "CHANGED",
      beforeText: "modified white paper format requirement",
      afterText: "machine-readable (XBRL) format requirement for modified white papers",
      unifiedDiff:
        "--- previous\n+++ current\n@@\n-modified white paper format requirement\n+machine-readable (XBRL) format requirement for modified white papers",
      semanticSummary:
        "The paragraph now points reviewers to the machine-readable filing requirement for modified MiCA white papers.",
    },
  ],
};

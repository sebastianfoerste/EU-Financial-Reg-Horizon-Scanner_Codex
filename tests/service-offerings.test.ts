import { describe, expect, it } from "vitest";

import { matchServiceOfferings, validateServiceOfferingRuleValues } from "@/lib/service-offerings";

describe("service offering mapping", () => {
  it("maps MiCA white paper classifications to the fixed-fee service package", () => {
    const offerings = matchServiceOfferings({
      regulationFamilies: ["micar"],
      activities: ["issuance_of_other_crypto_assets"],
      licenceTypes: ["casp_micar"],
      topicPaths: ["digital_assets_specific.white_paper_review"],
      jurisdictions: ["eu", "esma"],
    });

    expect(offerings.map((offering) => offering.id)).toContain("gc_micar_white_paper");
  });

  it("falls back to the regulatory strategy retainer for unmatched items", () => {
    const offerings = matchServiceOfferings({
      regulationFamilies: ["gdpr"],
      activities: ["reference_data_provision"],
      licenceTypes: ["none_unregulated"],
      topicPaths: ["gdpr.dpia"],
      jurisdictions: ["eu"],
    });

    expect(offerings.map((offering) => offering.id)).toEqual(["gc_regulatory_strategy_retainer"]);
  });

  it("validates catalogue rule values against the controlled taxonomy", () => {
    expect(validateServiceOfferingRuleValues("REGULATION_FAMILY", ["micar"])).toEqual(["micar"]);
    expect(() => validateServiceOfferingRuleValues("TOPIC", ["invented.topic"])).toThrow("Unknown taxonomy value");
  });
});

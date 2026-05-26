import { describe, expect, it } from "vitest";

import { transitionReviewStatus, validateClassificationCorrections } from "@/lib/review";

describe("review state transitions", () => {
  it("allows a pending item to move into approval", () => {
    expect(transitionReviewStatus("PENDING", "APPROVED")).toBe("APPROVED");
  });

  it("blocks archived items from being changed", () => {
    expect(() => transitionReviewStatus("ARCHIVED", "IN_REVIEW")).toThrow("Archived review items");
  });

  it("forces false positives back through review before approval", () => {
    expect(() => transitionReviewStatus("FALSE_POSITIVE", "APPROVED")).toThrow("False positives");
  });

  it("accepts taxonomy-backed correction fields and rejects invented tags", () => {
    expect(
      validateClassificationCorrections({
        regulationFamilies: ["micar"],
        licenceTypes: ["casp_micar"],
        jurisdictions: ["eu", "esma"],
        confidence: 0.88,
        serviceOfferingIds: ["gc_micar_white_paper"],
      }),
    ).toBeDefined();

    expect(() => validateClassificationCorrections({ licenceTypes: ["invented_licence"] })).toThrow(
      "Unknown taxonomy value",
    );
  });
});

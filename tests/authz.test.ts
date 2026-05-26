import { describe, expect, it } from "vitest";

import { assertOrganisationAccess, getReviewerName, type OperatorContext } from "@/lib/authz";

describe("organisation access", () => {
  const clientOperator: OperatorContext = {
    userId: "user-client",
    organisationId: "org-own",
    mode: "clerk",
    isInternalOperator: false,
    displayName: "Alice Reviewer",
  };

  it("allows client access to the active organisation", () => {
    expect(() => assertOrganisationAccess(clientOperator, "org-own")).not.toThrow();
  });

  it("blocks client access to another organisation", () => {
    expect(() => assertOrganisationAccess(clientOperator, "org-other")).toThrow("outside the active organisation");
  });

  it("allows internal operators to review tenant-specific records", () => {
    expect(() =>
      assertOrganisationAccess({ ...clientOperator, isInternalOperator: true }, "org-other"),
    ).not.toThrow();
  });

  it("uses authenticated identity for reviewer attribution", () => {
    expect(getReviewerName(clientOperator, "Forged Name")).toBe("Alice Reviewer");
    expect(
      getReviewerName(
        { ...clientOperator, mode: "demo", displayName: null },
        "Local Reviewer",
      ),
    ).toBe("Local Reviewer");
  });
});

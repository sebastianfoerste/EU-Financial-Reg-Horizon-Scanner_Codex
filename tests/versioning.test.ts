import { describe, expect, it } from "vitest";

import { decideVersionChange } from "@/lib/ingestion/store";

describe("publication versioning", () => {
  it("creates the initial version when no prior hash exists", () => {
    expect(
      decideVersionChange({
        previousRawHash: null,
        previousBodyText: null,
        nextRawHash: "next",
        nextBodyText: "body",
        previousVersionCount: 0,
      }),
    ).toMatchObject({ action: "create", versionNumber: 1 });
  });

  it("skips unchanged content", () => {
    expect(
      decideVersionChange({
        previousRawHash: "same",
        previousBodyText: "body",
        nextRawHash: "same",
        nextBodyText: "body",
        previousVersionCount: 1,
      }),
    ).toMatchObject({ action: "skip", versionNumber: 1 });
  });

  it("creates a diff-backed version for changed content", () => {
    const decision = decideVersionChange({
      previousRawHash: "old",
      previousBodyText: "old paragraph",
      nextRawHash: "new",
      nextBodyText: "new paragraph",
      previousVersionCount: 1,
    });

    expect(decision.action).toBe("version");
    expect(decision.versionNumber).toBe(2);
    expect(decision.diffFromPrevious).toContain("-old paragraph");
    expect(decision.diffFromPrevious).toContain("+new paragraph");
  });
});

import { describe, expect, it } from "vitest";

import { buildParagraphDiffs, createParagraphSnapshots } from "@/lib/paragraph-diff";

describe("paragraph diffing", () => {
  it("creates stable paragraph hashes", () => {
    const snapshots = createParagraphSnapshots("First paragraph.\n\nSecond paragraph.");

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].contentHash).toHaveLength(64);
    expect(snapshots[0].contentHash).toBe(createParagraphSnapshots("First paragraph.")[0].contentHash);
  });

  it("detects changed paragraphs", () => {
    const diffs = buildParagraphDiffs("Alpha.\n\nBeta.\n\nGamma.", "Alpha.\n\nBeta changed.\n\nDelta.");

    expect(diffs.map((diff) => diff.changeType)).toContain("CHANGED");
    expect(diffs.some((diff) => diff.unifiedDiff?.includes("Beta changed."))).toBe(true);
  });

  it("detects added and removed trailing paragraphs", () => {
    expect(buildParagraphDiffs("Alpha.\n\nBeta.", "Alpha.").map((diff) => diff.changeType)).toContain("REMOVED");
    expect(buildParagraphDiffs("Alpha.", "Alpha.\n\nBeta.").map((diff) => diff.changeType)).toContain("ADDED");
  });
});

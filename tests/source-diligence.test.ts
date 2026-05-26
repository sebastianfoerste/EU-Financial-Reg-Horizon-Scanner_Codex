import { describe, expect, it } from "vitest";

import { evaluateSourcePollingPolicy } from "@/lib/ingestion/pipeline";
import { getDefaultSourceDiligence, listSourceDiligence } from "@/lib/source-diligence";

describe("source diligence register", () => {
  it("provides fixture-backed Tier 1 diligence records in demo mode", async () => {
    const records = await listSourceDiligence();

    expect(records.length).toBeGreaterThanOrEqual(5);
    expect(records.map((record) => record.sourceCode)).toContain("eurlex");
    expect(records.find((record) => record.sourceCode === "eurlex")?.reuseStatus).toBe("REUSE_PERMITTED");
    expect(records.find((record) => record.sourceCode === "bundesbank")?.reuseStatus).toBe("REVIEW_REQUIRED");
    expect(records.find((record) => record.sourceCode === "esma_qna")?.reuseStatus).toBe("ATTRIBUTION_REQUIRED");
  });

  it("defaults unreviewed sources to blocked live polling", () => {
    expect(getDefaultSourceDiligence("new_authority", 60).reuseStatus).toBe("UNKNOWN");
    expect(
      evaluateSourcePollingPolicy({
        reuseStatus: "UNKNOWN",
        sourceCadenceMin: 60,
        allowedCadenceMin: 60,
      }),
    ).toMatchObject({ allowed: false });
  });

  it("honours approved minimum polling cadence", () => {
    expect(
      evaluateSourcePollingPolicy({
        reuseStatus: "ATTRIBUTION_REQUIRED",
        sourceCadenceMin: 60,
        allowedCadenceMin: 120,
        lastFetchedAt: new Date("2026-05-26T08:00:00.000Z"),
        now: new Date("2026-05-26T09:00:00.000Z"),
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluateSourcePollingPolicy({
        reuseStatus: "REUSE_PERMITTED",
        sourceCadenceMin: 60,
        allowedCadenceMin: 120,
        lastFetchedAt: new Date("2026-05-26T07:00:00.000Z"),
        now: new Date("2026-05-26T09:00:00.000Z"),
      }),
    ).toEqual({ allowed: true, reason: null });
  });
});

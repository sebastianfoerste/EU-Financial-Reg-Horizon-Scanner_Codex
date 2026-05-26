import { describe, expect, it } from "vitest";

import { GET as integrationHealth } from "@/app/api/integrations/health/route";
import { POST as reviewDecision } from "@/app/api/review/[publicationId]/decision/route";

describe("operator API routes", () => {
  it("returns runtime and integration health diagnostics", async () => {
    const response = await integrationHealth();
    const body = await response.json();

    expect(body.runtime.length).toBeGreaterThan(0);
    expect(body.integrations.map((item: { provider: string }) => item.provider)).toContain("RESEND");
  });

  it("accepts reviewed publication decisions in demo mode", async () => {
    const response = await reviewDecision(
      new Request("http://localhost/api/review/pub-esma-qa-2845/decision", {
        method: "POST",
        body: JSON.stringify({
          status: "IN_REVIEW",
          reason: "API route smoke test.",
          reviewerName: "Sebastian",
        }),
      }),
      { params: Promise.resolve({ publicationId: "pub-esma-qa-2845" }) },
    );
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, mode: "demo" });
  });
});

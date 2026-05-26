import { describe, expect, it } from "vitest";

import { parseNonSecretIntegrationConfig } from "@/lib/integration-configs";

describe("integration config governance", () => {
  it("accepts non-secret metadata JSON", () => {
    expect(
      parseNonSecretIntegrationConfig(
        JSON.stringify({
          channelName: "regulatory-alerts",
          hubspotPipeline: "default",
          owner: "regulatory practice",
        }),
      ),
    ).toMatchObject({ channelName: "regulatory-alerts" });
  });

  it("rejects non-object values", () => {
    expect(() => parseNonSecretIntegrationConfig("[]")).toThrow("JSON object");
  });

  it("rejects secret-like keys", () => {
    expect(() => parseNonSecretIntegrationConfig(JSON.stringify({ webhookUrl: "https://example.test" }))).toThrow(
      "environment variables",
    );
    expect(() => parseNonSecretIntegrationConfig(JSON.stringify({ nested: { accessToken: "x" } }))).toThrow(
      "environment variables",
    );
  });
});

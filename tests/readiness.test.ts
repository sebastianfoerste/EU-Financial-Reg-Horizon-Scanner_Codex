import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("fresh-checkout readiness", () => {
  it("runs Prisma generation before TypeScript validation in CI", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    const generateIndex = workflow.indexOf("npm run prisma:generate");
    const typecheckIndex = workflow.indexOf("npm run typecheck");

    expect(generateIndex).toBeGreaterThanOrEqual(0);
    expect(typecheckIndex).toBeGreaterThan(generateIndex);
  });

  it("documents Prisma generation in evaluator setup paths", () => {
    const readme = readFileSync("README.md", "utf8");
    const launchReadiness = readFileSync("docs/launch-readiness.md", "utf8");

    expect(readme).toContain("npm run prisma:generate");
    expect(launchReadiness).toContain("npm run prisma:generate");
  });
});

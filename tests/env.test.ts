import { describe, expect, it } from "vitest";

import { parseBooleanFlag } from "@/lib/env";

describe("environment parsing", () => {
  it("requires explicit demo fallback enablement when default is false", () => {
    expect(parseBooleanFlag(undefined, false)).toBe(false);
    expect(parseBooleanFlag("true", false)).toBe(true);
    expect(parseBooleanFlag("false", true)).toBe(false);
    expect(parseBooleanFlag("0", true)).toBe(false);
  });
});

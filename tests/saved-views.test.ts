import { describe, expect, it } from "vitest";

import { defaultSavedViews, savedViewToSearchParams } from "@/lib/saved-views";

describe("saved views", () => {
  it("ships default pilot search views", () => {
    expect(defaultSavedViews.map((view) => view.id)).toEqual([
      "default-micar",
      "default-dora",
      "default-bafin",
      "default-high-impact",
    ]);
  });

  it("serializes filters into URL search parameters", () => {
    expect(savedViewToSearchParams({ source: "bafin", tag: "micar", bucket: "HIGH" })).toBe(
      "source=bafin&tag=micar&bucket=HIGH",
    );
  });
});

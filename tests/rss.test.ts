import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverFeedUrls, htmlToText, parseRssFeed } from "@/lib/ingestion/rss";

describe("RSS ingestion", () => {
  it("normalizes RSS items into canonical publications", () => {
    const xml = readFileSync(resolve(process.cwd(), "tests/fixtures/esma-rss.xml"), "utf8");
    const publications = parseRssFeed(xml, {
      sourceCode: "esma",
      language: "en",
      publicationType: "q_and_a_published",
    });

    expect(publications).toHaveLength(1);
    expect(publications[0].title).toContain("MiCA Q&A");
    expect(publications[0].bodyText).toContain("white paper filing question");
    expect(publications[0].rawHash).toHaveLength(64);
  });

  it("extracts feed URLs from regulator discovery pages", () => {
    const urls = discoverFeedUrls(
      '<html><head><link type="application/rss+xml" href="/rss.xml" /></head><body></body></html>',
      "https://example.test/start",
    );

    expect(urls).toEqual(["https://example.test/rss.xml"]);
  });

  it("turns small HTML snippets into readable text", () => {
    expect(htmlToText("<main><p>DORA register of information</p><script>x()</script></main>")).toBe(
      "DORA register of information",
    );
  });

  it("does not persist invalid external publication dates", () => {
    const publications = parseRssFeed(
      "<rss><channel><item><title>Notice</title><link>https://example.test/notice</link><pubDate>invalid</pubDate></item></channel></rss>",
      { sourceCode: "bafin", language: "en", publicationType: "notice" },
    );

    expect(publications[0].publishedAt).toBeNull();
  });
});

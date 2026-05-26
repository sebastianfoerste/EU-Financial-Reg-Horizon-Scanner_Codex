import { afterEach, describe, expect, it, vi } from "vitest";

import { extractPdfLinks, extractReadableHtml, fetchAndExtractDetail } from "@/lib/extraction";

describe("source detail extraction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts readable text and PDF attachment provenance from HTML", () => {
    const html = `
      <html>
        <head><title>Consultation</title></head>
        <body>
          <main><h1>DORA consultation</h1><p>The register of information is affected.</p></main>
          <a href="/files/consultation.pdf">PDF</a>
        </body>
      </html>
    `;
    const detail = extractReadableHtml(html, "https://regulator.example/news");

    expect(detail.text).toContain("register of information");
    expect(detail.attachments[0]).toMatchObject({
      fileName: "consultation.pdf",
      sourceUrl: "https://regulator.example/files/consultation.pdf",
      extractionStatus: "PENDING",
    });
  });

  it("discovers absolute PDF links", () => {
    expect(extractPdfLinks('<a href="https://example.test/doc.pdf">doc</a>', "https://example.test")).toEqual([
      "https://example.test/doc.pdf",
    ]);
  });

  it("keeps readable HTML when a discovered PDF cannot be extracted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const target = String(url);
        if (target.endsWith(".pdf")) {
          return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
        }
        return new Response(
          "<main><h1>Consultation</h1><p>Primary publication text.</p><a href=\"/paper.pdf\">PDF</a></main>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }),
    );

    const detail = await fetchAndExtractDetail("https://regulator.example/consultation");

    expect(detail.text).toContain("Primary publication text");
    expect(detail.attachments[0]).toMatchObject({ extractionStatus: "FAILED", ocrRequired: true });
  });

  it("does not treat unsuccessful detail responses as publication text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));

    await expect(fetchAndExtractDetail("https://regulator.example/missing")).rejects.toThrow("HTTP 404");
  });
});

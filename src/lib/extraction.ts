import { basename } from "node:path";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import { getEnv } from "@/lib/env";
import { fetchText } from "@/lib/ingestion/http";
import { htmlToText } from "@/lib/ingestion/rss";

export type ExtractedAttachment = {
  fileName: string;
  mimeType: string;
  sourceUrl: string;
  sizeBytes: number;
  extractedText: string | null;
  extractionStatus: "PENDING" | "EXTRACTED" | "OCR_REQUIRED" | "FAILED";
  ocrRequired: boolean;
};

export type ExtractedDetail = {
  title: string | null;
  text: string;
  byline: string | null;
  excerpt: string | null;
  attachments: ExtractedAttachment[];
  sourceMetadataJson: Record<string, unknown>;
};

export function extractPdfLinks(html: string, baseUrl: string) {
  const dom = new JSDOM(html);
  const urls = new Set<string>();

  for (const element of dom.window.document.querySelectorAll("a[href]")) {
    const href = element.getAttribute("href");
    if (!href || !href.toLowerCase().includes(".pdf")) continue;
    urls.add(new URL(href, baseUrl).toString());
  }

  return [...urls];
}

export function extractReadableHtml(html: string, url: string): ExtractedDetail {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const pdfLinks = extractPdfLinks(html, url);
  const text = article?.textContent?.replace(/\s+/g, " ").trim() || htmlToText(html);

  return {
    title: article?.title ?? null,
    text,
    byline: article?.byline ?? null,
    excerpt: article?.excerpt ?? null,
    attachments: pdfLinks.map((sourceUrl) => ({
      fileName: basename(new URL(sourceUrl).pathname) || "attachment.pdf",
      mimeType: "application/pdf",
      sourceUrl,
      sizeBytes: 0,
      extractedText: null,
      extractionStatus: "PENDING",
      ocrRequired: false,
    })),
    sourceMetadataJson: {
      extractor: "readability",
      pdfLinks,
    },
  };
}

export async function extractPdfText(sourceUrl: string): Promise<ExtractedAttachment> {
  const env = getEnv();
  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/pdf,*/*;q=0.8",
      "user-agent": env.HORIZON_BOT_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`PDF fetch failed for ${sourceUrl}: HTTP ${response.status}.`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const baseAttachment = {
    fileName: basename(new URL(sourceUrl).pathname) || "attachment.pdf",
    mimeType: response.headers.get("content-type") ?? "application/pdf",
    sourceUrl,
    sizeBytes: buffer.byteLength,
  };

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text?.replace(/\s+/g, " ").trim() ?? "";

    return {
      ...baseAttachment,
      extractedText: text || null,
      extractionStatus: text ? "EXTRACTED" : "OCR_REQUIRED",
      ocrRequired: !text,
    };
  } catch {
    return {
      ...baseAttachment,
      extractedText: null,
      extractionStatus: "FAILED",
      ocrRequired: true,
    };
  }
}

export async function fetchAndExtractDetail(url: string): Promise<ExtractedDetail> {
  const response = await fetchText(url);
  if (response.contentType?.includes("application/pdf") || url.toLowerCase().includes(".pdf")) {
    const attachment = await extractPdfText(url);
    return {
      title: attachment.fileName,
      text: attachment.extractedText ?? "",
      byline: null,
      excerpt: null,
      attachments: [attachment],
      sourceMetadataJson: {
        extractor: "pdf-parse",
        sourceContentType: response.contentType,
        ocrRequired: attachment.ocrRequired,
      },
    };
  }

  const detail = extractReadableHtml(response.text, url);
  const attachments = await Promise.all(
    detail.attachments.map(async (attachment, index) => {
      if (index >= 3) return attachment;
      try {
        return await extractPdfText(attachment.sourceUrl);
      } catch {
        return {
          ...attachment,
          extractionStatus: "FAILED" as const,
          ocrRequired: true,
        };
      }
    }),
  );
  const attachmentText = attachments
    .filter((attachment) => attachment.extractedText)
    .map((attachment) => `Attachment: ${attachment.fileName}\n${attachment.extractedText}`)
    .join("\n\n");

  return {
    ...detail,
    text: attachmentText ? `${detail.text}\n\n${attachmentText}` : detail.text,
    attachments,
    sourceMetadataJson: {
      ...detail.sourceMetadataJson,
      extractedAttachmentCount: attachments.filter((attachment) => attachment.extractionStatus === "EXTRACTED").length,
      ocrRequiredAttachmentCount: attachments.filter((attachment) => attachment.ocrRequired).length,
      attachmentExtractionLimit: 3,
    },
  };
}

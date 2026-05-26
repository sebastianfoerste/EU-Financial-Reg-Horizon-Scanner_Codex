export type SourceDefinition = {
  code: string;
  displayName: string;
  jurisdictionCode: string;
  baseUrl: string;
  feedType: "RSS" | "ATOM" | "HTML_SCRAPE" | "API" | "EUR_LEX_API" | "EMAIL_INGEST";
  feedUrl?: string;
  pollIntervalMin: number;
  language: string;
  notes?: string;
};

export type SourceCursor = {
  etag?: string | null;
  lastModified?: string | null;
  cursorJson?: unknown;
};

export type CanonicalPublication = {
  sourceCode: string;
  sourceUrl: string;
  canonicalUrl?: string | null;
  externalId: string;
  title: string;
  publishedAt?: Date | null;
  fetchedAt: Date;
  language: string;
  publicationType: string;
  rawHash: string;
  bodyText: string;
  bodyMarkdown?: string | null;
  sourceMetadataJson?: Record<string, unknown>;
  hasAttachments?: boolean;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    sourceUrl: string;
    sizeBytes: number;
    extractedText: string | null;
    extractionStatus: "PENDING" | "EXTRACTED" | "OCR_REQUIRED" | "FAILED";
    ocrRequired: boolean;
  }>;
};

export type AdapterFetchResult = {
  publications: CanonicalPublication[];
  state?: SourceCursor;
  status?: Record<string, unknown>;
};

export type SourceAdapter = {
  source: SourceDefinition;
  fetch: (cursor?: SourceCursor) => Promise<AdapterFetchResult>;
};

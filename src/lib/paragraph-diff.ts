import { createPatch } from "diff";

import { sha256 } from "@/lib/hash";

export type ParagraphSnapshot = {
  paragraphIndex: number;
  contentHash: string;
  bodyText: string;
};

export type ParagraphDiffResult = {
  paragraphIndex: number;
  changeType: "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";
  beforeHash: string | null;
  afterHash: string | null;
  beforeText: string | null;
  afterText: string | null;
  unifiedDiff: string | null;
  semanticSummary: string | null;
};

export function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function createParagraphSnapshots(text: string): ParagraphSnapshot[] {
  return splitParagraphs(text).map((bodyText, paragraphIndex) => ({
    paragraphIndex,
    contentHash: sha256(bodyText),
    bodyText,
  }));
}

function deterministicSemanticSummary(changeType: ParagraphDiffResult["changeType"]) {
  if (changeType === "ADDED") return "A new paragraph was added.";
  if (changeType === "REMOVED") return "A paragraph was removed.";
  if (changeType === "CHANGED") return "A paragraph changed in substance or wording.";
  return "No paragraph change detected.";
}

export function diffParagraphSnapshots(
  previous: ParagraphSnapshot[],
  next: ParagraphSnapshot[],
): ParagraphDiffResult[] {
  const maxLength = Math.max(previous.length, next.length);
  const diffs: ParagraphDiffResult[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const before = previous[index] ?? null;
    const after = next[index] ?? null;
    const changeType: ParagraphDiffResult["changeType"] =
      before && after
        ? before.contentHash === after.contentHash
          ? "UNCHANGED"
          : "CHANGED"
        : before
          ? "REMOVED"
          : "ADDED";

    if (changeType === "UNCHANGED") continue;

    diffs.push({
      paragraphIndex: index,
      changeType,
      beforeHash: before?.contentHash ?? null,
      afterHash: after?.contentHash ?? null,
      beforeText: before?.bodyText ?? null,
      afterText: after?.bodyText ?? null,
      unifiedDiff:
        before?.bodyText || after?.bodyText
          ? createPatch(`paragraph-${index + 1}`, before?.bodyText ?? "", after?.bodyText ?? "")
          : null,
      semanticSummary: deterministicSemanticSummary(changeType),
    });
  }

  return diffs;
}

export function buildParagraphDiffs(previousText: string | null | undefined, nextText: string) {
  return diffParagraphSnapshots(
    previousText ? createParagraphSnapshots(previousText) : [],
    createParagraphSnapshots(nextText),
  );
}

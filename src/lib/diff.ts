import { createPatch } from "diff";

export function buildTextDiff(previousText: string, nextText: string, fileName = "publication") {
  if (previousText === nextText) return "";
  return createPatch(fileName, previousText, nextText, "previous", "current");
}

export function summarizeDiff(previousText: string, nextText: string) {
  if (!previousText) return "New publication. No prior version exists.";
  if (previousText === nextText) return "No textual change detected.";

  const previousParagraphs = previousText.split(/\n{2,}/).filter(Boolean);
  const nextParagraphs = nextText.split(/\n{2,}/).filter(Boolean);
  const changed = Math.abs(nextParagraphs.length - previousParagraphs.length);

  return `Text changed across ${Math.max(1, changed)} paragraph group${changed === 1 ? "" : "s"}. Semantic review remains queued for the MVP.`;
}

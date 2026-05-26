import { createHash } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function stableExternalId(sourceCode: string, sourceUrl: string, title: string) {
  return `${sourceCode}:${sha256(`${sourceUrl}:${title}`).slice(0, 24)}`;
}

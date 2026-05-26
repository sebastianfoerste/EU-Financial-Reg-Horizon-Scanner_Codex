"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { upsertSourceDiligence } from "@/lib/source-diligence";

const ReuseStatusSchema = z.enum(["UNKNOWN", "REUSE_PERMITTED", "ATTRIBUTION_REQUIRED", "REVIEW_REQUIRED", "RESTRICTED"]);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDate(formData: FormData, key: string) {
  const value = readText(formData, key);
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${key}`);
  return date;
}

export async function upsertSourceDiligenceAction(formData: FormData) {
  const cadenceInput = readText(formData, "allowedCadenceMin");
  const cadence = cadenceInput ? z.coerce.number().int().positive().parse(cadenceInput) : null;
  await upsertSourceDiligence({
    sourceId: z.string().min(1).parse(readText(formData, "sourceId")),
    reuseStatus: ReuseStatusSchema.parse(readText(formData, "reuseStatus")),
    attributionRequirement: readText(formData, "attributionRequirement") || null,
    robotsNotes: readText(formData, "robotsNotes") || null,
    allowedCadenceMin: cadence,
    lastReviewedAt: readDate(formData, "lastReviewedAt"),
    nextReviewAt: readDate(formData, "nextReviewAt"),
    ownerNotes: readText(formData, "ownerNotes") || null,
  });
  revalidatePath("/sources/diligence");
  redirect("/sources/diligence?updated=1");
}

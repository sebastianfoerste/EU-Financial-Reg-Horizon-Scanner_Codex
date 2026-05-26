"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReviewStatus } from "@prisma/client";

import { decideReviewItem } from "@/lib/review";

const statuses = ["PENDING", "IN_REVIEW", "APPROVED", "NEEDS_CHANGES", "FALSE_POSITIVE", "ARCHIVED"] as const;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readValues(formData: FormData, key: string) {
  return readText(formData, key)
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function readStatus(formData: FormData): ReviewStatus {
  const value = readText(formData, "status");
  if (!statuses.includes(value as (typeof statuses)[number])) {
    throw new Error(`Unknown review status: ${value}`);
  }
  return value as ReviewStatus;
}

export async function decideReviewAction(formData: FormData) {
  const publicationId = readText(formData, "publicationId");
  const status = readStatus(formData);
  const reason = readText(formData, "reason") || "Reviewed in pilot queue.";
  const reviewerName = readText(formData, "reviewerName") || "Sebastian";
  const deadline = readText(formData, "deadline");
  const confidence = Number(readText(formData, "confidence"));

  await decideReviewItem({
    publicationId,
    status,
    reason,
    reviewerName,
    corrections: {
      regulationFamilies: readValues(formData, "regulationFamilies"),
      activities: readValues(formData, "activities"),
      licenceTypes: readValues(formData, "licenceTypes"),
      topicPaths: readValues(formData, "topicPaths"),
      jurisdictions: readValues(formData, "jurisdictions"),
      summary: readText(formData, "summary") || undefined,
      whatChanged: readText(formData, "whatChanged") || undefined,
      whoIsAffected: readText(formData, "whoIsAffected") || undefined,
      deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`).toISOString() : null,
      recommendedAction: readText(formData, "recommendedAction") || undefined,
      serviceOfferingIds: readValues(formData, "serviceOfferingIds"),
      confidence: Number.isFinite(confidence) ? confidence : undefined,
    },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${publicationId}`);
  revalidatePath(`/publications/${publicationId}`);
  redirect(`/review/${publicationId}?reviewed=1`);
}

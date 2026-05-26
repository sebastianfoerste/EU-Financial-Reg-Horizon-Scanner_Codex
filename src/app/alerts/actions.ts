"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { approveAlert, generateAlertDrafts, sendApprovedAlert } from "@/lib/alerts";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function generateAlertDraftsAction() {
  await generateAlertDrafts();
  revalidatePath("/alerts");
  redirect("/alerts?generated=1");
}

export async function approveAlertAction(formData: FormData) {
  const alertId = readText(formData, "alertId");
  const reviewerName = readText(formData, "reviewerName") || "Sebastian";
  await approveAlert({ alertId, reviewerName });
  revalidatePath("/alerts");
  redirect("/alerts?approved=1");
}

export async function sendAlertAction(formData: FormData) {
  const alertId = readText(formData, "alertId");
  await sendApprovedAlert({ alertId });
  revalidatePath("/alerts");
  redirect("/alerts?sent=1");
}

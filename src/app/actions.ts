"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSavedView } from "@/lib/saved-views";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createSavedViewAction(formData: FormData) {
  await createSavedView({
    name: readText(formData, "name") || "Saved view",
    description: readText(formData, "description") || null,
    filters: {
      query: readText(formData, "query") || undefined,
      source: readText(formData, "source") || undefined,
      type: readText(formData, "type") || undefined,
      tag: readText(formData, "tag") || undefined,
      bucket: readText(formData, "bucket") || undefined,
      from: readText(formData, "from") || undefined,
      to: readText(formData, "to") || undefined,
    },
  });
  revalidatePath("/");
  redirect("/?saved=1");
}

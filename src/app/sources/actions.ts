"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireInternalOperator } from "@/lib/authz";
import { pollTierOneSources } from "@/lib/ingestion/pipeline";

export async function pollApprovedSourcesAction() {
  await requireInternalOperator();
  const results = await pollTierOneSources();
  const failed = results.filter((result) => result.status === "FAILED").length;
  const skipped = results.filter((result) => result.status === "SKIPPED").length;

  revalidatePath("/sources");
  redirect(`/sources?polled=1&failed=${failed}&skipped=${skipped}`);
}

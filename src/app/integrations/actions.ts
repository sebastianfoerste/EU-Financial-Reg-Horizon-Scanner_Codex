"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseNonSecretIntegrationConfig, upsertIntegrationConfig } from "@/lib/integration-configs";

const ProviderSchema = z.enum(["RESEND", "SLACK", "MS_TEAMS", "HUBSPOT"]);
const StatusSchema = z.enum(["ENABLED", "DISABLED", "MISCONFIGURED"]);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function upsertIntegrationConfigAction(formData: FormData) {
  await upsertIntegrationConfig({
    provider: ProviderSchema.parse(readText(formData, "provider")),
    displayName: z.string().min(1).parse(readText(formData, "displayName")),
    status: StatusSchema.parse(readText(formData, "status")),
    nonSecretConfigJson: parseNonSecretIntegrationConfig(readText(formData, "nonSecretConfigJson")),
    organisationId: readText(formData, "organisationId") || null,
  });
  revalidatePath("/integrations");
  redirect("/integrations?integration=1");
}

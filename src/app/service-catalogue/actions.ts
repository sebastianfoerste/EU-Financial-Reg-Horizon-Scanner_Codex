"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { updateServiceOffering, upsertServiceOfferingRule } from "@/lib/service-offerings";

const RuleAxisSchema = z.enum(["REGULATION_FAMILY", "ACTIVITY", "LICENCE_TYPE", "TOPIC", "JURISDICTION"]);
const OfferingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  priceIndication: z.string().min(1),
  calendlyUrl: z.union([z.url(), z.literal("")]),
  hubspotDealStage: z.string(),
});

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readValues(formData: FormData) {
  return readText(formData, "values")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function updateServiceOfferingAction(formData: FormData) {
  const input = OfferingSchema.parse({
    id: readText(formData, "id"),
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    priceIndication: readText(formData, "priceIndication"),
    calendlyUrl: readText(formData, "calendlyUrl"),
    hubspotDealStage: readText(formData, "hubspotDealStage"),
  });
  await updateServiceOffering({
    id: input.id,
    name: input.name,
    description: input.description,
    priceIndication: input.priceIndication,
    calendlyUrl: input.calendlyUrl || null,
    hubspotDealStage: input.hubspotDealStage || null,
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/service-catalogue");
  redirect("/service-catalogue?updated=1");
}

export async function upsertServiceOfferingRuleAction(formData: FormData) {
  await upsertServiceOfferingRule({
    id: readText(formData, "id") || undefined,
    serviceOfferingId: readText(formData, "serviceOfferingId"),
    axis: RuleAxisSchema.parse(readText(formData, "axis")),
    values: readValues(formData),
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/service-catalogue");
  redirect("/service-catalogue?rule=1");
}

import { Save, SlidersHorizontal } from "lucide-react";

import { updateServiceOfferingAction, upsertServiceOfferingRuleAction } from "@/app/service-catalogue/actions";
import { AppShell } from "@/components/app-shell";
import { requireInternalOperator } from "@/lib/authz";
import { listServiceCatalogue } from "@/lib/service-offerings";

export const dynamic = "force-dynamic";

const axes = ["REGULATION_FAMILY", "ACTIVITY", "LICENCE_TYPE", "TOPIC", "JURISDICTION"];

export default async function ServiceCataloguePage() {
  await requireInternalOperator();
  const offerings = await listServiceCatalogue();

  return (
    <AppShell active="/service-catalogue">
      <div className="space-y-6">
        <section className="border-b border-zinc-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Service catalogue</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
            Govern fixed-fee packages and alert trigger rules.
          </h1>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {offerings.map((offering) => (
            <article key={offering.id} className="rounded-md border border-zinc-200 bg-white p-5">
              <form action={updateServiceOfferingAction} className="space-y-4">
                <input type="hidden" name="id" value={offering.id} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">{offering.id}</p>
                    <Input name="name" label="Package name" defaultValue={offering.name} />
                  </div>
                  <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700">
                    <input name="isActive" type="checkbox" defaultChecked={offering.isActive} className="h-4 w-4" />
                    Active
                  </label>
                </div>
                <Textarea name="description" label="Description" defaultValue={offering.description} />
                <div className="grid gap-4 md:grid-cols-3">
                  <Input name="priceIndication" label="Price indication" defaultValue={offering.priceIndication} />
                  <Input name="calendlyUrl" label="Calendly URL" defaultValue={offering.calendlyUrl ?? ""} />
                  <Input name="hubspotDealStage" label="HubSpot stage" defaultValue={offering.hubspotDealStage ?? ""} />
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save package
                </button>
              </form>

              <div className="mt-5 border-t border-zinc-200 pt-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-zinc-500">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Trigger rules
                </h2>
                <div className="mt-3 space-y-3">
                  {offering.rules.map((rule) => (
                    <form key={rule.id} action={upsertServiceOfferingRuleAction} className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="serviceOfferingId" value={offering.id} />
                      <div className="grid gap-2 md:grid-cols-[0.6fr_1fr_auto]">
                        <Select name="axis" label="Axis" options={axes} defaultValue={rule.axis} />
                        <Input name="values" label="Values" defaultValue={rule.values.join(", ")} />
                        <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700">
                          <input name="isActive" type="checkbox" defaultChecked={rule.isActive} className="h-4 w-4" />
                          Active
                        </label>
                      </div>
                      <button className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                        Save rule
                      </button>
                    </form>
                  ))}
                  <form action={upsertServiceOfferingRuleAction} className="grid gap-2 rounded-md border border-dashed border-zinc-300 bg-white p-3">
                    <input type="hidden" name="serviceOfferingId" value={offering.id} />
                    <div className="grid gap-2 md:grid-cols-[0.6fr_1fr_auto]">
                      <Select name="axis" label="Axis" options={axes} defaultValue="TOPIC" />
                      <Input name="values" label="Values" defaultValue="" />
                      <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700">
                        <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
                        Active
                      </label>
                    </div>
                    <button className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                      Add rule
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function Input({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-zinc-950"
      />
    </label>
  );
}

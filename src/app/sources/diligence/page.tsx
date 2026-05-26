import Link from "next/link";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";

import { upsertSourceDiligenceAction } from "@/app/sources/diligence/actions";
import { AppShell } from "@/components/app-shell";
import { requireInternalOperator } from "@/lib/authz";
import { listSourceDiligence } from "@/lib/source-diligence";

export const dynamic = "force-dynamic";

const reuseStatuses = ["UNKNOWN", "REUSE_PERMITTED", "ATTRIBUTION_REQUIRED", "REVIEW_REQUIRED", "RESTRICTED"];

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default async function SourceDiligencePage() {
  await requireInternalOperator();
  const records = await listSourceDiligence();

  return (
    <AppShell active="/sources">
      <div className="space-y-6">
        <Link href="/sources" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Sources
        </Link>

        <section className="border-b border-zinc-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Source diligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
            Reuse, attribution, cadence, and owner review register.
          </h1>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {records.map((record) => (
            <article key={record.id} className="rounded-md border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase text-zinc-500">{record.sourceCode}</p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-950">{record.sourceName}</h2>
                  <a href={record.baseUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-teal-800">
                    {record.baseUrl}
                  </a>
                </div>
                <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
              </div>

              <form action={upsertSourceDiligenceAction} className="space-y-4">
                <input type="hidden" name="sourceId" value={record.sourceId} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select name="reuseStatus" label="Reuse status" options={reuseStatuses} defaultValue={record.reuseStatus} />
                  <Input
                    name="allowedCadenceMin"
                    label="Allowed cadence minutes"
                    defaultValue={record.allowedCadenceMin?.toString() ?? ""}
                  />
                </div>
                <Textarea
                  name="attributionRequirement"
                  label="Attribution requirement"
                  defaultValue={record.attributionRequirement ?? ""}
                />
                <Textarea name="robotsNotes" label="Robots and scraping notes" defaultValue={record.robotsNotes ?? ""} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="lastReviewedAt" label="Last review" defaultValue={dateValue(record.lastReviewedAt)} type="date" />
                  <Input name="nextReviewAt" label="Next review" defaultValue={dateValue(record.nextReviewAt)} type="date" />
                </div>
                <Textarea name="ownerNotes" label="Owner notes" defaultValue={record.ownerNotes ?? ""} />
                <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save diligence
                </button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</span>
      <input
        type={type}
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

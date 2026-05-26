import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, Building2, GitBranch, MapPinned, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createProductMapAction } from "@/app/product-maps/actions";
import { getActiveOrganisationId } from "@/lib/authz";
import { listProductMaps } from "@/lib/product-maps";
import { loadTaxonomy, getJurisdictionValues } from "@/lib/taxonomy";
import { compactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const customerSegments = ["RETAIL", "PROFESSIONAL", "ELIGIBLE_COUNTERPARTY", "CORPORATE", "INSTITUTIONAL"];

export default async function ProductMapsPage() {
  const organisationId = await getActiveOrganisationId();
  const [productMaps, taxonomy] = await Promise.all([listProductMaps(organisationId), Promise.resolve(loadTaxonomy())]);
  const jurisdictionValues = getJurisdictionValues(taxonomy);

  return (
    <AppShell active="/product-maps">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <section className="space-y-4">
          <div className="border-b border-zinc-200 pb-6">
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Client footprint</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Product maps drive the impact score.
            </h1>
          </div>

          <div className="space-y-3">
            {productMaps.map((productMap) => (
              <article key={productMap.id} className="rounded-md border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">{productMap.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">{productMap.organisationName}</p>
                  </div>
                  <Link
                    href={`/product-maps/${productMap.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    aria-label={`Open ${productMap.name}`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Metric icon={ShieldCheck} label="Licences" value={productMap.licences.length.toString()} />
                  <Metric icon={GitBranch} label="Product lines" value={productMap.productLines.length.toString()} />
                  <Metric icon={MapPinned} label="Jurisdictions" value={productMap.jurisdictions.length.toString()} />
                </div>
                <p className="mt-3 text-xs text-zinc-500">Updated {compactDate(productMap.updatedAt)}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-md border border-zinc-200 bg-white p-5">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">MVP intake</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">Create a product map</h2>
          </div>
          <form action={createProductMapAction} className="space-y-4">
            <Input name="organisationName" label="Organisation" defaultValue="Design Partner CASP GmbH" />
            <Input name="productMapName" label="Product map" defaultValue="EU crypto and payments footprint" />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select name="licenceType" label="Licence type" options={taxonomy.licence_type} defaultValue="casp_micar" />
              <Input name="issuingAuthority" label="Issuing authority" defaultValue="bafin" />
            </div>

            <Input name="productLineName" label="Product line" defaultValue="Crypto exchange and custody" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                name="activity"
                label="Primary activity"
                options={taxonomy.activity}
                defaultValue="custody_safekeeping_crypto"
              />
              <Select
                name="customerSegment"
                label="Customer segment"
                options={customerSegments}
                defaultValue="PROFESSIONAL"
              />
            </div>

            <Select name="jurisdictionCode" label="Home jurisdiction" options={jurisdictionValues} defaultValue="de" />

            <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <input name="isCritical" type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
              Critical product line
            </label>

            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Save product map
            </button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <Icon className="mb-2 h-4 w-4 text-teal-700" aria-hidden={true} />
      <p className="text-lg font-semibold text-zinc-950">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
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

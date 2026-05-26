import Link from "next/link";
import { Activity, AlertTriangle, CircleAlert, Clock, Database } from "lucide-react";

import { createSavedViewAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PublicationFilters } from "@/components/publication-filters";
import { PublicationTable } from "@/components/publication-table";
import { getActiveOrganisationId } from "@/lib/authz";
import { getAvailableFilters, listPublications } from "@/lib/publications";
import { listSavedViews, savedViewToSearchParams } from "@/lib/saved-views";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: PageProps) {
  try {
    return await LoadedHome({ searchParams });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    return <DashboardUnavailable />;
  }
}

function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return ["P1001", "P1002", "P1017"].includes(String(error.code));
}

async function LoadedHome({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    source: readParam(params.source),
    type: readParam(params.type),
    tag: readParam(params.tag),
    query: readParam(params.query),
    bucket: readParam(params.bucket),
    from: readParam(params.from),
    to: readParam(params.to),
  };
  const organisationId = await getActiveOrganisationId();
  const [publications, filterData, savedViews] = await Promise.all([
    listPublications(filters, organisationId),
    getAvailableFilters(organisationId),
    listSavedViews(organisationId),
  ]);
  const highImpactCount = publications.filter((publication) =>
    ["CRITICAL", "HIGH"].includes(publication.impactBucket),
  ).length;
  const sourceCount = new Set(publications.map((publication) => publication.sourceCode)).size;

  return (
    <AppShell active="/">
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Scanner cockpit</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Regulatory publications within the 24-hour window.
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <Database className="mb-2 h-4 w-4 text-teal-700" aria-hidden="true" />
              <p className="text-2xl font-semibold text-zinc-950">{sourceCount}</p>
              <p className="text-xs text-zinc-500">Sources</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <Activity className="mb-2 h-4 w-4 text-teal-700" aria-hidden="true" />
              <p className="text-2xl font-semibold text-zinc-950">{publications.length}</p>
              <p className="text-xs text-zinc-500">Items</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <AlertTriangle className="mb-2 h-4 w-4 text-red-700" aria-hidden="true" />
              <p className="text-2xl font-semibold text-zinc-950">{highImpactCount}</p>
              <p className="text-xs text-zinc-500">High impact</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <Clock className="mb-2 h-4 w-4 text-zinc-700" aria-hidden="true" />
              <p className="text-2xl font-semibold text-zinc-950">24h</p>
              <p className="text-xs text-zinc-500">SLA target</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {savedViews.map((view) => (
            <a
              key={view.id}
              href={`/?${savedViewToSearchParams(view.filters)}`}
              className="rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-400"
            >
              <p className="text-sm font-semibold text-zinc-950">{view.name}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{view.description}</p>
            </a>
          ))}
        </section>

        <PublicationFilters filters={filters} filterData={filterData} />
        <form action={createSavedViewAction} className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="query" value={filters.query ?? ""} />
          <input type="hidden" name="source" value={filters.source ?? ""} />
          <input type="hidden" name="type" value={filters.type ?? ""} />
          <input type="hidden" name="tag" value={filters.tag ?? ""} />
          <input type="hidden" name="bucket" value={filters.bucket ?? ""} />
          <input type="hidden" name="from" value={filters.from ?? ""} />
          <input type="hidden" name="to" value={filters.to ?? ""} />
          <label>
            <span className="sr-only">Saved view name</span>
            <input
              name="name"
              placeholder="Saved view name"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
            />
          </label>
          <label>
            <span className="sr-only">Saved view description</span>
            <input
              name="description"
              placeholder="Description"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
            />
          </label>
          <button className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            Save current view
          </button>
        </form>
        <PublicationTable publications={publications} />
      </div>
    </AppShell>
  );
}

function DashboardUnavailable() {
  return (
    <AppShell active="/">
      <section className="mx-auto max-w-xl rounded-md border border-amber-200 bg-white p-6">
        <CircleAlert className="h-5 w-5 text-amber-700" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold uppercase tracking-normal text-amber-800">Data unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
          Current publication data could not be loaded.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Review runtime diagnostics before relying on alerts or publication status.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/integrations"
            className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Open diagnostics
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Retry
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

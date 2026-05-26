import Link from "next/link";
import { RefreshCw, Rss, ShieldCheck } from "lucide-react";

import { pollApprovedSourcesAction } from "@/app/sources/actions";
import { AppShell } from "@/components/app-shell";
import { requireOperator } from "@/lib/authz";
import { getTierOneAdapters } from "@/lib/ingestion/adapters";
import { listSourceDiligence } from "@/lib/source-diligence";
import { compactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SourcesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readableStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const adapters = getTierOneAdapters();
  const params = await searchParams;
  const [operator, diligence] = await Promise.all([requireOperator(), listSourceDiligence()]);
  const byCode = new Map(diligence.map((record) => [record.sourceCode, record]));
  const mayPoll = operator.mode === "demo" || operator.isInternalOperator;

  return (
    <AppShell active="/sources">
      <div className="space-y-6">
        <section className="border-b border-zinc-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Tier 1 source estate</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">
              Live adapters with fixture-backed parsing.
            </h1>
            <div className="flex flex-wrap gap-2">
              {mayPoll ? (
                <form action={pollApprovedSourcesAction}>
                  <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Poll approved sources
                  </button>
                </form>
              ) : null}
              {mayPoll ? (
                <Link
                  href="/sources/diligence"
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Source diligence
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {readParam(params.polled) ? (
          <p className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
            Poll run completed. Skipped by policy or cadence: {readParam(params.skipped) ?? "0"}. Failed:
            {" "}
            {readParam(params.failed) ?? "0"}.
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {adapters.map((adapter) => {
            const policy = byCode.get(adapter.source.code);
            return (
            <article key={adapter.source.code} className="rounded-md border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{adapter.source.displayName}</p>
                  <p className="mt-1 text-xs uppercase text-zinc-500">{adapter.source.feedType}</p>
                </div>
                <Rss className="h-4 w-4 text-teal-700" aria-hidden="true" />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <dt className="text-zinc-500">Jurisdiction</dt>
                  <dd className="min-w-0 text-right font-medium uppercase text-zinc-950">{adapter.source.jurisdictionCode}</dd>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <dt className="text-zinc-500">Cadence</dt>
                  <dd className="min-w-0 text-right font-medium text-zinc-950">
                    {policy?.allowedCadenceMin ?? adapter.source.pollIntervalMin} min
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <dt className="text-zinc-500">Reuse</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-zinc-950">
                    {readableStatus(policy?.reuseStatus ?? "UNKNOWN")}
                  </dd>
                </div>
              </dl>
              {policy?.lastRun ? (
                <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs leading-5 text-zinc-600">
                  Last run {policy.lastRun.status}, {compactDate(policy.lastRun.finishedAt)}
                  {policy.lastRun.message ? `: ${policy.lastRun.message}` : ""}
                </p>
              ) : null}
              {adapter.source.feedUrl ? (
                <a
                  href={adapter.source.feedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block break-all text-xs font-medium text-teal-800 hover:text-teal-950"
                >
                  {adapter.source.feedUrl}
                </a>
              ) : null}
            </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}

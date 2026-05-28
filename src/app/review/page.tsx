import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireInternalOperator } from "@/lib/authz";
import { listReviewQueue } from "@/lib/review";
import { summarizeReviewReadiness } from "@/lib/review-readiness";
import { cn, compactDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const operator = await requireInternalOperator();
  const organisationId = operator.mode === "clerk" ? (operator.organisationId ?? undefined) : undefined;
  const items = await listReviewQueue(organisationId);
  const pendingCount = items.filter((item) => item.status === "PENDING" || item.status === "IN_REVIEW").length;
  const approvedCount = items.filter((item) => item.status === "APPROVED").length;

  return (
    <AppShell active="/review">
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Human review</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Approved content becomes eligible for alert drafts.
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Open" value={pendingCount.toString()} />
            <Metric label="Approved" value={approvedCount.toString()} />
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <ClipboardCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Review queue
            </div>
          </div>
          <div className="divide-y divide-zinc-200">
            {items.map((item) => {
              const readiness = summarizeReviewReadiness(item);
              return (
                <article key={item.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold uppercase text-zinc-700">{item.publication.sourceCode}</span>
                      <span>{item.publication.publicationType}</span>
                      <span>{item.status}</span>
                      <span>Updated {compactDateTime(item.updatedAt)}</span>
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-md border px-2 font-semibold",
                          readiness.readyForAlertDraft
                            ? "border-teal-200 bg-teal-50 text-teal-800"
                            : "border-red-200 bg-red-50 text-red-800",
                        )}
                      >
                        {readiness.readyForAlertDraft ? "Ready" : `${readiness.blockingCount} blocker${readiness.blockingCount === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <Link href={`/review/${item.publicationId}`} className="text-sm font-semibold text-zinc-950">
                      {item.publication.title}
                    </Link>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                      {item.publication.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <StatusBadge bucket={item.publication.impactBucket} score={item.publication.impactScore} />
                    <Link
                      href={`/review/${item.publicationId}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      aria-label={`Review ${item.publication.title}`}
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

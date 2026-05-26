import Link from "next/link";
import { Check, CircleAlert, Send, ShieldCheck } from "lucide-react";

import { approveAlertAction, generateAlertDraftsAction, sendAlertAction } from "@/app/alerts/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { canApproveAlertStatus, listAlerts } from "@/lib/alerts";
import { getActiveOrganisationId } from "@/lib/authz";
import { listIntegrationDiagnostics } from "@/lib/delivery";
import { compactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const impactBuckets = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"] as const;

function readImpactBucket(value: string) {
  return impactBuckets.includes(value as (typeof impactBuckets)[number])
    ? (value as (typeof impactBuckets)[number])
    : "NONE";
}

export default async function AlertsPage() {
  const organisationId = await getActiveOrganisationId();
  const [alerts, integrations] = await Promise.all([
    listAlerts(organisationId),
    listIntegrationDiagnostics(organisationId),
  ]);
  const openDrafts = alerts.filter((alert) => alert.status === "DRAFT").length;

  return (
    <AppShell active="/alerts">
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Approved delivery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Alert drafts stay gated until review and explicit send.
            </h1>
          </div>
          <form action={generateAlertDraftsAction}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
              <CircleAlert className="h-4 w-4" aria-hidden="true" />
              Generate drafts
            </button>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Drafts" value={openDrafts.toString()} />
          {integrations.slice(0, 3).map((integration) => (
            <div key={integration.provider} className="rounded-md border border-zinc-200 bg-white p-3">
              <p className="text-sm font-semibold text-zinc-950">{integration.label}</p>
              <p className={integration.configured && integration.databaseStatus === "ENABLED" ? "mt-1 text-xs text-teal-700" : "mt-1 text-xs text-amber-700"}>
                {integration.configured && integration.databaseStatus === "ENABLED" ? "Ready" : "Action needed"}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Alert drafts and sends</h2>
          </div>
          <div className="divide-y divide-zinc-200">
            {alerts.map((alert) => (
              <article key={alert.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_260px]">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold uppercase text-zinc-700">{alert.channel}</span>
                    <span>{alert.status}</span>
                    <span>{alert.publicationSource}</span>
                    <span>Scheduled {compactDate(alert.scheduledFor)}</span>
                  </div>
                  <Link href={`/publications/${alert.publicationId}`} className="text-sm font-semibold text-zinc-950">
                    {alert.publicationTitle}
                  </Link>
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {alert.payload.text}
                  </p>
                  {alert.errorMessage ? (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      {alert.errorMessage}
                    </p>
                  ) : null}
                  {alert.deliveryAttempts.length ? (
                    <div className="mt-3 space-y-1 text-xs text-zinc-500">
                      {alert.deliveryAttempts.map((attempt) => (
                        <p key={attempt.id}>
                          {attempt.provider} {attempt.status}, {compactDate(attempt.attemptedAt)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <StatusBadge bucket={readImpactBucket(alert.payload.impactBucket)} score={alert.payload.impactScore} />
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Impact explanation</p>
                    <p className="mt-2 text-sm text-zinc-700">
                      Bucket {alert.payload.impactBucket}, raw score {alert.payload.impactScore}. Services:
                      {" "}
                      {alert.payload.serviceOfferingIds.join(", ") || "none"}
                    </p>
                  </div>
                  <form action={approveAlertAction} className="flex gap-2">
                    <input type="hidden" name="alertId" value={alert.id} />
                    <input type="hidden" name="reviewerName" value="Sebastian" />
                    <button
                      disabled={!canApproveAlertStatus(alert.status)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {alert.status === "DRAFT"
                        ? "Approve"
                        : canApproveAlertStatus(alert.status)
                          ? "Reapprove"
                          : "Approval closed"}
                    </button>
                  </form>
                  <form action={sendAlertAction}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <button
                      disabled={alert.status !== "APPROVED"}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white enabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Send reviewed alert
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                No alert drafts yet. Approve review items, then generate drafts. Send reviewed alert becomes available
                only after explicit approval.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <ShieldCheck className="mb-2 h-4 w-4 text-teal-700" aria-hidden="true" />
      <p className="text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

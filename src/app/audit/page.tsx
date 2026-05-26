import { ScrollText } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getActiveOrganisationId } from "@/lib/authz";
import { listAuditLogs } from "@/lib/audit";
import { compactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const organisationId = await getActiveOrganisationId();
  const logs = await listAuditLogs(organisationId);

  return (
    <AppShell active="/audit">
      <div className="space-y-6">
        <section className="border-b border-zinc-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Audit log</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
            Review, alert, and integration actions are visible here.
          </h1>
        </section>

        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <ScrollText className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Latest events
            </div>
          </div>
          <div className="divide-y divide-zinc-200">
            {logs.map((log) => (
              <article key={log.id} className="grid gap-3 p-4 md:grid-cols-[0.8fr_1.2fr_1fr]">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{log.action}</p>
                  <p className="mt-1 text-xs text-zinc-500">{compactDate(log.createdAt)}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-zinc-500">{log.entityType}</p>
                  <p className="mt-1 break-all text-sm text-zinc-700">{log.entityId}</p>
                </div>
                <pre className="max-h-40 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50">
                  {JSON.stringify(log.payloadJson ?? {}, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

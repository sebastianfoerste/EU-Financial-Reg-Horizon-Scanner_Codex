import Link from "next/link";
import { Mail, Send } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getActiveOrganisationId } from "@/lib/authz";
import { getDigestPreview } from "@/lib/publications";
import { compactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const organisationId = await getActiveOrganisationId();
  const digest = await getDigestPreview(organisationId);

  return (
    <AppShell active="/digest">
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">Dry-run digest</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">{digest.subject}</h1>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-3">
            <Mail className="mb-2 h-4 w-4 text-teal-700" aria-hidden="true" />
            <p className="text-sm font-semibold text-zinc-950">{compactDate(digest.generatedAt)}</p>
            <p className="text-xs text-zinc-500">Generated</p>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <Send className="h-4 w-4" aria-hidden="true" />
              Preview
            </div>
          </div>
          <div className="divide-y divide-zinc-200">
            {digest.items.map((item) => (
              <div key={item.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold uppercase text-zinc-700">{item.sourceCode}</span>
                    <span>{item.publicationType}</span>
                    <span>{compactDate(item.publishedAt)}</span>
                  </div>
                  <Link href={`/publications/${item.id}`} className="text-base font-semibold text-zinc-950">
                    {item.title}
                  </Link>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{item.summary}</p>
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
                    Impact explanation: {item.scoreRationale} Rule version {item.scoringRuleVersion}.
                  </p>
                </div>
                <StatusBadge bucket={item.impactBucket} score={item.impactScore} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

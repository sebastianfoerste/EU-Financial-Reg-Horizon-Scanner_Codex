import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { TagList } from "@/components/tag-list";
import { getActiveOrganisationId } from "@/lib/authz";
import { scorePublicationForProductMap } from "@/lib/impact-scoring";
import { getProductMap } from "@/lib/product-maps";
import { listPublications } from "@/lib/publications";
import { loadScoringRules } from "@/lib/scoring-rules";

type DetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductMapDetailPage({ params }: DetailProps) {
  const { id } = await params;
  const organisationId = await getActiveOrganisationId();
  const [productMap, publications] = await Promise.all([
    getProductMap(id, organisationId),
    listPublications({}, organisationId),
  ]);
  if (!productMap) notFound();

  const rules = loadScoringRules();
  const scoredPublications = publications
    .map((publication) => ({
      publication,
      score: scorePublicationForProductMap({
        publicationType: publication.publicationType,
        productMap,
        classification: publication.tags,
      }),
    }))
    .sort((a, b) => b.score.score - a.score.score);

  return (
    <AppShell active="/product-maps">
      <div className="space-y-6">
        <Link
          href="/product-maps"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Product maps
        </Link>

        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">
                {productMap.organisationName}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">{productMap.name}</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Scoring rule version {rules.version}. Product-map facts remain local.
              </p>
            </div>
            <form action="/api/impact/recalculate" method="post">
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Recalculate stored scores
              </button>
            </form>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.35fr]">
          <aside className="min-w-0 space-y-4">
            <FootprintGroup title="Licences" tags={productMap.licences.map((licence) => licence.licenceType)} />
            <FootprintGroup
              title="Activities"
              tags={productMap.productLines.flatMap((line) => line.activities)}
            />
            <FootprintGroup
              title="Jurisdictions"
              tags={productMap.jurisdictions.flatMap((jurisdiction) =>
                [jurisdiction.jurisdictionCode, jurisdiction.authority].filter(Boolean) as string[],
              )}
            />
          </aside>

          <section className="min-w-0 overflow-hidden rounded-md border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Impact preview</h2>
            </div>
            <div className="divide-y divide-zinc-200">
              {scoredPublications.map(({ publication, score }) => (
                <article key={publication.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold uppercase text-zinc-700">{publication.sourceCode}</span>
                      <span>{publication.publicationType}</span>
                    </div>
                    <Link href={`/publications/${publication.id}`} className="text-sm font-semibold text-zinc-950">
                      {publication.title}
                    </Link>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{score.rationale}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Rule version {score.ruleVersion}. Licence matches {score.matchedLicences.length}, activity
                      matches {score.matchedActivities.length}, jurisdiction matches {score.matchedJurisdictions.length}.
                    </p>
                    <div className="mt-3">
                      <TagList tags={[...score.matchedLicences, ...score.matchedActivities, ...score.matchedJurisdictions]} />
                    </div>
                  </div>
                  <StatusBadge bucket={score.bucket} score={score.score} />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function FootprintGroup({ title, tags }: { title: string; tags: string[] }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-zinc-500">{title}</h2>
      <TagList tags={[...new Set(tags)]} limit={20} />
    </section>
  );
}

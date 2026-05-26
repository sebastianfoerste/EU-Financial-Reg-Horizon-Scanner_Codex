import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Scale } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ImpactExplanationPanel } from "@/components/impact-explanation-panel";
import { StatusBadge } from "@/components/status-badge";
import { TagList } from "@/components/tag-list";
import { getActiveOrganisationId } from "@/lib/authz";
import { getPublication, getPublicationParagraphDiffs, getPublicationVersions } from "@/lib/publications";
import { getRoutedServiceOfferings } from "@/lib/service-offerings";
import { loadTaxonomy } from "@/lib/taxonomy";
import { compactDate } from "@/lib/utils";

type DetailProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicationDetailPage({ params }: DetailProps) {
  const { id } = await params;
  const organisationId = await getActiveOrganisationId();
  const [publication, versions, paragraphDiffs] = await Promise.all([
    getPublication(id, organisationId),
    getPublicationVersions(id),
    getPublicationParagraphDiffs(id),
  ]);

  if (!publication) notFound();

  const taxonomy = loadTaxonomy();
  const offerings = await getRoutedServiceOfferings(publication.serviceOfferingIds);
  const consultationUrl =
    offerings.find((offering) => offering.calendlyUrl)?.calendlyUrl ?? "https://www.gunnercooke.com";

  return (
    <AppShell active="/">
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Publications
        </Link>

        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-semibold uppercase text-zinc-700">{publication.sourceName}</span>
                <span>{publication.publicationType}</span>
                <span>{compactDate(publication.publishedAt)}</span>
                <a
                  href={publication.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950"
                >
                  Source
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <h1 className="text-2xl font-semibold leading-tight tracking-normal text-zinc-950">
                {publication.title}
              </h1>
            </div>
            <StatusBadge bucket={publication.impactBucket} score={publication.impactScore} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Structured review</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewBlock title="What changed" body={publication.whatChanged} />
                <ReviewBlock title="Who is affected" body={publication.whoIsAffected} />
                <ReviewBlock title="Recommended action" body={publication.recommendedAction} />
                <ReviewBlock title="Summary" body={publication.summary} />
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Full text</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{publication.bodyText}</p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Paragraph diffs</h2>
              <div className="mt-4 space-y-3">
                {paragraphDiffs.length ? (
                  paragraphDiffs.map((diff) => (
                    <div key={diff.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-950">
                          Paragraph {diff.paragraphIndex + 1}, {diff.changeType}
                        </p>
                      </div>
                      {diff.semanticSummary ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-700">{diff.semanticSummary}</p>
                      ) : null}
                      {diff.unifiedDiff ? (
                        <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50">
                          {diff.unifiedDiff}
                        </pre>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No changed paragraphs have been captured yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Version history</h2>
              <div className="mt-4 space-y-3">
                {versions.length ? (
                  versions.map((version) => (
                    <div key={version.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-xs font-semibold text-zinc-700">
                          v{version.versionNumber} - {compactDate(version.fetchedAt)}
                        </p>
                        <span className="font-mono text-xs text-zinc-500">{version.rawHash.slice(0, 10)}</span>
                      </div>
                      {version.changeSummary ? (
                        <p className="mt-2 text-sm text-zinc-700">{version.changeSummary}</p>
                      ) : null}
                      {version.diffFromPrevious ? (
                        <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50">
                          {version.diffFromPrevious}
                        </pre>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No version history has been captured yet.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <ImpactExplanationPanel publication={publication} />

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Taxonomy</h2>
              <div className="mt-4 space-y-4">
                <TaxonomyGroup title="Regulation" tags={publication.tags.regulationFamilies} />
                <TaxonomyGroup title="Licence" tags={publication.tags.licenceTypes} />
                <TaxonomyGroup title="Activity" tags={publication.tags.activities} />
                <TaxonomyGroup title="Topic" tags={publication.tags.topicPaths} />
                <TaxonomyGroup title="Jurisdiction" tags={publication.tags.jurisdictions} />
              </div>
              <p className="mt-4 font-mono text-xs text-zinc-500">Taxonomy {taxonomy.version}</p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Service routing</h2>
              <div className="mt-4 space-y-3">
                {offerings.map((offering) => (
                  <div key={offering.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-sm font-semibold text-zinc-950">{offering.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">{offering.priceIndication}</p>
                  </div>
                ))}
              </div>
              <a
                href={consultationUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
                Talk to a regulatory lawyer
              </a>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Provenance</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Fetched</dt>
                  <dd className="font-medium text-zinc-950">{compactDate(publication.fetchedAt)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Language</dt>
                  <dd className="font-medium uppercase text-zinc-950">{publication.language}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Hash</dt>
                  <dd className="break-all font-mono text-xs text-zinc-700">{publication.rawHash}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function ReviewBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  );
}

function TaxonomyGroup({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-normal text-zinc-500">{title}</h3>
      <TagList tags={tags} limit={12} />
    </div>
  );
}

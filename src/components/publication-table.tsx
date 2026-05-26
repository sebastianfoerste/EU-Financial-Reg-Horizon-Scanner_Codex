import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { TagList } from "@/components/tag-list";
import type { PublicationListItem } from "@/lib/mock-data";
import { compactDate, truncateText } from "@/lib/utils";

export function PublicationTable({ publications }: { publications: PublicationListItem[] }) {
  if (publications.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-10 text-center">
        <h2 className="text-base font-semibold text-zinc-950">No publications match the current filters.</h2>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Publication
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-zinc-500 lg:table-cell">
              Tags
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Impact
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {publications.map((publication) => (
            <tr key={publication.id} className="align-top hover:bg-zinc-50">
              <td className="px-4 py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold uppercase text-zinc-700">{publication.sourceCode}</span>
                    <span>{publication.publicationType}</span>
                    <span>{compactDate(publication.publishedAt)}</span>
                    <a
                      href={publication.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                  <Link href={`/publications/${publication.id}`} className="text-sm font-semibold text-zinc-950">
                    {publication.title}
                  </Link>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-600">
                    {truncateText(publication.summary, 220)}
                  </p>
                </div>
              </td>
              <td className="hidden max-w-sm px-4 py-4 lg:table-cell">
                <TagList
                  tags={[
                    ...publication.tags.regulationFamilies,
                    ...publication.tags.licenceTypes,
                    ...publication.tags.topicPaths,
                  ]}
                />
              </td>
              <td className="px-4 py-4">
                <StatusBadge bucket={publication.impactBucket} score={publication.impactScore} />
                <p className="mt-2 max-w-44 text-xs leading-5 text-zinc-500">{publication.scoreRationale}</p>
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/publications/${publication.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  aria-label={`Open ${publication.title}`}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

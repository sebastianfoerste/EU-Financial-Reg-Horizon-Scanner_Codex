import { CheckCircle2, Circle } from "lucide-react";

import { buildScoreExplanation } from "@/lib/score-explanation";
import type { PublicationListItem } from "@/lib/mock-data";

export function ImpactExplanationPanel({ publication }: { publication: PublicationListItem }) {
  const explanation = buildScoreExplanation({
    publicationType: publication.publicationType,
    classification: publication.tags,
    matchedLicences: publication.matchedLicences,
    matchedActivities: publication.matchedActivities,
    matchedJurisdictions: publication.matchedJurisdictions,
    matchedTopics: publication.matchedTopics,
  });

  const rawScore = explanation.items.reduce((sum, item) => sum + item.points, 0);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Impact explanation</h2>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{publication.scoreRationale}</p>
        </div>
        <div className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-right">
          <p className="text-xs text-zinc-500">Raw</p>
          <p className="text-lg font-semibold text-zinc-950">{rawScore}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {explanation.items.map((item) => {
          const Icon = item.matched ? CheckCircle2 : Circle;
          return (
            <div
              key={item.label}
              className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[1fr_auto]"
            >
              <div className="flex min-w-0 gap-2">
                <Icon className={item.matched ? "mt-0.5 h-4 w-4 text-teal-700" : "mt-0.5 h-4 w-4 text-zinc-400"} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-zinc-600">{item.value}</p>
                </div>
              </div>
              <p className="font-mono text-sm font-semibold text-zinc-950">+{item.points}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-xs text-zinc-500">Rule version {publication.scoringRuleVersion}</p>
    </section>
  );
}

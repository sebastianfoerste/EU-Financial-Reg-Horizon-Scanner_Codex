import { getDigestPreview } from "@/lib/publications";
import { pollTierOneSources } from "@/lib/ingestion/pipeline";
import { inngest } from "@/inngest/client";

export const pollTierOneSourcesFunction = inngest.createFunction(
  {
    id: "poll-tier-one-sources",
    name: "Poll Tier 1 regulator sources",
    triggers: [{ cron: "*/60 * * * *" }],
  },
  async ({ step }) => {
    const results = await step.run("poll tier one adapters", async () => pollTierOneSources());
    return {
      results,
      failed: results.filter((result) => result.status === "FAILED").length,
    };
  },
);

export const manualPollSourcesFunction = inngest.createFunction(
  {
    id: "manual-poll-sources",
    name: "Manual source poll",
    triggers: [{ event: "sources/poll.requested" }],
  },
  async ({ step }) => {
    return step.run("poll tier one adapters", async () => pollTierOneSources());
  },
);

export const prepareDigestPreviewFunction = inngest.createFunction(
  {
    id: "prepare-digest-preview",
    name: "Prepare dry-run digest preview",
    triggers: [{ event: "digest/preview.requested" }, { cron: "0 7 * * 1-5" }],
  },
  async ({ step }) => {
    return step.run("render digest preview", async () => getDigestPreview());
  },
);

export const functions = [
  pollTierOneSourcesFunction,
  manualPollSourcesFunction,
  prepareDigestPreviewFunction,
];

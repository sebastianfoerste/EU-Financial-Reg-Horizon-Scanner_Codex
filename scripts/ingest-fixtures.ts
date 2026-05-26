import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getTierOneAdapters } from "@/lib/ingestion/adapters";
import { parseRssFeed } from "@/lib/ingestion/rss";
import { syncSources, syncTaxonomyConfig, upsertCanonicalPublication } from "@/lib/ingestion/store";
import { hasDatabaseUrl } from "@/lib/env";

async function main() {
  const xml = readFileSync(resolve(process.cwd(), "tests/fixtures/esma-rss.xml"), "utf8");
  const publications = parseRssFeed(xml, {
    sourceCode: "esma",
    language: "en",
    publicationType: "q_and_a_published",
  });

  if (!hasDatabaseUrl()) {
    console.log(JSON.stringify({ mode: "dry-run", publications: publications.length }, null, 2));
    return;
  }

  await syncTaxonomyConfig();
  await syncSources(getTierOneAdapters());

  for (const publication of publications) {
    await upsertCanonicalPublication(publication);
  }

  console.log(JSON.stringify({ mode: "database", publications: publications.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

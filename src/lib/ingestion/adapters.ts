import * as cheerio from "cheerio";

import { sha256, stableExternalId } from "@/lib/hash";
import { fetchText } from "@/lib/ingestion/http";
import { discoverFeedUrls, htmlToText, parseRssFeed } from "@/lib/ingestion/rss";
import type { CanonicalPublication, SourceAdapter, SourceDefinition } from "@/lib/ingestion/types";

function createRssAdapter(source: SourceDefinition): SourceAdapter {
  return {
    source,
    async fetch(cursor) {
      if (!source.feedUrl) return { publications: [] };
      const response = await fetchText(source.feedUrl, {
        etag: cursor?.etag,
        lastModified: cursor?.lastModified,
      });

      if (response.status === 304) {
        return {
          publications: [],
          state: {
            etag: cursor?.etag ?? response.etag,
            lastModified: cursor?.lastModified ?? response.lastModified,
          },
          status: { httpStatus: 304, skipped: true },
        };
      }

      return {
        publications: parseRssFeed(response.text, {
          sourceCode: source.code,
          language: source.language,
          publicationType: "press_release",
        }),
        state: {
          etag: response.etag,
          lastModified: response.lastModified,
        },
        status: {
          httpStatus: response.status,
          contentType: response.contentType,
        },
      };
    },
  };
}

function createDiscoveryAdapter(source: SourceDefinition): SourceAdapter {
  return {
    source,
    async fetch(cursor) {
      if (!source.feedUrl) return { publications: [] };
      const discovery = await fetchText(source.feedUrl, {
        etag: cursor?.etag,
        lastModified: cursor?.lastModified,
      });
      if (discovery.status === 304) {
        return {
          publications: [],
          state: {
            etag: cursor?.etag ?? discovery.etag,
            lastModified: cursor?.lastModified ?? discovery.lastModified,
          },
          status: { httpStatus: 304, skipped: true },
        };
      }

      const feedUrls = discoverFeedUrls(discovery.text, source.feedUrl).slice(0, 4);
      const publications: CanonicalPublication[] = [];
      for (const feedUrl of feedUrls) {
        const response = await fetchText(feedUrl);
        if (response.status >= 200 && response.status < 300 && response.text.trim().startsWith("<")) {
          publications.push(
            ...parseRssFeed(response.text, {
              sourceCode: source.code,
              language: source.language,
              publicationType: source.code === "bafin" ? "merkblatt" : "press_release",
            }),
          );
        }
      }

      return {
        publications,
        state: {
          etag: discovery.etag,
          lastModified: discovery.lastModified,
          cursorJson: { discoveredFeeds: feedUrls },
        },
        status: {
          httpStatus: discovery.status,
          discoveredFeeds: feedUrls.length,
        },
      };
    },
  };
}

function createEsmaQaAdapter(): SourceAdapter {
  const source: SourceDefinition = {
    code: "esma_qna",
    displayName: "ESMA Q&A",
    jurisdictionCode: "eu",
    baseUrl: "https://www.esma.europa.eu",
    feedType: "HTML_SCRAPE",
    feedUrl: "https://www.esma.europa.eu/esma-qa-search-page/all",
    pollIntervalMin: 60,
    language: "en",
    notes: "Search-page adapter for ESMA Q&A items.",
  };

  return {
    source,
    async fetch(cursor) {
      const response = await fetchText(source.feedUrl!, {
        etag: cursor?.etag,
        lastModified: cursor?.lastModified,
      });
      if (response.status === 304) {
        return { publications: [], state: cursor, status: { httpStatus: 304, skipped: true } };
      }

      const $ = cheerio.load(response.text);
      const publications: CanonicalPublication[] = [];
      $("a[href]").each((_, element) => {
        const title = $(element).text().replace(/\s+/g, " ").trim();
        const href = $(element).attr("href");
        if (!href || title.length < 18) return;
        if (!/q&a|qa|question|answer|micar|dora/i.test(`${title} ${href}`)) return;

        const sourceUrl = new URL(href, source.baseUrl).toString();
        const bodyText = title;
        publications.push({
          sourceCode: source.code,
          sourceUrl,
          canonicalUrl: sourceUrl,
          externalId: stableExternalId(source.code, sourceUrl, title),
          title,
          publishedAt: null,
          fetchedAt: new Date(),
          language: source.language,
          publicationType: "q_and_a_published",
          rawHash: sha256(`${title}\n${bodyText}`),
          bodyText,
          sourceMetadataJson: { adapter: "esma-qna-search" },
        });
      });

      return {
        publications: publications.slice(0, 25),
        state: {
          etag: response.etag,
          lastModified: response.lastModified,
        },
        status: { httpStatus: response.status, parsedLinks: publications.length },
      };
    },
  };
}

function createEbaSingleRulebookAdapter(): SourceAdapter {
  const source: SourceDefinition = {
    code: "eba_qna",
    displayName: "EBA Single Rulebook Q&A",
    jurisdictionCode: "eu",
    baseUrl: "https://www.eba.europa.eu",
    feedType: "HTML_SCRAPE",
    feedUrl: "https://www.eba.europa.eu/single-rulebook-qa",
    pollIntervalMin: 60,
    language: "en",
    notes: "HTML adapter for EBA Single Rulebook Q&A discovery.",
  };

  return {
    source,
    async fetch(cursor) {
      const response = await fetchText(source.feedUrl!, {
        etag: cursor?.etag,
        lastModified: cursor?.lastModified,
      });
      if (response.status === 304) {
        return { publications: [], state: cursor, status: { httpStatus: 304, skipped: true } };
      }

      const $ = cheerio.load(response.text);
      const publications: CanonicalPublication[] = [];
      $("a[href]").each((_, element) => {
        const title = $(element).text().replace(/\s+/g, " ").trim();
        const href = $(element).attr("href");
        if (!href || title.length < 18) return;
        if (!/single-rulebook|q&a|question|answer/i.test(`${title} ${href}`)) return;
        const sourceUrl = new URL(href, source.baseUrl).toString();
        const bodyText = title;
        publications.push({
          sourceCode: source.code,
          sourceUrl,
          canonicalUrl: sourceUrl,
          externalId: stableExternalId(source.code, sourceUrl, title),
          title,
          publishedAt: null,
          fetchedAt: new Date(),
          language: source.language,
          publicationType: "q_and_a_published",
          rawHash: sha256(`${title}\n${bodyText}`),
          bodyText,
          sourceMetadataJson: { adapter: "eba-single-rulebook" },
        });
      });

      return {
        publications: publications.slice(0, 25),
        state: {
          etag: response.etag,
          lastModified: response.lastModified,
        },
        status: { httpStatus: response.status, parsedLinks: publications.length },
      };
    },
  };
}

function createEurLexAdapter(): SourceAdapter {
  const source: SourceDefinition = {
    code: "eurlex",
    displayName: "EUR-Lex",
    jurisdictionCode: "eu",
    baseUrl: "https://eur-lex.europa.eu",
    feedType: "EUR_LEX_API",
    feedUrl: "https://publications.europa.eu/webapi/rdf/sparql",
    pollIntervalMin: 60,
    language: "en",
    notes: "SPARQL-ready adapter. Query kept deliberately narrow for the MVP.",
  };

  return {
    source,
    async fetch() {
      const query = `
        PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
        SELECT ?work ?title WHERE {
          ?work cdm:work_has_resource-type <http://publications.europa.eu/resource/authority/resource-type/REG> .
          OPTIONAL { ?work cdm:work_title ?title . }
        } LIMIT 10
      `;
      const response = await fetch(source.feedUrl!, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ query }).toString(),
      });
      if (!response.ok) {
        throw new Error(`EUR-Lex SPARQL fetch failed: HTTP ${response.status}.`);
      }

      const data = (await response.json()) as {
        results?: { bindings?: Array<{ work?: { value?: string }; title?: { value?: string } }> };
      };
      const publications =
        data.results?.bindings?.map((binding): CanonicalPublication => {
          const sourceUrl = binding.work?.value ?? source.baseUrl;
          const title = binding.title?.value ?? "EUR-Lex regulatory publication";
          const bodyText = htmlToText(title);
          return {
            sourceCode: source.code,
            sourceUrl,
            canonicalUrl: sourceUrl,
            externalId: stableExternalId(source.code, sourceUrl, title),
            title,
            publishedAt: null,
            fetchedAt: new Date(),
            language: source.language,
            publicationType: "regulation_final",
            rawHash: sha256(`${title}\n${bodyText}`),
            bodyText,
            sourceMetadataJson: { api: "eurlex-sparql" },
          };
        }) ?? [];

      return {
        publications,
        status: { httpStatus: response.status, api: "sparql", bindings: publications.length },
      };
    },
  };
}

export function getTierOneAdapters(): SourceAdapter[] {
  return [
    createDiscoveryAdapter({
      code: "bafin",
      displayName: "BaFin",
      jurisdictionCode: "de",
      baseUrl: "https://www.bafin.de",
      feedType: "HTML_SCRAPE",
      feedUrl: "https://www.bafin.de/EN/Service/TopNavigation/RSS/rss_artikel_en.html",
      pollIntervalMin: 60,
      language: "de",
      notes: "RSS discovery page for BaFin publications.",
    }),
    createRssAdapter({
      code: "esma",
      displayName: "ESMA",
      jurisdictionCode: "eu",
      baseUrl: "https://www.esma.europa.eu",
      feedType: "RSS",
      feedUrl: "https://www.esma.europa.eu/rss.xml",
      pollIntervalMin: 60,
      language: "en",
    }),
    createEsmaQaAdapter(),
    createRssAdapter({
      code: "eba",
      displayName: "EBA",
      jurisdictionCode: "eu",
      baseUrl: "https://www.eba.europa.eu",
      feedType: "RSS",
      feedUrl: "https://www.eba.europa.eu/news-press/news/rss.xml",
      pollIntervalMin: 60,
      language: "en",
    }),
    createEbaSingleRulebookAdapter(),
    createEurLexAdapter(),
    createDiscoveryAdapter({
      code: "bundesbank",
      displayName: "Deutsche Bundesbank",
      jurisdictionCode: "de",
      baseUrl: "https://www.bundesbank.de",
      feedType: "HTML_SCRAPE",
      feedUrl: "https://www.bundesbank.de/de/startseite/rss",
      pollIntervalMin: 60,
      language: "de",
      notes: "RSS discovery page for Bundesbank channels.",
    }),
  ];
}

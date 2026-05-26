import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import { sha256, stableExternalId } from "@/lib/hash";
import type { CanonicalPublication } from "@/lib/ingestion/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

type RssDefaults = {
  sourceCode: string;
  language: string;
  publicationType: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  const record = asRecord(value);
  if (typeof record["#text"] === "string") return record["#text"];
  return "";
}

export function htmlToText(html: string) {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  return $.text().replace(/\s+/g, " ").trim();
}

export function discoverFeedUrls(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $("a[href], link[href]").each((_, element) => {
    const href = $(element).attr("href");
    const type = $(element).attr("type");
    if (!href) return;
    const lower = href.toLowerCase();
    if (!lower.includes("rss") && !lower.includes("atom") && !type?.includes("rss")) return;

    try {
      const absolute = new URL(href, pageUrl).toString();
      if (absolute !== pageUrl) urls.add(absolute);
    } catch {
      return;
    }
  });

  return [...urls];
}

export function parseRssFeed(xml: string, defaults: RssDefaults): CanonicalPublication[] {
  const parsed = asRecord(parser.parse(xml));
  const rss = asRecord(parsed.rss);
  const feed = asRecord(parsed.feed);
  const channel = asRecord(rss.channel);
  const rssItems = asArray(channel.item);
  const atomItems = asArray(feed.entry);
  const items = rssItems.length ? rssItems : atomItems;

  return items.map((rawItem): CanonicalPublication => {
    const item = asRecord(rawItem);
    const title = asText(item.title) || "Untitled publication";
    const linkValue = item.link;
    const link =
      typeof linkValue === "string"
        ? linkValue
        : asText(asRecord(linkValue)["@_href"]) || asText(item.guid);
    const description = asText(item.description) || asText(item.summary) || asText(item.content);
    const bodyText = htmlToText(description) || title;
    const pubDate = asText(item.pubDate) || asText(item.updated) || asText(item.published);
    const parsedPublishedAt = pubDate ? new Date(pubDate) : null;
    const publishedAt = parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime()) ? parsedPublishedAt : null;
    const sourceUrl = link || asText(item.guid) || stableExternalId(defaults.sourceCode, title, bodyText);
    const rawHash = sha256(`${title}\n${bodyText}`);

    return {
      sourceCode: defaults.sourceCode,
      sourceUrl,
      canonicalUrl: sourceUrl,
      externalId: asText(item.guid) || stableExternalId(defaults.sourceCode, sourceUrl, title),
      title,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      fetchedAt: new Date(),
      language: defaults.language,
      publicationType: defaults.publicationType,
      rawHash,
      bodyText,
      sourceMetadataJson: {
        feedTitle: asText(channel.title) || asText(feed.title),
      },
      hasAttachments: /pdf/i.test(description),
    };
  });
}

import { getEnv } from "@/lib/env";

export type FetchTextResult = {
  url: string;
  status: number;
  text: string;
  etag: string | null;
  lastModified: string | null;
  contentType: string | null;
};

export async function fetchText(url: string, options: { etag?: string | null; lastModified?: string | null } = {}) {
  const env = getEnv();
  const headers = new Headers({
    "user-agent": env.HORIZON_BOT_USER_AGENT,
    accept: "application/rss+xml, application/atom+xml, application/xml, text/html, application/json;q=0.9, */*;q=0.8",
  });

  if (options.etag) headers.set("if-none-match", options.etag);
  if (options.lastModified) headers.set("if-modified-since", options.lastModified);

  const response = await fetch(url, { headers });
  if (response.status === 304) {
    return {
      url,
      status: response.status,
      text: "",
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      contentType: response.headers.get("content-type"),
    } satisfies FetchTextResult;
  }
  if (!response.ok) {
    throw new Error(`Source fetch failed for ${url}: HTTP ${response.status}.`);
  }

  const text = await response.text();
  return {
    url,
    status: response.status,
    text,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    contentType: response.headers.get("content-type"),
  } satisfies FetchTextResult;
}

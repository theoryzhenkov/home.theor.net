/** HTML fetch, DOMParser, and in-memory cache for popup content */

import type { CachedDocument } from './types';

const documentCache = new Map<string, CachedDocument>();
const inflightFetches = new Map<string, Promise<CachedDocument>>();

function extractTitle(doc: Document): string {
  const h1 = doc.querySelector('h1');
  return h1?.textContent?.trim() ?? doc.title ?? '';
}

async function fetchAndParse(path: string): Promise<CachedDocument> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return {
    doc,
    title: extractTitle(doc),
    cachedAt: Date.now(),
  };
}

export async function fetchAndCache(path: string): Promise<CachedDocument> {
  const cached = documentCache.get(path);
  if (cached) return cached;

  // Deduplicate in-flight fetches
  const inflight = inflightFetches.get(path);
  if (inflight) return inflight;

  const promise = fetchAndParse(path).then((result) => {
    documentCache.set(path, result);
    inflightFetches.delete(path);
    return result;
  }).catch((err) => {
    inflightFetches.delete(path);
    throw err;
  });

  inflightFetches.set(path, promise);
  return promise;
}

export function prefetch(path: string): void {
  if (documentCache.has(path) || inflightFetches.has(path)) return;
  // Fire and forget — errors are silently ignored during prefetch
  fetchAndCache(path).catch(() => {});
}

export function getCurrentPageDoc(): CachedDocument {
  return {
    doc: document,
    title: document.querySelector('h1')?.textContent?.trim() ?? document.title,
    cachedAt: Date.now(),
  };
}

export function clearCache(): void {
  documentCache.clear();
  inflightFetches.clear();
}

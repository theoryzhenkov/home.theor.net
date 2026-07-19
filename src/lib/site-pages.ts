import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { PageInput } from './relations';

export interface LocalPageEntry extends PageInput {
  id: string;
  html: string;
  body: string;
  data: CollectionEntry<'pages'>['data'];
  mdx: Awaited<ReturnType<typeof render>>;
}

let localPagesCache: Promise<LocalPageEntry[]> | null = null;

function pageBody(entry: CollectionEntry<'pages'>): string {
  const body = 'body' in entry && typeof entry.body === 'string' ? entry.body : '';
  return body
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .trim();
}

export async function getLocalPages(): Promise<LocalPageEntry[]> {
  if (localPagesCache) return localPagesCache;

  localPagesCache = (async () => {
    const entries = await getCollection('pages');
    return await Promise.all(entries.map(async (entry) => {
      const body = pageBody(entry);
      const mdx = await render(entry);
      const html = entry.rendered?.html ?? body;
      return {
        id: entry.id,
        html,
        body,
        data: entry.data,
        mdx,
      };
    }));
  })();

  return localPagesCache;
}

export async function getLocalPageSlugs(): Promise<Set<string>> {
  return new Set((await getLocalPages()).map((entry) => entry.id));
}

export async function getSiteRouteEntries(): Promise<LocalPageEntry[]> {
  return getLocalPages();
}

export async function getSiteRouteEntry(slug: string): Promise<LocalPageEntry | undefined> {
  const entries = await getSiteRouteEntries();
  return entries.find((entry) => entry.id === slug);
}

export async function getAllSitePageInputs(): Promise<PageInput[]> {
  return await getLocalPages();
}

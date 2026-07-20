/**
 * Astro-dependent entry point for building the relations graph.
 * Separated from relations.ts so that pure logic can be tested without Astro imports.
 */
import { buildGraphFromPages, type RelationsGraph, type PageInfoMap } from './relations';
import { getAllSitePageInputs } from './site-pages';

let cached: { graph: RelationsGraph; pages: PageInfoMap } | null = null;

/**
 * Build relations graph from Astro content collection.
 * Memoized — safe to call from multiple pages during a single build.
 */
export async function buildRelationsGraph(): Promise<{
  graph: RelationsGraph;
  pages: PageInfoMap;
}> {
  if (cached) return cached;
  const allPages = await getAllSitePageInputs();
  cached = buildGraphFromPages(allPages);
  return cached;
}

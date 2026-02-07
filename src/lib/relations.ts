import { getCollection } from 'astro:content';

export interface PageRelations {
  // Topological (RCC-8)
  ntpp: string[];    // this page is deeply contained in...
  nttpi: string[];   // pages deeply contained in this one (inferred)
  tpp: string[];     // this page is tangentially part of...
  tppi: string[];    // pages tangentially part of this one (inferred)
  po: string[];      // partially overlapped with...
  ec: string[];      // externally connected to...
  eq: string[];      // equivalent to...
  dc: string[];      // disconnected from (metadata-only)
  // Semantic
  next?: string;
  prev?: string;
  // References (auto-extracted from markdown links)
  r: string[];       // pages this page links to
  ri: string[];      // pages that link to this page
}

export interface PageInfo {
  slug: string;
  title: string;
}

export type RelationsGraph = Map<string, PageRelations>;
export type PageInfoMap = Map<string, PageInfo>;

interface RawRelations {
  ntpp?: string[];
  tpp?: string[];
  po?: string[];
  ec?: string[];
  eq?: string[];
  dc?: string[];
  next?: string;
  prev?: string;
}

function emptyRelations(): PageRelations {
  return {
    ntpp: [], nttpi: [],
    tpp: [], tppi: [],
    po: [], ec: [], eq: [], dc: [],
    r: [], ri: [],
  };
}

function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

/**
 * Convert a page slug to its URL path.
 */
function slugToPath(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`;
}

/**
 * Convert a URL path back to a page slug.
 */
function pathToSlug(path: string): string {
  if (path === '/') return 'index';
  return path.replace(/^\//, '');
}

/**
 * Extract internal link target slugs from raw MDX body.
 */
function extractLinkSlugs(body: string, sourceSlug: string, knownSlugs: Set<string>): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const slugs: string[] = [];
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const href = match[2];

    // Skip external links, anchors, mailto
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
      continue;
    }

    // Normalize to path
    let targetPath = href;
    if (targetPath.startsWith('./')) targetPath = targetPath.slice(1);
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
    if (targetPath.endsWith('/') && targetPath !== '/') targetPath = targetPath.slice(0, -1);

    const targetSlug = pathToSlug(targetPath);

    // Only include if target exists and is not self-reference
    if (knownSlugs.has(targetSlug) && targetSlug !== sourceSlug && !slugs.includes(targetSlug)) {
      slugs.push(targetSlug);
    }
  }

  return slugs;
}

/**
 * Build a relations graph from all pages with bidirectional inference.
 *
 * Inference rules:
 * - A.ntpp includes B  -> B.nttpi includes A
 * - A.tpp includes B   -> B.tppi includes A
 * - A.po includes B    -> B.po includes A   (symmetric)
 * - A.ec includes B    -> B.ec includes A   (symmetric)
 * - A.eq includes B    -> B.eq includes A   (symmetric)
 * - A.dc includes B    -> B.dc includes A   (symmetric)
 * - A.next = B         -> B.prev = A
 * - A.prev = B         -> B.next = A
 * - Markdown link A->B -> A.r includes B, B.ri includes A
 */
export async function buildRelationsGraph(): Promise<{
  graph: RelationsGraph;
  pages: PageInfoMap;
}> {
  const allPages = await getCollection('pages');

  const graph: RelationsGraph = new Map();
  const pages: PageInfoMap = new Map();
  const knownSlugs = new Set(allPages.map(p => p.id));

  // First pass: collect explicit relations, page info, and extract links
  for (const page of allPages) {
    const slug = page.id;
    const data = page.data as { title: string } & RawRelations;

    pages.set(slug, { slug, title: data.title });

    const rel = emptyRelations();
    if (data.ntpp) rel.ntpp = [...data.ntpp];
    if (data.tpp) rel.tpp = [...data.tpp];
    if (data.po) rel.po = [...data.po];
    if (data.ec) rel.ec = [...data.ec];
    if (data.eq) rel.eq = [...data.eq];
    if (data.dc) rel.dc = [...data.dc];
    rel.next = data.next;
    rel.prev = data.prev;

    // Extract R (references) from markdown links
    const body = page.body || '';
    rel.r = extractLinkSlugs(body, slug, knownSlugs);

    graph.set(slug, rel);
  }

  // Second pass: infer bidirectional relations
  for (const [slug, rel] of graph) {
    // NTPP -> NTPPi
    for (const target of rel.ntpp) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.nttpi, slug);
    }

    // TPP -> TPPi
    for (const target of rel.tpp) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.tppi, slug);
    }

    // PO (symmetric)
    for (const target of rel.po) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.po, slug);
    }

    // EC (symmetric)
    for (const target of rel.ec) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.ec, slug);
    }

    // EQ (symmetric)
    for (const target of rel.eq) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.eq, slug);
    }

    // DC (symmetric)
    for (const target of rel.dc) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.dc, slug);
    }

    // Next -> Prev
    if (rel.next) {
      const nextRel = graph.get(rel.next);
      if (nextRel && !nextRel.prev) nextRel.prev = slug;
    }

    // Prev -> Next
    if (rel.prev) {
      const prevRel = graph.get(rel.prev);
      if (prevRel && !prevRel.next) prevRel.next = slug;
    }

    // R -> Ri
    for (const target of rel.r) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.ri, slug);
    }
  }

  return { graph, pages };
}

/**
 * Get the breadcrumb trail for a page by walking up the PP chain.
 * Prefers NTPP, falls back to TPP. Returns array from root to current page.
 */
export function getBreadcrumbs(
  slug: string,
  graph: RelationsGraph,
  pages: PageInfoMap
): PageInfo[] {
  const breadcrumbs: PageInfo[] = [];
  let current: string | undefined = slug;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const pageInfo = pages.get(current);
    if (pageInfo) breadcrumbs.unshift(pageInfo);

    const rel = graph.get(current);
    if (!rel) break;

    // Walk up: prefer NTPP, fall back to TPP
    current = rel.ntpp[0] ?? rel.tpp[0];
  }

  return breadcrumbs;
}

/**
 * Get resolved relations for a specific page.
 */
export function getPageRelations(
  slug: string,
  graph: RelationsGraph
): PageRelations | undefined {
  return graph.get(slug);
}

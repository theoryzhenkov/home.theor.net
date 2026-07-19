import { pathToSlug } from './slugs';

export interface RelationTarget {
  slug: string;
  label?: string;
}

export interface PageRelations {
  /** Legacy route hierarchy. Prefer part_of for new content. */
  up: RelationTarget[];
  /** Legacy inverse route hierarchy. Prefer has_part for new content. */
  down: RelationTarget[];
  is: RelationTarget[];
  has: RelationTarget[];
  subclass_of: RelationTarget[];
  superclass_of: RelationTarget[];
  part_of: RelationTarget[];
  has_part: RelationTarget[];
  subject: RelationTarget[];
  subject_of: RelationTarget[];
  creator: RelationTarget[];
  creator_of: RelationTarget[];
  related: RelationTarget[];
  next?: string;
  prev?: string;
  ref: string[];
  refi: string[];
}

export interface PageInfo {
  slug: string;
  title: string;
}

export type RelationsGraph = Map<string, PageRelations>;
export type PageInfoMap = Map<string, PageInfo>;

export interface RawRelationEntry {
  page: string;
  label?: string;
}

export interface RawRelations {
  up?: RawRelationEntry[];
  down?: RawRelationEntry[];
  is?: RawRelationEntry[];
  has?: RawRelationEntry[];
  subclass_of?: RawRelationEntry[];
  superclass_of?: RawRelationEntry[];
  part_of?: RawRelationEntry[];
  has_part?: RawRelationEntry[];
  subject?: RawRelationEntry[];
  subject_of?: RawRelationEntry[];
  creator?: RawRelationEntry[];
  creator_of?: RawRelationEntry[];
  related?: RawRelationEntry[];
  next?: string;
  prev?: string;
  ref?: string[];
  refi?: string[];
}

export function parseRelationList(list?: RawRelationEntry[]): RelationTarget[] {
  if (!list) return [];
  return list.map(({ page, label }) => ({
    slug: page,
    ...(label ? { label } : {}),
  }));
}

export function emptyRelations(): PageRelations {
  return {
    up: [], down: [],
    is: [], has: [],
    subclass_of: [], superclass_of: [],
    part_of: [], has_part: [],
    subject: [], subject_of: [],
    creator: [], creator_of: [],
    related: [],
    ref: [], refi: [],
  };
}

export function addUniqueTarget(arr: RelationTarget[], slug: string, label?: string): void {
  if (!arr.some(t => t.slug === slug)) {
    arr.push({ slug, ...(label ? { label } : {}) });
  }
}

export function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

function addInverseTarget(
  graph: RelationsGraph,
  target: RelationTarget,
  inverseKey: keyof Pick<PageRelations,
    'down' | 'up' | 'has' | 'is' | 'superclass_of' | 'subclass_of' |
    'has_part' | 'part_of' | 'subject_of' | 'subject' | 'creator_of' | 'creator' | 'related'
  >,
  sourceSlug: string,
): void {
  const targetRel = graph.get(target.slug);
  if (targetRel) addUniqueTarget(targetRel[inverseKey], sourceSlug, target.label);
}

/**
 * Extract internal link target slugs from raw MDX body.
 * Scans for markdown links `[text](href)` and returns slugs of known internal pages.
 */
export function extractLinkSlugs(body: string, sourceSlug: string, knownSlugs: Set<string>): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const slugs: string[] = [];
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const href = match[2];
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;

    let targetPath = href;
    if (targetPath.startsWith('./')) targetPath = targetPath.slice(1);
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
    if (targetPath.endsWith('/') && targetPath !== '/') targetPath = targetPath.slice(0, -1);

    const targetSlug = pathToSlug(targetPath);
    if (knownSlugs.has(targetSlug) && targetSlug !== sourceSlug && !slugs.includes(targetSlug)) {
      slugs.push(targetSlug);
    }
  }

  return slugs;
}

/** Page-like input for buildGraphFromPages, decoupled from Astro's collection type. */
export interface PageInput {
  id: string;
  data: { title: string } & RawRelations;
  body?: string;
}

/**
 * Build a relations graph from page data with bidirectional inference.
 * Pure function — no Astro imports, fully testable.
 *
 * Inference rules:
 * - A.up includes B             -> B.down includes A (legacy)
 * - A.down includes B           -> B.up includes A (legacy)
 * - A.is includes B             -> B.has includes A
 * - A.has includes B            -> B.is includes A
 * - A.subclass_of includes B    -> B.superclass_of includes A
 * - A.superclass_of includes B  -> B.subclass_of includes A
 * - A.part_of includes B        -> B.has_part includes A
 * - A.has_part includes B       -> B.part_of includes A
 * - A.subject includes B        -> B.subject_of includes A
 * - A.subject_of includes B     -> B.subject includes A
 * - A.creator includes B        -> B.creator_of includes A
 * - A.creator_of includes B     -> B.creator includes A
 * - A.related includes B        -> B.related includes A
 * - A.next = B                  -> B.prev = A
 * - A.prev = B                  -> B.next = A
 * - Markdown link A->B          -> A.ref includes B, B.refi includes A
 * - A.refi = B (explicit)       -> B.ref includes A
 */
export function buildGraphFromPages(allPages: PageInput[]): {
  graph: RelationsGraph;
  pages: PageInfoMap;
} {
  const graph: RelationsGraph = new Map();
  const pages: PageInfoMap = new Map();
  const knownSlugs = new Set(allPages.map(p => p.id));

  // First pass: collect explicit relations, page info, and extract links
  for (const page of allPages) {
    const slug = page.id;
    const data = page.data;

    pages.set(slug, { slug, title: data.title });

    const rel = emptyRelations();
    rel.up = parseRelationList(data.up);
    rel.down = parseRelationList(data.down);
    rel.is = parseRelationList(data.is);
    rel.has = parseRelationList(data.has);
    rel.subclass_of = parseRelationList(data.subclass_of);
    rel.superclass_of = parseRelationList(data.superclass_of);
    rel.part_of = parseRelationList(data.part_of);
    rel.has_part = parseRelationList(data.has_part);
    rel.subject = parseRelationList(data.subject);
    rel.subject_of = parseRelationList(data.subject_of);
    rel.creator = parseRelationList(data.creator);
    rel.creator_of = parseRelationList(data.creator_of);
    rel.related = parseRelationList(data.related);
    rel.next = data.next;
    rel.prev = data.prev;

    // Extract refs from markdown links
    const body = page.body || '';
    rel.ref = extractLinkSlugs(body, slug, knownSlugs);

    // Merge frontmatter ref with auto-extracted refs
    if (data.ref) {
      for (const r of data.ref) {
        if (knownSlugs.has(r) && r !== slug) addUnique(rel.ref, r);
      }
    }

    // Frontmatter refi
    if (data.refi) {
      for (const r of data.refi) {
        if (knownSlugs.has(r) && r !== slug) addUnique(rel.refi, r);
      }
    }

    graph.set(slug, rel);
  }

  // Second pass: infer bidirectional relations
  for (const [slug, rel] of graph) {
    for (const target of rel.up) addInverseTarget(graph, target, 'down', slug);
    for (const target of rel.down) addInverseTarget(graph, target, 'up', slug);
    for (const target of rel.is) addInverseTarget(graph, target, 'has', slug);
    for (const target of rel.has) addInverseTarget(graph, target, 'is', slug);
    for (const target of rel.subclass_of) addInverseTarget(graph, target, 'superclass_of', slug);
    for (const target of rel.superclass_of) addInverseTarget(graph, target, 'subclass_of', slug);
    for (const target of rel.part_of) addInverseTarget(graph, target, 'has_part', slug);
    for (const target of rel.has_part) addInverseTarget(graph, target, 'part_of', slug);
    for (const target of rel.subject) addInverseTarget(graph, target, 'subject_of', slug);
    for (const target of rel.subject_of) addInverseTarget(graph, target, 'subject', slug);
    for (const target of rel.creator) addInverseTarget(graph, target, 'creator_of', slug);
    for (const target of rel.creator_of) addInverseTarget(graph, target, 'creator', slug);
    for (const target of rel.related) addInverseTarget(graph, target, 'related', slug);

    if (rel.next) {
      const nextRel = graph.get(rel.next);
      if (nextRel && !nextRel.prev) nextRel.prev = slug;
    }

    if (rel.prev) {
      const prevRel = graph.get(rel.prev);
      if (prevRel && !prevRel.next) prevRel.next = slug;
    }

    for (const target of rel.ref) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.refi, slug);
    }

    for (const target of rel.refi) {
      const targetRel = graph.get(target);
      if (targetRel) addUnique(targetRel.ref, slug);
    }
  }

  return { graph, pages };
}

/**
 * Get the breadcrumb trail for a page by walking the `part_of` chain first,
 * falling back to legacy `up` for older pages.
 * Returns array from root to current page.
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

    current = rel.part_of[0]?.slug ?? rel.up[0]?.slug;
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

import { getCollection } from 'astro:content';

export interface PageRelations {
  up?: string;
  down: string[];
  next?: string;
  prev?: string;
}

export interface PageInfo {
  slug: string;
  title: string;
}

export type RelationsGraph = Map<string, PageRelations>;
export type PageInfoMap = Map<string, PageInfo>;

interface RawRelations {
  up?: string;
  down?: string[];
  next?: string;
  prev?: string;
}

/**
 * Build a relations graph from all pages with bidirectional inference.
 * 
 * Inference rules:
 * - A.up = B → B.down includes A
 * - A.next = B → B.prev = A
 * - A.down includes B → B.up = A
 * - A.prev = B → B.next = A
 */
export async function buildRelationsGraph(): Promise<{
  graph: RelationsGraph;
  pages: PageInfoMap;
}> {
  const allPages = await getCollection('pages');
  
  // Initialize graph with explicit relations
  const graph: RelationsGraph = new Map();
  const pages: PageInfoMap = new Map();
  
  // First pass: collect explicit relations and page info
  for (const page of allPages) {
    const slug = page.id;
    const data = page.data as { title: string } & RawRelations;
    
    pages.set(slug, {
      slug,
      title: data.title,
    });
    
    graph.set(slug, {
      up: data.up,
      down: data.down ? [...data.down] : [],
      next: data.next,
      prev: data.prev,
    });
  }
  
  // Second pass: infer bidirectional relations
  for (const [slug, relations] of graph) {
    // A.up = B → B.down includes A
    if (relations.up) {
      const parent = graph.get(relations.up);
      if (parent && !parent.down.includes(slug)) {
        parent.down.push(slug);
      }
    }
    
    // A.next = B → B.prev = A
    if (relations.next) {
      const nextPage = graph.get(relations.next);
      if (nextPage && !nextPage.prev) {
        nextPage.prev = slug;
      }
    }
    
    // A.down includes B → B.up = A
    for (const child of relations.down) {
      const childPage = graph.get(child);
      if (childPage && !childPage.up) {
        childPage.up = slug;
      }
    }
    
    // A.prev = B → B.next = A
    if (relations.prev) {
      const prevPage = graph.get(relations.prev);
      if (prevPage && !prevPage.next) {
        prevPage.next = slug;
      }
    }
  }
  
  return { graph, pages };
}

/**
 * Get the breadcrumb trail for a page by walking up the `up` chain.
 * Returns an array from root to current page (inclusive).
 */
export function getBreadcrumbs(
  slug: string,
  graph: RelationsGraph,
  pages: PageInfoMap
): PageInfo[] {
  const breadcrumbs: PageInfo[] = [];
  let current: string | undefined = slug;
  const visited = new Set<string>();
  
  // Walk up the chain
  while (current && !visited.has(current)) {
    visited.add(current);
    const pageInfo = pages.get(current);
    if (pageInfo) {
      breadcrumbs.unshift(pageInfo);
    }
    current = graph.get(current)?.up;
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

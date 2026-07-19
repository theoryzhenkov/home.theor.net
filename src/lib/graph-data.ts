import type { RelationsGraph, PageInfoMap } from './relations';

export interface GraphNode {
  id: string;
  title: string;
  connections: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

export type EdgeType = 'part_of' | 'is' | 'subclass_of' | 'subject' | 'creator' | 'related' | 'next' | 'ref';

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build a full graph data structure (nodes + edges) from the relations graph.
 * Deduplicates symmetric edges so only one edge exists per pair.
 */
export function buildGraphData(
  graph: RelationsGraph,
  pages: PageInfoMap,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const [slug, rel] of graph) {
    const info = pages.get(slug);
    if (!info) continue;

    const connections =
      rel.up.length + rel.down.length +
      rel.is.length + rel.has.length +
      rel.subclass_of.length + rel.superclass_of.length +
      rel.part_of.length + rel.has_part.length +
      rel.subject.length + rel.subject_of.length +
      rel.creator.length + rel.creator_of.length +
      rel.related.length +
      (rel.next ? 1 : 0) + (rel.prev ? 1 : 0) +
      rel.ref.length + rel.refi.length;

    nodes.push({ id: slug, title: info.title, connections });

    // Directional: part_of (source is part of target). Legacy up edges are
    // emitted as part_of only when no explicit part_of relation is present.
    const partOfTargets = rel.part_of.length > 0 ? rel.part_of : rel.up;
    for (const target of partOfTargets) {
      edges.push({ source: slug, target: target.slug, type: 'part_of' });
    }

    // Directional: is (source is an instance of target)
    for (const target of rel.is) {
      edges.push({ source: slug, target: target.slug, type: 'is' });
    }

    // Directional: subclass_of (source is subclass of target)
    for (const target of rel.subclass_of) {
      edges.push({ source: slug, target: target.slug, type: 'subclass_of' });
    }

    // Directional: subject (source is about target)
    for (const target of rel.subject) {
      edges.push({ source: slug, target: target.slug, type: 'subject' });
    }

    // Directional: creator (source was created by target)
    for (const target of rel.creator) {
      edges.push({ source: slug, target: target.slug, type: 'creator' });
    }

    // Symmetric: related (deduplicate both declarations)
    for (const target of rel.related) {
      const key = [slug, target.slug].sort().join('::') + '::related';
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: slug, target: target.slug, type: 'related' });
      }
    }

    // Directional: next (deduplicate with prev)
    if (rel.next) {
      const key = [slug, rel.next].sort().join('::') + '::next';
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: slug, target: rel.next, type: 'next' });
      }
    }

    // Directional: references (source links to target)
    for (const target of rel.ref) {
      edges.push({ source: slug, target, type: 'ref' });
    }
  }

  return { nodes, edges };
}

export interface SubgraphOptions {
  /** Which relation types to include as edges. */
  relationTypes: EdgeType[];
  /** How many hops from the root to include. */
  depth: number;
}

/**
 * Build a subgraph centered on a root page, including only specified relation
 * types and traversing up to `depth` hops.
 */
export function buildSubgraphData(
  graph: RelationsGraph,
  pages: PageInfoMap,
  rootSlug: string,
  opts: SubgraphOptions,
): GraphData {
  const full = buildGraphData(graph, pages);
  const typesSet = new Set(opts.relationTypes);

  // Filter edges to only requested types
  const relevantEdges = full.edges.filter(e => typesSet.has(e.type));

  // BFS from root up to depth hops
  const includedSlugs = new Set<string>();
  let frontier = new Set<string>([rootSlug]);

  for (let d = 0; d <= opts.depth; d++) {
    for (const slug of frontier) {
      includedSlugs.add(slug);
    }
    if (d === opts.depth) break;

    const nextFrontier = new Set<string>();
    for (const slug of frontier) {
      for (const edge of relevantEdges) {
        if (edge.source === slug && !includedSlugs.has(edge.target)) {
          nextFrontier.add(edge.target);
        }
        if (edge.target === slug && !includedSlugs.has(edge.source)) {
          nextFrontier.add(edge.source);
        }
      }
    }
    frontier = nextFrontier;
  }

  return {
    nodes: full.nodes.filter(n => includedSlugs.has(n.id)),
    edges: relevantEdges.filter(
      e => includedSlugs.has(e.source) && includedSlugs.has(e.target),
    ),
  };
}

---
scope: L1
summary: "Relations system interfaces, inference rules, and graph-building contracts"
modified: 2026-05-09
reviewed: 2026-05-09
depends:
  - path: docs/L0-content
dependents:
  - path: docs/L2-graph-viz
  - path: docs/L2-information-density
  - path: docs/L2-info-architecture
---

# Relations System

The relations system connects pages into a typed, bidirectional graph at build time. Pages declare semantic relations in frontmatter; the graph builder infers inverses, extracts inline references from MDX bodies, and exposes the result as two maps consumed by breadcrumbs, navigation, and graph visualization.

The website relation model is a subset of the author's Obsidian PKM ontology. Folders and URL paths are browsing affordances. Frontmatter carries the real semantics.

## PageRelations interface

Each page in the graph has a `PageRelations` record with these fields:

| Field | Type | Meaning |
|-------|------|---------|
| `is` | `RelationTarget[]` | Instance-of / class membership |
| `has` | `RelationTarget[]` | Instances (inferred from others' `is`) |
| `subclass_of` | `RelationTarget[]` | Class taxonomy parent |
| `superclass_of` | `RelationTarget[]` | Taxonomy children (inferred from `subclass_of`) |
| `part_of` | `RelationTarget[]` | Mereology / composition parent |
| `has_part` | `RelationTarget[]` | Parts (inferred from `part_of`) |
| `subject` | `RelationTarget[]` | Aboutness target |
| `subject_of` | `RelationTarget[]` | Pages about this page (inferred from `subject`) |
| `creator` | `RelationTarget[]` | Authorship / creation target |
| `creator_of` | `RelationTarget[]` | Works created by this page (inferred from `creator`) |
| `related` | `RelationTarget[]` | Weak symmetric association |
| `up` | `RelationTarget[]` | Legacy route hierarchy parent. Prefer `part_of` for new content |
| `down` | `RelationTarget[]` | Legacy route hierarchy child. Prefer `has_part` for new content |
| `next` | `string \| undefined` | Next page in a sequence |
| `prev` | `string \| undefined` | Previous page in a sequence |
| `ref` | `string[]` | Outgoing references -- links this page makes to other pages |
| `refi` | `string[]` | Incoming references -- other pages that link to this one |

A `RelationTarget` carries a `slug` and an optional `label` display override. The `next`/`prev` and `ref`/`refi` fields use bare slug strings because they do not need labels.

## Frontmatter schema

Relation list fields are declared as arrays of objects with a required `page` slug and optional `label`.

```yaml
part_of:
  - page: blog
is:
  - page: classes/blog-note
subject:
  - page: concepts/personal-knowledge-management
related:
  - page: concepts/faceted-classification
next: blog/other-note
```

All relation fields are optional. The Zod schema in `content.config.ts` uses `.passthrough()`, so extra frontmatter keys are preserved even when they are not validated.

The `maturity` scalar follows the Obsidian PKM values: `stub`, `rough`, or `developed`.

## Inference rules

`buildRelationsGraph()` populates inverse relations automatically during its second pass. Each rule fires once per declared relation, and duplicates are skipped.

| Declared | Inferred on target | Notes |
|----------|--------------------|-------|
| A declares `is: B` | B gets `has: A` | Classification |
| A declares `has: B` | B gets `is: A` | Explicit inverse is also supported |
| A declares `subclass_of: B` | B gets `superclass_of: A` | Class DAG / taxonomy |
| A declares `superclass_of: B` | B gets `subclass_of: A` | Explicit inverse is also supported |
| A declares `part_of: B` | B gets `has_part: A` | Composition / mereology |
| A declares `has_part: B` | B gets `part_of: A` | Explicit inverse is also supported |
| A declares `subject: B` | B gets `subject_of: A` | Aboutness |
| A declares `subject_of: B` | B gets `subject: A` | Explicit inverse is also supported |
| A declares `creator: B` | B gets `creator_of: A` | Authorship / creation |
| A declares `creator_of: B` | B gets `creator: A` | Explicit inverse is also supported |
| A declares `related: B` | B gets `related: A` | Symmetric weak association |
| A declares `up: B` | B gets `down: A` | Legacy route hierarchy |
| A declares `down: B` | B gets `up: A` | Legacy explicit inverse |
| A declares `next: B` | B gets `prev = A` | Only if B has no `prev` already set |
| A declares `prev: B` | B gets `next = A` | Only if B has no `next` already set |
| A has `ref` containing B | B gets `refi` containing A | Symmetric: explicit `refi` also infers `ref` on the target |

The `next`/`prev` inference is asymmetric: explicit declarations win. If B already has a `prev` value, A's `next: B` will not overwrite it.

## buildGraphFromPages() / buildRelationsGraph()

The graph-building logic is split into two layers:

- `buildGraphFromPages(pages)` in `relations.ts` -- pure function that takes page data and returns the graph. Fully testable without Astro imports.
- `buildRelationsGraph()` in `relations-graph.ts` -- thin async wrapper that calls `getCollection('pages')` and delegates to `buildGraphFromPages`. Memoized so the graph is computed once per build, not per page.

**Output**: Returns `{ graph: RelationsGraph, pages: PageInfoMap }` where `RelationsGraph` is `Map<string, PageRelations>` and `PageInfoMap` is `Map<string, PageInfo>` (slug + title pairs).

The function executes in two passes. The first pass iterates every page, parsing frontmatter relations, extracting links from the MDX body, and building each page's initial `PageRelations`. The second pass walks the graph and fires the inference rules above, adding inverse entries to target pages.

Link extraction happens during the first pass. The `extractLinkSlugs` function scans the raw MDX body for markdown links (`[text](href)`). The extracted slugs populate the page's `ref` array, merged with any explicitly declared `ref` values from frontmatter.

## Link extraction rules

Markdown links are included when they point to a known page slug. The following are excluded:

- URLs starting with `http` (external links)
- Fragment-only links starting with `#`
- `mailto:` links
- Links pointing to the source page itself (self-references)
- Links whose resolved slug does not match any page in the collection

Relative paths are normalized: leading `./` is stripped, a leading `/` is ensured, and trailing slashes are removed. The resulting path is converted to a slug via `pathToSlug` (from `slugs.ts`).

## getBreadcrumbs() contract

**Input**: A page slug, the `RelationsGraph`, and the `PageInfoMap`.

**Output**: An array of `PageInfo` objects ordered from root to the current page.

The function walks the `part_of` chain by always following `part_of[0]`. If a page has no `part_of` entries, it falls back to legacy `up[0]`. A visited set prevents infinite loops if the chain contains cycles. The walk stops when a page has no semantic or legacy parent, or the current slug has already been visited.

## buildGraphData() and buildSubgraphData()

`buildGraphData()` converts the full `RelationsGraph` into a flat `{ nodes, edges }` structure for visualization. Each node carries a `connections` count (sum of all relation arrays). Edges use these forward types: `part_of`, `is`, `subclass_of`, `subject`, `creator`, `related`, `next`, and `ref`.

Inverse relations (`has_part`, `has`, `superclass_of`, `subject_of`, `creator_of`, `prev`, `refi`) are not emitted as separate edges -- they are represented by the forward edge. Legacy `up` edges are emitted as `part_of` only when a page has no explicit `part_of` relation. `next`/`prev` and `related` pairs are deduplicated so only one edge appears per pair.

`buildSubgraphData()` builds on `buildGraphData()` to extract a neighborhood around a root page. It accepts a `SubgraphOptions` with `relationTypes` (which edge types to traverse) and `depth` (maximum BFS hops from root). The BFS traverses edges bidirectionally -- if a page is connected as either source or target of a matching edge, it is reachable. The result contains only nodes within the BFS frontier and edges whose both endpoints are included.

## Key files

- `src/lib/relations.ts` -- `PageRelations` interface, `buildGraphFromPages()`, `getBreadcrumbs()`, `extractLinkSlugs()`
- `src/lib/relations-graph.ts` -- `buildRelationsGraph()` (Astro wrapper, memoized)
- `src/lib/slugs.ts` -- `slugToHref()`, `pathToSlug()`
- `src/lib/graph-data.ts` -- `GraphData` interfaces, `buildGraphData()`, `buildSubgraphData()`
- `src/content.config.ts` -- Zod schema defining the frontmatter relation fields

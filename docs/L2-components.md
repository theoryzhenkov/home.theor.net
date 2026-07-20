---
scope: L2
summary: "Astro component catalog, props, slots, and page assembly data flow"
modified: 2026-06-22
reviewed: 2026-06-22
depends:
  - path: docs/L1-routing
  - path: docs/L1-styles
  - path: docs/L2-header-nav
  - path: docs/L2-info-architecture
dependents:
  - path: docs/L3-footnotes-layout
---

# Components

## Page layout

`Page.astro` is the top-level layout. It receives all page data as props, assembles the three-column grid, and wires up client-side scripts.

### Props

| Prop | Type | Required | Purpose |
| --- | --- | --- | --- |
| `title` | `string` | yes | Page `<h1>` and passed to `Head` for `<title>` |
| `description` | `string` | no | Rendered below the title as inline HTML via `marked.parseInline()`. A plain-text variant (markdown links stripped) goes to the `<meta>` description |
| `created` | `Date` | yes | Forwarded to `MetadataStrip` |
| `modified` | `Date` | no | Forwarded to `MetadataStrip` |
| `headings` | `{ depth, slug, text }[]` | yes | Forwarded to `TOC` |
| `breadcrumbs` | `PageInfo[]` | no | Forwarded to `Breadcrumb` |
| `currentSlug` | `string` | no | Forwarded to `Breadcrumb` |
| `relations` | `PageRelations` | no | Forwarded to `MetadataStrip` |
| `pageInfoMap` | `PageInfoMap` | no | Forwarded to `MetadataStrip` |

### Assembly

The grid is `aside-margin | main | (implicit right aside)`. Inside `<main>`:

1. `Breadcrumb` -- hierarchy path
2. `<h1>` title
3. Description paragraph (`set:html` with parsed markdown)
4. `MetadataStrip` -- dates, maturity, graph/backlink affordances, and relation rows
5. `<slot />` wrapped in `.prose` -- the MDX content, including route-provided components such as `ContentTable`, `NotesFeed`, and `LinkCards`
6. `Backlinks` -- incoming references after prose
7. `Footnotes` -- after the prose content (JS-populated on narrow viewports)

`TOC` sits in the left `aside-margin`. `Search` is placed after the grid (fixed-position modal). A `#popup-container` div follows for hover popups.

### Inline scripts

Page.astro imports two modules (`@/scripts/popups`, `@/scripts/footnotes`) and defines one inline script: heading links.

The heading links script (`initHeadingLinks`) queries all `h1`-`h6` elements with an `id` inside `.prose`. For each heading it appends a chain-link SVG icon (`.heading-link-icon`). Clicking the heading text sets `window.location.hash`. Clicking the icon copies the full URL (origin + pathname + `#id`) to the clipboard via `navigator.clipboard.writeText`, falling back to hash navigation on failure.

The script runs on both `DOMContentLoaded` and `astro:page-load` to support view transitions.

## Component catalog

### Layout components

| Component | Props | Slots | Behavior |
| --- | --- | --- | --- |
| `Head` | `title: string`, `description?: string` | none | Emits `<head>` with charset, viewport, favicon, OG tags. Formats title as `"Title · TheoR.net"` (or just `"TheoR.net"` when title is `"Welcome"`). Imports `global.css`. |
| `Header` | none | none | Sticky nav bar. Hardcoded nav items array (Home, Site, Me, Projects, Blog, Contact, Graph). Highlights active link by matching `Astro.url.pathname`. Includes a search trigger button showing a magnifying glass and `Cmd+K` hint. |
| `Breadcrumb` | `breadcrumbs: PageInfo[]`, `currentSlug: string` | none | Renders `<nav>` with `<ol>` of breadcrumb links separated by `/`. Returns `null` when breadcrumbs has 0 or 1 items. Maps `index` slug to `/`, others to `/{slug}/`. |
| `Metadata` | `created: Date`, `modified?: Date` | none | Shows "Created {date}" and optionally " · Updated {date}". Formats as `en-US` short date (`"Mar 15, 2026"`). |

### Content components

Author-facing MDX components live in `src/components/content/` or `src/components/notes/`. Routes pass the common components into MDX, so pages can use `<ContentTable />`, `<LinkCards />`, and `<NotesFeed />` directly without imports.

| Component | Props | Slots | Behavior |
| --- | --- | --- | --- |
| `TOC` | `headings: { depth, slug, text }[]` | none | Filters to `h2` and `h3` only. Renders a `<nav>` with ordered list of anchor links. `h3` items are indented via `data-depth` attribute. Imports `toc-scrollspy.ts` for active-section highlighting. Hidden when no qualifying headings exist. |
| `Footnote` | `id: string` | default | Produces a `<sup>` reference link (`#fnref-{id}`) and an adjacent `<span class="sidenote">` containing the slot content. The sidenote is positioned by CSS as a margin note on wide viewports. The `data-footnote-id` attribute is used by `footnotes.ts` for narrow-viewport fallback. |
| `Footnotes` | none | none | Empty `<section>` container with an `<ol>`. Populated at runtime by `footnotes.ts`, which clones sidenote content into this list on narrow viewports. Has `data-empty="true"` by default. |
| `ContentTable` | `path?: string`, `classSlug?: string`, `columns?: Column[]`, `defaultSort?: { field, direction }`, `linkToPage?: boolean` | none | Queries the `pages` collection, filters by optional `path` prefix and/or `is` relation target. Builds a sortable, filterable `<table>`. Columns default to title, description, and created date; default sort is title ascending for path listings and created descending for class listings. Column types: `text`, `date`, `link`, `url`, `status`, `links`. Client-side JS handles sort toggling (via `aria-sort`) and filter dropdowns. |
| `LinkCards` | `links?: { kind?, label?, href, detail? }[]`, `label?: string`, shorthand URL props: `github`, `website`, `release`, `chrome`, `firefox`, `docs` | none | Renders compact README-style external link cards. Known kinds get default labels and kind markers; authors control card order with `links` and can use shorthand props for common single-purpose cards. |

### Relations components

| Component | Props | Slots | Behavior |
| --- | --- | --- | --- |
| `TopRelations` | `relations: PageRelations`, `pages: PageInfoMap`, `links?: Record<string, string>` | none | Legacy relation-list component. Renders relation rows as labeled link lists and can append external links; current page layout uses `MetadataStrip` instead. |
| `RelationsGraph` | `graph: RelationsGraph`, `pages: PageInfoMap`, `rootSlug: string`, `relationTypes?: EdgeType[]`, `depth?: number`, `height?: string` | none | Calls `buildSubgraphData` to extract a subgraph, serializes it as JSON into a `data-graph` attribute. Client-side JS (via `createGraph` from `@/scripts/graph/renderer`) renders a D3 force-directed graph. Defaults: depth 1, types `['up', 'is', 'next', 'ref']`, height `300px`. Draggable, not zoomable. |

### Search

| Component | Props | Slots | Behavior |
| --- | --- | --- | --- |
| `Search` | none | none | Fixed-position modal. Opens on `Cmd/Ctrl+K` or search button click. Lazy-loads Pagefind (`/pagefind/pagefind.js`) on first query. Debounces input by 200ms. Shows top 10 results with title and excerpt. Closes on `Esc`, backdrop click, or result click. Uses `is:inline` script (no module bundling). |

## Data flow

The catch-all route `[...slug].astro` drives all page rendering:

1. `getStaticPaths` calls `getSiteRouteEntries()` and generates a path for every non-index page.
2. `site-pages.ts` calls each entry's `render()` method to get the MDX `Content` component and extracted `headings`.
3. It calls `buildRelationsGraph()` which scans all pages and builds the full graph and `PageInfoMap`.
4. From the graph it derives `breadcrumbs` (via `getBreadcrumbs`) and `relations` (via `getPageRelations`) for the current slug.
5. All of this, plus frontmatter fields (`title`, `description`, `created`, `modified`), is passed as props to `Page.astro`.
6. `Page.astro` distributes props to child components without transformation, except for `description` which it processes into both an HTML and a plain-text variant. External project/resource links are ordinary MDX content rendered through route-provided components such as `LinkCards`.

`buildRelationsGraph()` is memoized, so the graph is built once per build process and reused across all pages.

## Key files

- `src/layouts/page/Page.astro` -- main layout, prop distribution, heading links script
- `src/components/` -- layout and site components
- `src/components/content/` -- author-facing components made available to MDX pages
- `src/pages/[...slug].astro` -- data flow: collection query, graph build, prop assembly
- `src/lib/relations.ts` -- `buildGraphFromPages`, `getBreadcrumbs`, `getPageRelations`, type definitions
- `src/lib/link-cards.ts` -- external link-card normalization for manual MDX components and table helpers
- `src/lib/relations-graph.ts` -- `buildRelationsGraph` (memoized Astro wrapper)
- `src/lib/graph-data.ts` -- `buildSubgraphData`, `EdgeType`
- `src/scripts/popups/` (11 modules), `src/scripts/footnotes.ts`, `src/scripts/toc-scrollspy.ts` -- client-side behavior
- `src/scripts/graph/renderer.ts` -- D3 graph rendering

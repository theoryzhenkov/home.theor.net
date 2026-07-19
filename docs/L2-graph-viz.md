---
scope: L2
summary: "Graph visualization: data pipeline, D3 force renderer, page-level interaction model"
modified: 2026-05-09
reviewed: 2026-05-09
depends:
  - path: docs/L1-relations
  - path: docs/L1-scripts
  - path: docs/L1-design-vision
    section: "Interaction language"
  - path: docs/L1-styles
    section: "Interaction primitives"
---

# Graph visualization

The site renders interactive force-directed graphs of page relations using D3. Two contexts exist:

- a full-site graph page at `/graph`
- per-page subgraph components embedded in content

The full graph is a power feature, not a primary navigation surface. It should feel like the page itself, with minimal chrome and revealable tools, not like a dashboard panel added on top of the site.

## Data pipeline

```
buildRelationsGraph()          (server, relations.ts)
        |
        v
buildGraphData() / buildSubgraphData()   (server, graph-data.ts)
        |
        v
JSON serialized into HTML       (<script type="application/json"> or data-graph attribute)
        |
        v
Client JS parses JSON, calls createGraph()   (browser, renderer.ts)
        |
        v
D3 force simulation + SVG rendering
```

**Full graph** (`graph.astro`): calls `buildRelationsGraph()` then `buildGraphData()`, serializes the result into a hidden `<script type="application/json" id="graph-data">` element. Client-side init parses this and passes it to `createGraph()`.

**Subgraph** (`RelationsGraph.astro`): receives `graph`, `pages`, and `rootSlug` as Astro props, calls `buildSubgraphData()` server-side, serializes the result into a `data-graph` attribute on the container div.

## Types

### GraphNode

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Page slug |
| `title` | `string` | Display title |
| `connections` | `number` | Sum of all relation counts |

### GraphEdge

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | Source page slug |
| `target` | `string` | Target page slug |
| `type` | `EdgeType` | One of `'part_of' | 'is' | 'subclass_of' | 'subject' | 'creator' | 'related' | 'next' | 'ref'` |

### EdgeType

Union: `'part_of' | 'is' | 'subclass_of' | 'subject' | 'creator' | 'related' | 'next' | 'ref'`. Maps directly to relation semantics defined in the relations system.

## Subgraph extraction

`buildSubgraphData(graph, pages, rootSlug, opts)` produces a neighborhood graph:

1. Builds the full graph via `buildGraphData()`.
2. Filters edges to only the requested `relationTypes`.
3. Runs BFS from `rootSlug` up to `opts.depth` hops, traversing edges bidirectionally.
4. Returns nodes and edges where both endpoints are in the visited set.

Default props in `RelationsGraph.astro`: all edge types, depth 1.

## Edge deduplication

`buildGraphData()` stores directional edges once per declaration. For symmetric pairs (`next` / `prev`), it deduplicates using a sorted slug-pair key, preventing the same sequential link from appearing twice when both sides declare it.

## D3 force simulation

### Parameters

| Force | Parameter | Value |
|-------|-----------|-------|
| `link` | distance | `part_of` 86, `is` 94, `subclass_of` 98, `next` 102, `related` 120, other semantic/reference edges 114 |
| `charge` | strength | `-18` for isolated nodes; otherwise `-118 - min(connections, 12) * 5` |
| `x` / `y` anchor | strength | `0.14` for isolated nodes, `0.065` for connected components |
| `center` | position | `(0, 0)` |
| `collide` | radius | `nodeCollisionRadius(node)` based on node size and title length |
| simulation | `alphaDecay` / `velocityDecay` | `0.04` / `0.45` |

### Node radius formula

```
nodeRadius(connections) = clamp(4, 4 + sqrt(connections) * 2.5, 16)
```

Nodes with more connections appear larger, bounded between 4px and 16px.

### Component anchoring

The graph is not laid out as one undifferentiated force cloud. Before the simulation starts, nodes are partitioned into connected components and each component receives an anchor position:

1. The largest component stays centered.
2. Smaller components are placed on compact outer rings.
3. Nodes inside each component start on a local ring around that anchor.

This keeps isolated or disconnected nodes from drifting arbitrarily far away and makes the overall page easier to scan.

## SVG rendering

The renderer appends an SVG to the container with `width` and `height` at `100%` and a `viewBox` matching the container's client dimensions.

**Structure:**

- `<defs>`: arrow markers for directed edge types
- `<g>` root group (receives zoom transform)
  - `<g class="graph-edges">`: `<line>` elements per visible edge
  - `<g class="graph-edge-labels">`: short text labels (`part`, `is`, `sub`, `subj`, `by`, `rel`, `next`, `ref`)
  - `<g class="graph-nodes">`: `<g>` per node
    - `<a class="graph-node-link">`
      - `<circle>`
      - `<text>`

Nodes are SVG anchors, not inert shapes. That means the site's normal link behavior still applies on the graph page, including hover-prefetch and page previews.

Labels use the mono font and sit outside the circle, on the side facing away from the component center. This reduces overlap in dense clusters and keeps titles readable.

## Edge styles

Per the current design direction, edge types use **color as the categorical encoding** and **stroke width as a secondary weight cue**. Texture is not used.

| Type | Color token | Width | Directed | Label |
|------|-------------|-------|----------|-------|
| `part_of` | `--color-rel-hierarchy` | 1.45 | yes | `part` |
| `is` | `--color-rel-type` | 1.3 | yes | `is` |
| `subclass_of` | `--color-rel-type` | 1.2 | yes | `sub` |
| `subject` | `--color-rel-reference` | 1.05 | yes | `subj` |
| `creator` | `--color-rel-sequence` | 1.05 | yes | `by` |
| `related` | `--color-text-subtle` | 0.9 | no | `rel` |
| `next` | `--color-rel-sequence` | 1.15 | yes | `next` |
| `ref` | `--color-rel-reference` | 0.95 | yes | `ref` |

Long enough edges also receive a short inline label near the midpoint. Very short edges suppress the label to reduce clutter.

### Runtime color resolution

`EDGE_STYLES` and `NODE_COLORS` are initialized with hex fallbacks. On first render, `resolveRuntimeColors()` reads CSS custom properties via `getComputedStyle(document.documentElement)` and overwrites the color values in-place. The `cssVar(name, fallback)` helper returns the fallback when running server-side.

## Interaction model

### Zoom and pan

Enabled by default on the full graph page, disabled on embedded subgraphs. Scale range: `0.15x` to `5x`. Initial transform centers the content with `0.9x` scale.

Manual zoom or pan breaks focus mode. Focus is treated as a tracked orientation state; once the user takes control of the camera, the graph exits that state.

### Drag

Enabled in both contexts. On drag start, the node's position is fixed (`fx` / `fy`) and `alphaTarget` is raised to `0.3` to reheat the simulation. On drag end, the fixed position is released and `alphaTarget` returns to `0`.

If the dragged node is the focused node, the camera follows it while the drag is in progress. Dragging also suppresses link navigation briefly so a reposition action does not accidentally open the target page.

### Hover highlight

On `mouseenter`, the renderer collects all nodes connected to the hovered node through currently visible edge types. Connected nodes stay at full opacity; all others fade. Related edges and edge labels strengthen in opacity while unrelated ones fade. On `mouseleave`, the graph returns to its baseline state.

### Click and preview

Default behavior navigates to the page: slug `'index'` maps to `'/'`, others to `'/{slug}/'`. Because nodes are anchors, the graph participates in the site's normal preview and prefetch system instead of relying on a separate tooltip layer.

### Focus

The full graph page supports focus by slug via `?focus=...` and via the in-page search reveal.

- `focusNode(nodeId)` records a focused node, centers the camera on it, and keeps it centered as the simulation ticks.
- The page shows focus state outside the SVG as a compact contextual badge with title and path.
- `clearFocus()` exits focus mode without forcing a camera reset.
- `resetView()` exists at the renderer level for future use, but the current page UI does not expose an overview button.

Focus is an orientation aid, not a hard filter.

## Filtering

`graph.astro` renders relation-family toggles inside a revealable flyout. When the user toggles relation visibility, the page calls `instance.setVisibleTypes(types)`.

This does **not** rebuild the simulation or re-layout the graph. The renderer updates edge and edge-label visibility in place, so the physical graph stays stable while relation families are hidden or shown.

## Full graph page UI

The full graph page follows the site's interaction-language rules:

- The graph itself is the page surface.
- Secondary controls are gathered into a compact tool dock near the top-center working area rather than left in the viewport corners.
- Reveal controls stay compact, but they must remain discoverable at a glance against the graph field.
- The dock should avoid double-framing: either the dock surface or the controls provide the main boundary, not both.
- Control labels and graph labels should favor legibility over atmospheric low-contrast styling.
- Only one reveal panel in the control cluster should be open at once.
- Current focus is shown as a small context badge, not as a toolbar title or metrics strip.
- Tooling stays minimal. The page should not expose counts, legends, or instructional copy unless it meaningfully improves task completion.

Current controls:

- `focus`: search field inside a reveal panel
- `relations`: reveal panel for relation-family visibility
- focus badge: current focused node title + path + clear action

## Metadata strip link

The metadata strip on each article page includes a `graph` text link pointing to `/graph?focus={slug}`. This connects the reading flow to the graph visualization without putting graph-specific controls into the header.

The link is an accent-colored text affordance in the metadata row. No icon and no button chrome.

## Key files

| File | Role |
|------|------|
| `src/lib/graph-data.ts` | `GraphNode`, `GraphEdge`, `EdgeType` types; `buildGraphData()` and `buildSubgraphData()` |
| `src/scripts/graph/renderer.ts` | `createGraph()` D3 renderer, `GraphConfig`, `GraphInstance` |
| `src/scripts/graph/styles.ts` | `EDGE_STYLES`, `NODE_COLORS`, `cssVar()`, `resolveRuntimeColors()` |
| `src/components/RelationsGraph.astro` | Embeddable subgraph component |
| `src/pages/graph.astro` | Full-site graph page with revealable tool panels and focus badge |

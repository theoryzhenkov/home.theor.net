---
scope: L1
summary: "Client-side script interfaces, lifecycle, and behavior contracts"
modified: 2026-03-20
reviewed: 2026-03-20
depends:
  - path: docs/L0-ui
dependents:
  - path: docs/L2-graph-viz
  - path: docs/L3-footnotes-layout
---

# Client-Side Scripts

All client-side scripts run within Astro's view-transition lifecycle. Each script follows a shared initialization pattern and manages its own cleanup.

## Script Lifecycle

Every script hooks into two Astro events:

- **`astro:page-load`** — initialize the script. Fires on initial load and after every client-side navigation.
- **`astro:before-preparation`** — tear down event listeners and timers before the next page transition begins. Registered with `{ once: true }`.

As a fallback for non-SPA loads, scripts also check `document.readyState` and attach to `DOMContentLoaded` if the DOM is still loading, or call `init()` immediately otherwise.

## footnotes.ts

Dual-mode footnote layout engine. Switches behavior at a viewport width breakpoint.

| Constant | Value | Purpose |
|---|---|---|
| `BREAKPOINT` | 1024 px | Wide/narrow mode threshold |
| `SIDENOTE_GAP` | 8 px | Vertical spacing between stacked sidenotes |
| `RESIZE_DEBOUNCE` | 100 ms | Debounce window for resize relayout |

### Wide mode (> 1024 px)

Positions `.sidenote` elements absolutely within `.prose`, aligned to their `fnref-{id}` reference element's `offsetTop`. Sidenotes stack downward: if a sidenote would overlap the previous one, it is pushed below it. If the last sidenote exceeds `.prose` height, extra `paddingBottom` is added.

### Narrow mode (<= 1024 px)

Clones sidenote content into the `#footnotes` footer's `.aside-panel-list` ordered list. Each cloned item gets `id="fn-narrow-{id}"`. The `data-empty` attribute on `#footnotes` is set to `"true"` or `"false"` accordingly.

### Click handling

In wide mode, clicking a `.footnote-ref .footnote-number` link prevents default navigation, scrolls the corresponding sidenote into view (`smooth`, `nearest`), and applies a `sidenote-highlight` CSS class for 1500 ms. In narrow mode, default anchor behavior is preserved.

### Cleanup

Removes the resize listener and clears any pending debounce timer on `astro:before-preparation`.

## toc-scrollspy.ts

Multi-select scroll spy for the table of contents. Multiple TOC entries can be active simultaneously.

### Visibility metric

A section (from one heading to the next, or to `.prose` bottom for the last heading) is marked active when either condition holds:

| Metric | Threshold | Meaning |
|---|---|---|
| Viewport coverage | >= 40% | The section's visible portion fills at least 40% of the viewport |
| Section visibility | >= 90% | At least 90% of the section is within the viewport |

The viewport top is offset by `5rem` (5 * root font size) to account for the sticky header.

If no section meets either threshold, the first heading is used as a fallback.

### Performance

Scroll events are throttled via `requestAnimationFrame` — only one recalculation runs per frame.

### Cleanup

Removes the scroll listener on `astro:before-preparation` (`{ once: true }`).

## popups/ (modular popup system)

Rich content preview popups with full Gwern-style window management. Implemented as 11 TypeScript modules in `src/scripts/popups/`.

### Content fetching

Fetches actual page HTML via `fetch()` + `DOMParser`, caches parsed documents in memory with inflight deduplication. Falls back to `popup-index.json` (title + description) on fetch failure. Three content types: page (`.prose` extraction), section (`#hash` heading + siblings), footnote (sidenote content).

### Event delegation

Uses `mouseover`/`mouseout` on `<article>` for page links, plus a `document`-level `mouseover` for links inside popups (which live outside `<article>`). Scroll suppression prevents spawning during scroll; re-enabled on next `mousemove`.

### Hover behavior

- On hover: prefetch fires at **50ms**, popup spawns at **750ms** with a loading spinner, content swapped in when fetch completes.
- Popup repositions using a priority cascade: nested popups try right → left → below → above; root popups try below → above → right → left.
- Moving the cursor onto the popup cancels fade timers and focuses the popup.
- On mouse leave: **100ms** fade delay, but only if the popup is ephemeral (not pinned) and the cursor isn't moving to a descendant popup.
- Links to the current page are ignored. Footnote popups are suppressed when the sidenote is already visible.

### Window management

Each popup has a 4-button titlebar: pin, minimize, zoom/tile, close. Additional interactions: pointer-capture drag on titlebar, 8-direction edge/corner resize, keyboard tiling (Alt+Q/W/E/A/S/D/Z/X/C for 9 positions). Z-order is managed sequentially with focused popup on top. Minimized popups collapse to a dynamic taskbar strip. Alt+click close dismisses all popups.

### Nesting

Unlimited depth with cycle prevention (ancestor chain check). Ephemeral popups are auto-despawned when a sibling spawns; pinned popups persist. Spawn guard prevents duplicate concurrent spawns for the same href.

### Constants

| Constant | Value | Purpose |
|---|---|---|
| `spawnDelay` | 750 ms | Hover-to-popup delay |
| `prefetchDelay` | 50 ms | Background fetch start |
| `fadeOutDelay` | 100 ms | Mouse-leave grace period |
| `fadeOutDuration` | 250 ms | CSS opacity transition |
| `baseZIndex` | 200 | Z-index floor for popups |
| `dragThreshold` | 3 px | Click vs drag distinction |
| `tileMargin` | 4 px | Gap around tiled popups |
| `mobileBreakpoint` | 1024 px | Switch to mobile popins |

## Search (Pagefind)

Inline `<script is:inline>` in `Search.astro`. Renders a modal dialog triggered by keyboard shortcut or button click.

### Loading

Pagefind (`/pagefind/pagefind.js`) is imported dynamically on the first search query. The module is cached after initialization. If the import fails (e.g., dev mode without a build), a fallback message is shown.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open search modal |
| `Escape` | Close search modal |

### Search behavior

Input is debounced at **200 ms**. Results are capped at 10 items. Each result displays the page title (or URL as fallback) and an excerpt with `<mark>` highlights. Clicking a result or the backdrop closes the modal. The modal sets `body.overflow = 'hidden'` while open.

### Lifecycle

Re-initializes on `astro:page-load`. Event listeners for keyboard shortcuts are re-attached on each init (no deduplication guard — relies on Astro replacing the script element on navigation).

## graph/ (D3 Force Graph)

`renderer.ts` creates a D3 force-directed graph inside a container element. `styles.ts` defines visual constants and resolves CSS custom properties at runtime.

### createGraph(container, data, config?) -> GraphInstance

Factory function. Returns a `GraphInstance` with three methods:

| Method | Behavior |
|---|---|
| `destroy()` | Stops the simulation, removes SVG and tooltip |
| `resize()` | Updates viewBox and recenters the force; restarts with `alpha(0.3)` |
| `setVisibleTypes(types)` | Filters edges by `EdgeType`, rebuilds edge selection, restarts with `alpha(0.1)` |

### Force simulation parameters

| Force | Parameter | Value |
|---|---|---|
| `link` | distance | 80 |
| `charge` | strength | -200 |
| `center` | position | (0, 0) initial; recentered on resize |
| `collide` | radius | `nodeRadius(connections) + 8` |

Node radius: `max(4, min(16, 4 + sqrt(connections) * 2.5))`.

### Zoom

Enabled by default (`zoomable` config). Scale extent: **0.15 -- 5**. Initial transform centers content at `(width/2, height/2)` scaled to 0.9.

### Drag

Enabled by default (`draggable` config). On drag start, `alphaTarget` is set to 0.3 to keep the simulation warm. On drag end, `alphaTarget` returns to 0 and the node is unpinned (`fx`/`fy` set to `null`).

### Hover highlighting

On `mouseenter` of a node, all non-neighbor nodes fade to opacity 0.15 and non-incident edges fade to 0.05. The hovered node and its neighbors remain at full opacity. On `mouseleave`, all elements restore to default opacity (1 for nodes, 0.6 for edges).

A tooltip `<div>` follows the cursor showing the node title.

### Edge styles

| Type | Color source | Width | Dash | Directed | Label |
|---|---|---|---|---|---|
| `up` | `--color-accent` | 2 | solid | yes | Up / Down -- hierarchy |
| `is` | `--color-success` | 1.5 | `6 3` | yes | Is / Has -- classification |
| `next` | `--color-accent` | 1 | `2 4` | yes | Next / Prev -- sequential |
| `ref` | `--color-border` | 0.75 | `1 3` | yes | Ref -- reference link |

Node colors are resolved from CSS custom properties (`--color-text-muted`, `--color-accent`, `--color-border`, `--color-text`) with hex fallbacks.

## Key files

| File | Role |
|---|---|
| `src/scripts/footnotes.ts` | Footnote layout engine (wide/narrow modes) |
| `src/scripts/toc-scrollspy.ts` | TOC scroll spy with multi-select |
| `src/scripts/popups/` | Modular popup system (11 modules) with window management |
| `src/scripts/graph/renderer.ts` | D3 force graph renderer and public API |
| `src/scripts/graph/styles.ts` | Edge/node visual constants, CSS variable resolution |
| `src/components/Search.astro` | Search modal with Pagefind integration |

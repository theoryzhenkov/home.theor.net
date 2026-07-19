---
scope: L3
summary: "Link styling, icons, hover previews, and chain-popup system — Gwern.net reference analysis and implementation for Astro + MDX"
modified: 2026-03-20
reviewed: 2026-03-20
depends:
  - path: docs/L2-reading-experience
    section: "Link previews"
  - path: docs/L1-styles
    section: "Colors"
  - path: docs/L3-remark-plugins
---

# Link System

This spec documents how Gwern.net implements its link styling, icons, and popup preview system, then proposes how to adapt each feature for this site's Astro + MDX stack. The goal is to replicate the most valuable behaviors at a fraction of the complexity — Gwern's system is ~500 link-icon rules across a custom Haskell build pipeline; ours needs to work within remark/rehype and client-side TypeScript.

## 1. Link underline styles

Gwern uses three visually distinct underline treatments to communicate link behavior before the reader clicks.

### How Gwern does it

All three use a Tufte CSS-inspired technique: `background-image` with a 1px-tall `linear-gradient` positioned at the baseline, combined with `text-shadow` to create the skip-ink effect (the underline "breaks" around descenders like g, p, y). This avoids `text-decoration: underline` entirely because CSS `text-decoration-skip-ink` has inconsistent browser support and inferior typographic output.

The base underline CSS:

```css
.markdownBody a {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 1px 1px;
  background-repeat: repeat-x;
  background-position: 0% calc(100% - 0.1em);
  text-decoration: none;
}

/* text-shadow creates "gaps" around descenders */
.markdownBody a, .markdownBody a * {
  text-shadow:
    0      0.05em  var(--link-underline-background-color),
    0.05em 0.05em  var(--link-underline-background-color),
   -0.05em 0.05em  var(--link-underline-background-color),
    /* ... more offsets for full coverage */
}
```

The three styles:

| Style | Visual | CSS mechanism | Meaning |
| ----- | ------ | ------------- | ------- |
| Solid | `____` | Default `background-image: linear-gradient(solid)` | Ordinary link, no popup |
| Dotted | `....` | `background-size: 2px 1px` with 50% transparent gradient | Annotated link with metadata popup |
| Left hook | `\|_` | Extra `::before` pseudo-element drawing an L-shaped corner | Live-link with content preview popup |

The dotted underline CSS modifies the gradient to alternate color and transparent:

```css
a.has-annotation {
  background-image: linear-gradient(to right,
    var(--link-underline-gradient-line-color) 50%,
    var(--link-underline-background-color) 50%);
  background-size: 2px 1px;
}
```

The left hook adds a small vertical stroke at the left edge of the link via `::before`, creating an L-shape that signals "this link has an interactive preview."

Classes that control these styles: `.has-annotation`, `.has-annotation-partial`, `.has-indicator-hook`.

### Adaptation for our stack

We already have link previews described in L2-reading-experience. The three-tier underline system maps to our content:

| Our link type | Gwern equivalent | Underline | When |
| ------------- | ---------------- | --------- | ---- |
| Internal with preview | Live-link | Dotted | Links to pages we have metadata for (all internal pages) |
| External | Ordinary | Solid | Links to external URLs |
| Broken/draft | n/a | Dashed, muted | Links to pages with maturity=draft or missing targets |

Two styles (solid and dotted) are sufficient for us. The left-hook is clever but adds implementation complexity for a third category we don't need yet.

**Implementation approach — native CSS `text-decoration`:**

As of 2025, native CSS underline properties have caught up with the Tufte gradient technique. `text-decoration-skip-ink: auto` is Baseline Widely Available in all modern browsers, producing clean descender avoidance without the `text-shadow` hack. `text-decoration-style` (solid/dashed/dotted) and `text-underline-offset` give full control over appearance. The native approach is simpler, more maintainable, and produces equivalent visual results for our four link types.

We do NOT use the `background-image` gradient technique. The Gwern analysis above is preserved as reference for the design rationale, but our implementation uses native properties:

```css
.prose a {
  text-decoration-line: underline;
  text-decoration-skip-ink: auto;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
```

### Link type differentiation via underline style

Beyond the internal/external split, link type is communicated through **underline style only** -- not color, not icons (the existing external link icon in prose.css stays as a secondary signal, but the underline is the primary encoding). This preserves the design vision's rule that accent color is reserved for interactive affordances uniformly, while adding a new information channel through a visual property that is already present.

| Link type | Detection | Underline style | Rationale |
| --- | --- | --- | --- |
| Internal (same site) | `href` starts with `/` and matches a known page slug | Solid underline, `1px`, `--color-accent` | Default, most trusted -- stays within the knowledge graph |
| External (general) | `href` starts with `http` and is not Wikipedia | Dashed underline, `1px`, `--color-text-subtle` | Signals departure; the muted color reduces visual pull toward exits |
| Wikipedia | `href` contains `wikipedia.org` | Dotted underline, `1px`, `--color-text-subtle` | Reference lookup; distinct from general external because Wikipedia links are "look this up" rather than "go explore this" |
| Anchor (same page) | `href` starts with `#` | No underline, accent text only | Same-page jumps do not need the "this goes somewhere" signal |

CSS implementation uses native `text-decoration-*` properties keyed off attribute selectors:

```css
/* Internal (default, solid) */
.prose a[href^="/"] {
  text-decoration-style: solid;
  text-decoration-color: var(--color-accent);
}

/* External (dashed) */
.prose a[href^="http"] {
  text-decoration-style: dashed;
  text-decoration-color: var(--color-text-subtle);
}

/* Wikipedia (dotted, more specific selector wins) */
.prose a[href*="wikipedia.org"] {
  text-decoration-style: dotted;
  text-decoration-color: var(--color-text-subtle);
}

/* Anchor / same-page (no underline) */
.prose a[href^="#"] {
  text-decoration: none;
}
```

Pure CSS, no JS. Four attribute selectors in `prose.css`. The link preview system already distinguishes internal from external for hover behavior, so no new detection logic is needed.

---

## 2. Link icons

Gwern appends small icons after links to indicate the destination type: a fraktur G for internal essays, a W for Wikipedia, domain logos for known sites, file-type indicators for PDFs and images.

### How Gwern does it

The system has two halves: a compile-time classifier and a CSS renderer.

**Compile-time (Haskell, `LinkIcon.hs`):** During site build, every `<a>` element is analyzed. URL patterns are matched against ~500 rules. Matching links receive two data attributes:

- `data-link-icon`: the icon identifier (an SVG filename like `"wikipedia"` or a text string like `"TLP"`)
- `data-link-icon-type`: the rendering method (`"svg"`, `"text"`, `"text,quad,mono"`, `"text,tri,sans"`, etc.)

Optional: `data-link-icon-color` for colored hover effects.

A `<span class="link-icon-hook">` is injected inside the link as an anchor point for the CSS `::after` pseudo-element.

**CSS rendering (links.css):** The CSS reads the data attributes and renders icons:

```css
/* SVG icons */
a[data-link-icon-type*='svg'] .link-icon-hook::after {
  content: "";
  background-image: var(--link-icon-url);
  background-size: var(--link-icon-size, 0.55em);
  opacity: var(--link-icon-opacity, 0.55);
}

/* Text icons (emoji, abbreviations) */
a[data-link-icon-type*='text'] .link-icon-hook::after {
  content: var(--link-icon);
  font-size: var(--link-icon-size, 0.55em);
  font-family: var(--link-icon-font);
  opacity: var(--link-icon-opacity, 0.55);
}
```

Per-icon overrides set custom properties for size, offset, and opacity — e.g., Wikipedia icons are 0.60em at 0.65 opacity, PDF icons resize responsively. The text icon types support modifiers: `tri` compresses three letters horizontally, `quad` arranges four letters in a 2x2 grid, `sans`/`mono`/`italic` control the font face.

Icon types include: SVG logos for major domains (Wikipedia, GitHub, ArXiv, etc.), Unicode characters for abstract concepts, multi-letter abbreviations for domains without logos, and directional arrows for within-page cross-references.

**Design principle (Gwern's own words):** "If it is not obvious to us what a link-icon should be, then that means having one is wrong." Icons chosen emphasize simplicity and familiarity over comprehensive coverage.

### Adaptation for our stack

Our site has far fewer link categories than Gwern's. A minimal icon set covers our actual needs:

| Icon | Target | Rendering | Priority |
| ---- | ------ | --------- | -------- |
| `↗` | External links | Text `::after` | Phase 1 |
| Page maturity dot | Internal links (color-coded) | CSS `::before` with `var(--color-status-*)` | Phase 1 |
| `W` | Wikipedia | Text `::after` | Phase 2 |
| GitHub mark | GitHub repos | SVG `::after` | Phase 2 |
| `📄` or PDF glyph | PDF links | Text `::after` | Phase 2 |

**Implementation approach:**

Phase 1 uses a rehype plugin that runs during the Astro build. For each `<a>`:

1. Check if `href` is external (doesn't start with `/` and isn't the site domain). If so, add `data-link-icon="external"` and `data-link-icon-type="text"`.
2. Check if `href` is internal. If so, resolve the target page's maturity from the content collection and add `data-link-maturity="draft|stable|evergreen"`.
3. Inject a `<span class="link-icon-hook"></span>` inside the link for CSS targeting.

Phase 2 adds domain-specific icons via URL pattern matching in the same plugin. Keep the rule list under 20 entries — we don't need 500.

CSS renders icons identically to Gwern's approach: `::after` pseudo-element on `.link-icon-hook`, sized with CSS custom properties, at reduced opacity to avoid visual noise.

```css
/* External link arrow */
a[data-link-icon="external"] .link-icon-hook::after {
  content: "↗";
  font-size: 0.6em;
  opacity: 0.5;
  margin-left: 0.15em;
  vertical-align: super;
}
```

---

## 3. Hover previews (popups)

Gwern's popup system is the site's signature UX feature. Hovering any annotated link spawns a rich preview containing the target page's title, author, date, tags, abstract, and images.

### How Gwern does it

The system has three layers: an annotation database, a popup framework, and an extract content resolver.

**Annotation database.** At compile time (Hakyll), every link is looked up in a hashmap of `(URL, {title, author, date, DOI, tags, abstract, ...})`. Annotations come from multiple sources: hand-written, auto-extracted from ArXiv/BioRxiv/Crossref/PubMed, or scraped from Wikipedia. When a match exists, the annotation metadata is inlined into the page HTML as data on or near the link element.

For links without annotation metadata, the system falls back to fetching `SHA1(URL)` from a server folder where pre-captured screenshots of archived pages are stored.

**Popup framework (`popups.js` by Said Achmiz, MIT license).** This is the desktop popup renderer:

- DOM structure: `div.popup.popframe` > `div.popframe-scroll-view` > `div.popframe-content-view` > shadow DOM root with `div.popframe-body.shadow-body`. The shadow DOM isolates popup content styles from the page.
- Spawn trigger: `mouseenter` with a `750ms` delay. If the cursor leaves before the delay, no popup.
- Positioning algorithm: tries to place the popup to the right of the link first (`targetRect.right + breathingRoom + popupWidth <= viewportWidth`), then left, then below, then above. Breathing room is 12px horizontal, 8px vertical.
- Fade-out: 100ms delay then 250ms CSS opacity transition.
- Shadow DOM: popup content is injected into a shadow root with `all: initial` reset, preventing style conflicts between popup content and the host page.

**Popup controls (title bar):**

| Control | Behavior |
| ------- | -------- |
| Close (X) | Remove popup. Alt+click closes all popups. |
| Pin | Convert from hover-ephemeral to persistent. Pinned popups survive mouse movement. `position: fixed`. |
| Zoom (4-way arrow) | Cycle through 9 positions: four corners, four edges, full-screen. Submenu for direct selection. |
| Minimize | Collapse popup to an icon in a bar at screen bottom. |
| Drag (title bar) | Reposition popup freely. |
| Resize (edges) | Click-drag popup edges to resize. |

**Z-index management:** `updatePopupsZOrder()` assigns sequential z-indexes to all spawned popups. The focused popup always gets the highest value. Minimized popups are sorted separately.

**Content resolver (`extracts.js`).** This layer decides what content to show for a given link type. It maintains a `targetTypeDefinitions` array where each entry has a predicate function (does this link match?) and a fill function (what content to inject). Content types include: page annotations, section transclusions, code previews (syntax-highlighted), PDF page renders, YouTube embeds, footnotes/sidenotes, and locally-mirrored web pages.

Content preparation involves style injection from the host document, dynamic layout activation via `startDynamicLayoutInContainer()`, and transclude triggers for embedded content.

**Mobile behavior (`popins.js`).** On mobile/narrow viewports, Gwern uses "popins" instead of popups — full-width panels that slide in from the bottom, stacking vertically. The popin system maintains a LIFO stack; the Escape key removes the top popin. Popins don't use hover (touch targets trigger on tap). The same `extracts.js` content resolver feeds both popups and popins.

### Current implementation

The popup system implements the full Gwern-style feature set: rich content previews with complete window management.

**Content & fetching:**
- **Rich HTML content**: fetches actual page HTML via `fetch()`, parses with `DOMParser`, extracts `.prose` content
- **Three content types**: page (full prose, scrollable), section (`#hash` targeting — heading + siblings), footnote (sidenote content)
- **750ms spawn delay** with 50ms prefetch: hover starts a background fetch immediately, popup spawns at 750ms
- **Loading state**: a spinner popup appears immediately at 750ms; body is swapped when content arrives
- **Metadata fallback**: if HTML fetch fails, falls back to `popup-index.json` (title + description)
- **Footnote suppression**: if a sidenote is visible on screen (wide mode), no footnote popup spawns
- **Scrollable body**: popup body uses CSS `max-height: 300px` + `overflow-y: auto`; no content truncation at extraction time. Resized/tiled popups remove max-height for full content access
- **HTML sanitization**: extracted content has `on*` event handler attributes stripped

**Window management (4-button titlebar):**
- **Pin** (`⊙`): toggle between ephemeral and pinned. Pinned popups survive mouse movement and are not auto-despawned when siblings spawn
- **Minimize** (`−`): collapse to a taskbar strip. Taskbar switches between vertical (right edge, landscape) and horizontal (bottom, portrait) layouts dynamically on resize
- **Zoom/tile** (`⛶`): cycle through 5 tile positions (center, left, right, top, bottom). Keyboard tiling via Alt+Q/W/E/A/S/D/Z/X/C maps to all 9 positions
- **Close** (`×`): remove popup. Alt+click closes all popups and destroys taskbar
- **Drag**: pointer-capture drag on titlebar with rAF smoothing. 3px threshold distinguishes click from drag. Auto-pins on first real drag
- **Resize**: 8-direction edge/corner resize. Edge detection uses `min(20px, diagonal/3)`. Auto-pins on resize

**Stack & z-order:**
- **Unlimited nesting**: no depth cap. Links inside popups spawn nested popups positioned to the side
- **Cycle prevention**: before spawning, checks if the target href exists in the ancestor chain
- **Z-order management**: sequential z-index assignment from `baseZIndex` (200); focused popup gets the top slot
- **Focus tracking**: click-to-front on any popup; mouseenter also focuses
- **Ephemeral cleanup**: when a new popup spawns, non-ancestor ephemeral popups are despawned; pinned popups survive

**Interaction refinements:**
- **Scroll suppression**: popup spawning is suppressed while scrolling; re-enabled on next mousemove
- **Spawn guard**: prevents duplicate concurrent spawns for the same href (race condition prevention)
- **Descendant-aware fade**: mouseleave only skips fade when moving to a child/descendant popup, not parent or sibling

**Mobile popins**: below 1024px breakpoint, click-triggered bottom sheet modals instead of hover popups (unchanged from Gwern's approach)

**No Shadow DOM**: popup content styled via `.popup-body` class scoping, sharing the site's design tokens

**What we skip:**
- External link popups (deferred to a future build-time metadata pipeline)
- PDF preview, page archiving

---

## 4. Chain previews (recursive popups)

Hovering a link inside a popup spawns another popup, creating a chain. This is Gwern's most distinctive interaction pattern.

### How Gwern does it

Popups are fully recursive. "A popup is a fully functional page, and can do anything a regular page can." Each popup contains rendered HTML with active links. Hovering those links triggers the same popup logic.

Technical details:

- Each popup maintains a `popupStack` array tracking its ancestor chain. This prevents infinite recursion (you can't re-open a popup that's already in your ancestor chain).
- Nested popups prefer side-positioning (`offToTheSide = true` when spawned from within another popup) — they tile horizontally rather than stacking vertically. This creates the characteristic left-to-right reading flow.
- When a new popup spawns, all non-pinned popups outside its ancestor stack are automatically despawned. This keeps the screen manageable — you're always looking at one "thread" of popups.
- Z-index increases with each level; `bringPopupToFront()` re-sorts on focus.
- There is no hard depth limit. The system can theoretically chain indefinitely. In practice, viewport width limits how many side-by-side popups fit.

The notification system (`GW.notificationCenter.fireEvent()`) coordinates lifecycle events across the popup tree: `popinDidInject`, `popinWillDespawn`, etc. This decouples the popup framework from the content resolver.

### Current implementation

Chain previews are fully recursive with no depth cap:

- Links inside popups spawn nested popups via `document`-level event delegation (popups live outside `<article>`)
- Nested popups prefer side placement (right, left) over vertical (below, above) to create Gwern's characteristic horizontal reading flow
- When a new popup spawns, non-ancestor **ephemeral** popups are despawned automatically. Pinned popups survive, allowing multiple "threads" to coexist
- Cycle prevention: before spawning, the system walks the ancestor chain checking for matching hrefs. If the target is already an ancestor, spawning is blocked
- Stack management: `PopupInstance[]` with parent-child tracking, ancestor chain walks, descendant collection, bulk cleanup
- Fade is descendant-aware: leaving a popup to its parent correctly fades the child; leaving to a child popup does not

---

## 5. Technical implementation

### Architecture

The popup system is a modular TypeScript package at `src/scripts/popups/` (11 modules):

```
src/scripts/popups/
  types.ts       — interfaces (PopupInstance, PopupState, TilePosition, ResizeEdge, Rect), config constants
  cache.ts       — HTML fetch, DOMParser, in-memory cache with dedup
  extract.ts     — content extraction (page, section, footnote) + target classification + HTML sanitization
  position.ts    — viewport-aware positioning engine + 9-tile coordinate calculator
  render.ts      — popup/popin DOM creation, 4-button titlebar, loading popup, CSS class helpers
  stack.ts       — nested popup stack, z-order management, pin/focus tracking, cycle detection, onRemove callback
  events.ts      — event delegation, hover timing, scroll suppression, keyboard tiling, spawn guard
  drag.ts        — pointer-capture drag on titlebar with rAF smoothing
  resize.ts      — 8-direction edge/corner resize with dynamic edge detection
  taskbar.ts     — minimize strip with dynamic vertical/horizontal layout
  index.ts       — orchestrator, Astro lifecycle integration, listener registration
```

### Data flow

```
Runtime:
  Mouse hover on internal link (suppressed while scrolling)
    → classifyTarget() determines content type (page/section/footnote)
    → wouldCycle() checks ancestor chain for duplicate hrefs
    → prefetch() fires at 50ms (background fetch + DOMParser cache)
    → spawnPopup() fires at 750ms (guarded against duplicate spawns):
        → createLoadingPopup() shows spinner immediately
        → pushPopup() manages stack (despawns non-ancestor ephemeral popups)
        → wirePopupInteractions() binds titlebar buttons, drag, resize, fade
        → fetchAndCache() returns parsed Document (async)
        → extractContent() pulls .prose, section, or sidenote content (sanitized)
        → upgradeLoadingPopup() swaps spinner body for real content
        → calculatePosition() repositions with actual dimensions
    → On mouseleave: skip if pinned or moving to descendant popup
        → 100ms delay → 250ms fade → onRemove callback (teardown drag/resize/taskbar) → DOM removal

  Fallback path:
    → fetch fails → loadPopupIndex() → /popup-index.json → title + description popup

  Window management:
    → Pin: toggle ephemeral↔pinned, survive mouse leave and sibling spawns
    → Zoom: cycle tile positions, apply getTileRect() coordinates
    → Minimize: save rect → hide → add taskbar item; restore reverses
    → Drag: pointerdown on titlebar → setPointerCapture → rAF position updates
    → Resize: edge detection → pointerdown near edge → rAF dimension updates
    → Focus: click/mouseenter → focusPopup() → updateZOrder()
    → Alt+close: clearAll() + destroyTaskbar()
    → Keyboard: Alt+Q/W/E/A/S/D/Z/X/C → tilePopup() on focused popup
```

### CSS

Popup styles live in `src/styles/popups.css`, imported via `global.css`. Uses the site's design tokens throughout. Key sections:

- `.popup` — fixed positioning, border, shadow, opacity transitions
- `.popup-titlebar` — flex row with link title + 4 control buttons, `cursor: grab`
- `.popup-controls` / `.popup-btn` — 18×18 icon buttons for pin/minimize/zoom/close
- `.popup-body` — scrollable content (`max-height: 300px`, `overflow-y: auto`) with scaled-down prose styling
- `.popup[data-content-type="footnote"]` — narrower (280px), shorter
- `.popup.popup-pinned` — accent border, highlighted pin button
- `.popup.popup-tiled` — smooth transition for position/size, removes body max-height
- `.popup.popup-focused` — elevated shadow
- `.popup.popup-dragging` — `transition: none`, `cursor: grabbing`, `user-select: none`
- `.popup.popup-resizing` — `transition: none`, `user-select: none`
- `.popup.popup-resize-{n,s,e,w,ne,nw,se,sw}` — resize cursor classes
- `.popup-loading` / `.popup-spinner` — centered spinner with `@keyframes popup-spin`
- `.popup-taskbar` — fixed strip with vertical (right edge) and horizontal (bottom) variants
- `.popup-taskbar-item` — 28×28 labeled buttons for minimized popups
- `.popin-overlay` / `.popin` — mobile bottom sheet with slide-up animation

### Future work

- **External link popups**: build-time metadata pipeline (OpenGraph fetch → JSON manifest)
- **Link icons**: rehype plugin for `data-link-icon` attributes + CSS `::after` rendering

## Key files

- `src/scripts/popups/` — modular popup system (11 TypeScript modules)
- `src/styles/popups.css` — popup and popin styles
- `src/pages/popup-index.json.ts` — fallback metadata (title, description, maturity)
- `src/layouts/page/Page.astro` — imports popup orchestrator

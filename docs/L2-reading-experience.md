---
scope: L2
summary: "Reading experience mechanics: TOC scroll-spy, sidenote alignment, link previews, and their interplay in the three-column layout"
modified: 2026-06-25
reviewed: 2026-06-25
depends:
  - path: docs/L1-design-vision
  - path: docs/L1-styles
    section: "Colors"
dependents:
  - path: docs/L3-footnotes-layout
  - path: docs/L3-link-system
  - path: docs/L2-information-density
---

# Reading Experience

This spec defines the three interactive reading systems -- table of contents, sidenotes, and link previews -- and how they coexist within the three-column layout described in L1-design-vision.

## Layout context

The page uses a three-zone structure:

| Zone | Width | Contents |
| ---- | ----- | -------- |
| Left margin | ~200px | Collapsible TOC ("CONTENTS") |
| Center column | 65ch measure on a lifted "paper" surface | Prose, headings, inline elements |
| Right margin | ~250px | Sidenotes and link preview popups |

The left and right margins collapse below the `1024px` breakpoint. The center column is a lifted "paper" surface (`--color-paper`) padded by `--reading-pad`; the grid track is widened by `2 × --reading-pad` so the prose measure stays at `--width-content` (65ch). The gap from the text to either margin is equal (`--margin-gap`, 5rem), measured from the prose edge, so the eye stays in the column. See `L1-styles` "Reading surface and gutters". Prose enables `text-wrap: pretty`, heading balance, automatic hyphenation, and `overflow-wrap: break-word` for graceful line breaks. At 900px and wider, prose paragraphs and list items use justified alignment, matching the Gwern-style dense reading measure while hyphenation prevents large word gaps. Everything described below assumes wide viewport unless the mobile fallback section says otherwise.

---

## Table of Contents

The TOC lives in the left margin as a sticky `<nav>`. It lists `h2` and `h3` headings extracted at build time.

### Sticky behavior

The TOC is `position: sticky` with `top: var(--header-height, 3rem)`. It stays pinned below the header and scrolls with the page. If the TOC is taller than the viewport minus the header, the TOC itself becomes internally scrollable (`overflow-y: auto; max-height: calc(100vh - var(--header-height) - 2rem)`). The scrollbar is hidden by default and appears only when the TOC is hovered or focused within.

### Nesting depth

- `h2` entries are flush left within the TOC container.
- `h3` entries are indented `1rem` from the left edge, using `padding-left` keyed off the `data-depth` attribute.
- Only `h2` and `h3` are shown. Deeper headings are excluded -- they add noise without aiding navigation.

### Active state (scroll spy)

A single heading is marked active at any time -- the heading whose section the reader is currently inside.

**Detection algorithm.** An `IntersectionObserver` watches all heading elements within `.prose`. The active heading is the last heading whose top edge has crossed above the viewport's upper quarter (`rootMargin: '-25% 0px -75% 0px'`). This means a heading becomes active once the reader has scrolled roughly a quarter of the viewport past it, which aligns with natural reading position.

When no heading has been crossed (the reader is above the first section), no TOC entry is active. When the reader is below the last heading, that heading stays active.

**Visual treatment.** The active TOC entry receives three simultaneous signals:

1. **Left border.** A 2px solid line in the page's accent color (`var(--color-accent)`) appears on the left edge of the entry, using `border-left`. Inactive entries have a 2px transparent border to prevent layout shift.
2. **Text weight shift.** The active entry uses `font-weight: 600` (semi-bold). Inactive entries use `font-weight: 400`. To prevent layout shift from weight changes, the TOC uses a monospace font (consistent with L1-design-vision's rule that navigation chrome uses monospace) where glyph widths are uniform across weights.
3. **Opacity.** The active entry is `opacity: 1`. Inactive entries are `opacity: 0.5`. This creates a dimming effect that draws the eye to the active section without hiding the surrounding structure.

The transition between states uses `transition: opacity 150ms ease, border-color 150ms ease, font-weight 0ms`. Font weight changes are instant (no transition) to avoid rendering artifacts.

**Click behavior.** Clicking a TOC entry scrolls the corresponding heading into view with `scroll-behavior: smooth` and `scroll-margin-top` equal to the header height plus `1rem` of breathing room.

### Collapse toggle

The TOC header ("CONTENTS") carries an eye/eye-off toggle that hides its body; state persists per panel in `localStorage`. Because the TOC is `width: fit-content` and right-anchored in the gutter, the collapse script freezes the panel's resolved width before hiding the items, so the header does not shift sideways. See `L1-design-vision` "Three-zone structure".

### Mobile fallback

Below `1024px`, the TOC is hidden entirely. The header's reading progress indicator (described in L1-design-vision) serves as the only scroll position feedback on narrow viewports. The TOC is not placed in a hamburger menu or collapsible drawer -- it adds too little value on small screens to justify the interaction cost.

### TOC enrichments

The TOC goes beyond a flat list of headings. Three enrichments were accepted based on a value/complexity evaluation (ranked best-first):

| Rank | Feature | Value | Complexity | Rationale |
| ---- | ------- | ----- | ---------- | --------- |
| 1 | Section read time | High | Low | Build-time computation, 2-3 characters per entry, universally understood |
| 2 | Nested depth lines | Medium | Low | Pure CSS, no runtime cost, immediate visual clarity gain |
| 3 | Section read state | Medium | Medium | Piggybacks on existing observer, but needs careful visual interaction with active state |

The guiding principle: **the TOC should help you decide what to read, not just show you what exists.** Every addition must pass the 180px-width scannability test: if you have to squint or parse complex visuals, it fails.

#### Section read time

Read time is the single highest-value enrichment. It answers "how long is this section?" and lets readers budget their attention.

**Data source.** Computed at build time by the TOC extraction logic. For each heading, count words in the section (from this heading to the next heading of equal or higher level). Divide by 238 words per minute (average adult reading speed for technical content, slightly below the commonly cited 250 to account for code blocks and density). Round to nearest minute, minimum "< 1".

**Display format.** The read time appears on the same line as the heading text, right-aligned, in a lighter color. Format: `2m`, `< 1m`, `12m`. No "min" or "minutes" -- the `m` suffix is universally understood and saves horizontal space. For sections under 1 minute: display `< 1m`. For sections of 1 minute or more: display the rounded number followed by `m`.

**Typography:**

- Font: `var(--font-mono)` (Commit Mono), consistent with the TOC's monospace treatment
- Size: `var(--text-2xs)` (0.75rem / 12px) -- one step smaller than the heading text
- Color: `var(--color-text-subtle)` (`#8A857C` light / `#7A756C` dark) -- the quietest text tier
- Weight: `400` (regular) -- never bold, even when the heading is active
- The read time does not change opacity or weight when the entry becomes active. It remains a static, quiet annotation.

**Layout.** Each TOC entry becomes a flex row:

```
[heading text]                    [read time]
```

- Container: `display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;`
- Heading text: `flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
- Read time: `flex-shrink: 0;`

The heading text truncates with ellipsis if it cannot fit alongside the read time.

**Interaction with active state.** When a TOC entry becomes active (scroll-spy), the heading text receives the full active treatment (left border, semi-bold, full opacity). The read time remains unchanged -- same color, same weight, same opacity.

#### Nested depth lines

A thin vertical line connects the left edge of h3 entries to their parent h2, creating a clear visual tree. The line replaces the current indentation-only treatment with a stronger structural cue.

**Geometry:**

- The line is a `::before` pseudo-element on h3 entries, or more precisely, a continuous border on a grouping element.
- Each h2 and its subsequent h3 children are wrapped in a group. The group's left edge has a `1px solid var(--color-border-subtle)` line that runs from the first h3 to the last h3 in that group.
- h3 entries are indented `1rem` from the left, as currently specified.
- The vertical line is positioned at `0.375rem` from the left edge of the TOC entry area.

**Line styling:**

- Width: `1px`
- Color: `var(--color-border-subtle)` (`#D5D0C7` light / `#33302D` dark)
- Continuous, not dashed. Dashed lines at 1px width become visually noisy.
- The line does not touch the h2 entry itself -- it starts at the top of the first h3 and ends at the bottom of the last h3 in the group.

**Interaction with active state.** When an h3 entry is active, the left border of the active entry (the 2px accent-colored line from scroll-spy) replaces the connector line for that entry's vertical extent. When the parent h2 is active, the connector line for its children remains visible but at its normal subtle color.

#### Section read state

Tracking which sections the reader has scrolled through and marking them as "visited" creates a sense of progress and helps readers resume interrupted reading.

**State model.** Each TOC entry has three mutually exclusive visual states:

| State | Meaning | How entered |
| ----- | ------- | ----------- |
| **Unread** | Reader has not scrolled through this section | Initial state for all entries |
| **Active** | Reader is currently in this section | Scroll-spy detection (existing) |
| **Read** | Reader has scrolled past this section | When entry transitions from active to inactive after 2s cumulative active time |

Once a section has been active for at least 2 seconds cumulative, it is marked as read when it loses active status. The 2-second threshold prevents drive-by scrolling from marking sections as read. This state is sticky -- once read, always read (within the session).

**Visual treatment:**

| State | Opacity | Weight | Left border | Read time color |
| ----- | ------- | ------ | ----------- | --------------- |
| Unread | `0.5` | `400` | `2px transparent` | `var(--color-text-subtle)` |
| Active | `1.0` | `600` | `2px var(--color-accent)` | `var(--color-text-subtle)` |
| Read | `0.35` | `400` | `2px transparent` | `var(--color-text-subtle)` at `0.35` opacity |

Read sections fade into the background, making unread sections stand out as "what is left to read." The effect is subtle -- `0.35` vs `0.5` opacity.

**Data attribute:**

```html
<a class="toc-entry" data-state="unread" data-depth="2" href="#section-id">
  <span class="toc-text">Section Title</span>
  <span class="toc-time">3m</span>
</a>
```

`data-state` takes values `unread`, `active`, or `read`. CSS targets these:

```css
.toc-entry[data-state="unread"] { opacity: 0.5; }
.toc-entry[data-state="active"] { opacity: 1; font-weight: 600; border-left-color: var(--color-accent); }
.toc-entry[data-state="read"]   { opacity: 0.35; }
```

**Timer implementation.** The scroll-spy observer already identifies the active heading. The read-state logic wraps this:

1. When a heading becomes active, start a timer (2000ms).
2. If the heading is still active when the timer fires, set `readSections.add(headingId)`.
3. When a heading loses active status, if it is in `readSections`, set `data-state="read"`. Otherwise, set `data-state="unread"`.

The `readSections` set persists for the page session (in-memory, not localStorage). Navigating away clears it.

**Transition.** State changes use `transition: opacity 150ms ease`. The transition from active to read creates a gentle fade.

#### Entry anatomy (combined)

With all three enrichments applied, a single TOC entry looks like:

```
 | Background           3m
 |   Gwern influence    < 1m
 |   Prior art          2m
   Implementation       5m
   Results              4m      <-- active: bold, full opacity, accent border
   Discussion           7m
   Conclusion           1m      <-- read: dimmed
```

- "Background" is an h2 with three h3 children connected by a vertical line.
- "Implementation" through "Conclusion" are h2 entries at flush left.
- "Results" is the active entry (semi-bold, full opacity, accent left border).
- "Conclusion" has been read (dimmer than the unread entries above "Results").
- Read times are right-aligned in subtle monospace.

#### Considered and rejected TOC enrichments

- **Section-level prerequisites**: Wrong abstraction level. Prerequisite chains belong to page-level relations, not per-section TOC annotations.
- **Collapsed sections indicator**: Edge case, not a pattern. `<details>` blocks are infrequent and a TOC icon for "this section has something expandable" is too vague to be actionable.
- **TOC as minimap**: Incompatible with the 180px constraint and the scrapbook aesthetic. A proportional minimap becomes an unreadable smear. The header reading progress indicator already serves the "where am I" question.
- **Section type indicators** (deferred): Interesting but requires content infrastructure that does not exist yet. Revisit if the site gains a section-level metadata system.

---

## Sidenotes

Sidenotes appear in the right margin, vertically aligned with their reference marks in the prose. They are the primary annotation mechanism, replacing traditional bottom-of-page footnotes.

### Vertical sync algorithm

The goal: sidenote N appears at the same vertical position as its `<sup>` reference in the prose. When two sidenotes would overlap, the lower one is pushed down just enough to clear the upper one.

**Positioning pass** (runs in `layoutSidenotes()`):

```
const SIDENOTE_GAP = 8  // px between stacked sidenotes
let prevBottom = 0

for each sidenote in DOM order:
    ref = document.getElementById(`fnref-${sidenote.dataset.footnoteId}`)
    desiredTop = ref ? ref.offsetTop : prevBottom
    actualTop = max(desiredTop, prevBottom)
    sidenote.style.top = actualTop + "px"
    prevBottom = actualTop + sidenote.offsetHeight + SIDENOTE_GAP
```

The right margin holds sidenotes only — metadata is inline in the reading column, not a margin panel (see `L2-info-architecture`), so no band-reservation is needed.

Sidenotes use `position: absolute` within the `.prose` container (which is `position: relative`). They are offset into the right margin via `left: calc(100% + var(--margin-gap))`.

**When to run.** The positioning pass runs on:
- Initial page load (`DOMContentLoaded` and `astro:page-load`)
- Window resize (debounced at 100ms), but only when still in wide mode
- After any content expansion that changes prose height (accordion open, details toggle)

### Collision resolution

When multiple footnotes cluster in the prose (e.g., three references within the same paragraph), sidenotes stack vertically with `SIDENOTE_GAP` (8px) between them. The first sidenote lands at its reference position; subsequent ones are pushed below the previous sidenote's bottom edge.

**Visual drift indicator.** When a sidenote has been pushed more than `4rem` below its reference mark, a thin connecting line is drawn between the reference and the sidenote. This is implemented as a `::before` pseudo-element on the sidenote: a 1px line in `var(--color-border)` extending from the sidenote's top edge upward toward the reference. The line uses `position: absolute; width: 1px; background: var(--color-border)`. Its height is calculated as `actualTop - desiredTop` and set via a CSS custom property (`--drift-px`) applied by the layout engine. The line only renders when `--drift-px` exceeds `64` (4rem at 16px base).

This addresses the known edge case from L3-footnotes-layout: "a page with many tightly-packed footnotes will have visible vertical drift between references and their sidenotes."

**Prose padding compensation.** If the last sidenote's bottom edge exceeds the prose container's scroll height, the engine adds `paddingBottom` to `.prose` so the container grows to accommodate the overflow. When it does not overflow, any previously added padding is cleared.

### Sidenote appearance

Each sidenote is styled as follows:

- **Width.** Fixed at `var(--sidenote-width, 220px)`. The right margin zone accommodates this plus `--margin-gap` (5rem) of gutter from the prose edge, matching the left TOC gutter.
- **Typography.** Serif body font at `0.8rem` (smaller than body text), with `line-height: 1.4`. This creates a clear hierarchy: sidenotes are subordinate to the main prose.
- **Number label.** The sidenote's number (rendered via CSS counter `sidenote-counter`) appears as the first inline element, in semi-bold weight, matching the superscript reference in the prose.
- **Background.** None. Sidenotes sit directly on the page background with no card, border, or shadow. They are part of the page surface, not floating above it. This follows L1-design-vision's principle of "texture over color" -- the typographic scale difference is sufficient to distinguish sidenotes from prose.
- **Highlight on click.** When the reader clicks a footnote reference number, the corresponding sidenote receives a `sidenote-highlight` class that applies `background-color: var(--color-highlight)` with a `1.5s` fade-out transition. This provides a brief flash to draw the eye.

### Mobile fallback (narrow viewports)

Below `1024px`, sidenotes are hidden via `display: none`. Their content is cloned into an ordered list in the `#footnotes` section at the bottom of the page. Each list item receives the sidenote's content and a back-link to the reference.

The footnotes section header reads "Footnotes" and uses the same `aside-panel` styling as other bottom-of-page sections. It only appears when footnotes exist (`data-empty` toggled by JS).

In narrow mode, clicking a footnote reference number performs standard anchor navigation to `#fn-{id}` in the footer list.

---

## Link previews

Internal links show rich hover preview popups with the linked page's actual content. This supports L1-design-vision's goal of progressive disclosure -- the reader can peek at linked content without navigating away. The popup system implements full Gwern-style window management. See L3-link-system for the complete implementation spec.

### Trigger behavior

- **Trigger.** `mouseover` on any internal link within `<article>` (or within an existing popup). The preview appears after a `750ms` delay. A background prefetch starts at `50ms`. If the cursor leaves the link before 750ms, no preview appears.
- **Scroll suppression.** Popup spawning is suppressed while scrolling; re-enabled on the next `mousemove` event.
- **Dismissal.** On `mouseleave`, ephemeral popups fade after a `100ms` grace period then `250ms` CSS opacity transition. Pinned popups do not auto-dismiss. Pressing `Escape` dismisses the topmost popup.
- **Touch devices.** No hover previews on touch. Below `1024px`, internal links show mobile popins (bottom sheet modals) on click instead.

### Content

The preview popup fetches and renders the actual page HTML:

1. **Loading state.** A spinner popup appears immediately at 750ms; body is replaced when content arrives.
2. **Page content.** The target page's `.prose` content, scrollable within a 300px max-height body. Full content is preserved (no truncation) -- users can scroll, or resize/tile the popup for full access.
3. **Section targeting.** Links with `#hash` extract the specific heading and its siblings until the next heading of equal or higher level.
4. **Footnotes.** Footnote reference links extract sidenote content; suppressed when the sidenote is already visible on screen.
5. **Fallback.** If HTML fetch fails, falls back to `popup-index.json` metadata (title + description).

### Window management

Each popup has a 4-button titlebar: pin (persist), minimize (to taskbar), zoom (cycle tile positions), close (Alt: close all). Popups can be freely dragged by their titlebar and resized from any edge or corner. Keyboard tiling via Alt+Q/W/E/A/S/D/Z/X/C maps to 9 viewport positions. See L3-link-system section 3 for full details.

### Appearance

- **Container.** A rectangular popup with `1px solid var(--color-border)`, `border-radius: var(--radius-md)`, and `box-shadow: 0 4px 16px rgba(0,0,0,0.1)`. Background is `var(--color-bg)`.
- **Max width.** `400px` (280px for footnotes). Resized/tiled popups remove width constraints.
- **No arrow or caret.** Clean rectangle. Arrows add visual noise and complicate positioning.

### Positioning

Viewport-aware cascade with priority based on context:

- **Root popups**: below → above → right → left
- **Nested popups**: right → left → below → above (creates Gwern's horizontal reading flow)
- **Viewport clamping**: 12px margin from all viewport edges
- **Tiled popups**: positioned by `getTileRect()` coordinates, overriding normal placement

Popups are appended directly to `document.body` with `position: fixed`.

### Nesting

Unlimited depth with cycle prevention. Each popup can spawn child popups from its internal links. Non-ancestor ephemeral popups are auto-despawned; pinned popups coexist. Z-order is managed dynamically (base 200, focused popup on top).

---

## Three-column interaction rules

The three systems -- TOC, sidenotes, and link previews -- share the page's horizontal space. These rules prevent conflicts:

### Spatial allocation

| Zone | Primary occupant | Secondary occupant |
| ---- | ---------------- | ------------------ |
| Left margin | TOC | None |
| Center column | Prose | Link preview popups (when margin is occupied) |
| Right margin | Sidenotes | Link preview popups (when no sidenote conflict) |

The left margin is exclusively for the TOC. Nothing else is placed there.

The right margin holds the metadata panel at its top and sidenotes aligned to their references; sidenotes reserve the panel's band and stack below it. Link previews may use the right margin only when no sidenote occupies the same vertical band (within a tolerance of `2rem` above and below the popup's intended bounds).

### Z-index layering

| Element | z-index |
| ------- | ------- |
| Prose content | auto (0) |
| Sidenotes | 1 |
| TOC | 1 |
| Header | 100 |
| Popup taskbar | 199 |
| Popups | 200+ (dynamic, sequential assignment; focused popup gets top slot) |
| Mobile popin overlay | 300 |

Popup z-indices are managed dynamically by `updateZOrder()` — sequential assignment from base 200, with the focused popup receiving `base + count`. This replaces static depth-based z-index rules.

### Scroll coordination

- Scrolling the page updates the TOC active state via the intersection observer.
- Scrolling does NOT reposition sidenotes. Sidenotes are absolutely positioned within `.prose` and scroll with it naturally.
- Scrolling suppresses new popup spawning (sets `isScrolling = true`). Existing popups are not dismissed. The next `mousemove` re-enables spawning. Pinned/tiled popups are never affected by scroll.

### Performance constraints

- The TOC intersection observer is passive and does not cause layout thrashing.
- Sidenote positioning reads `offsetTop` and `offsetHeight`, which trigger layout. This runs once on load and on debounced resize only -- never during scroll.
- Link preview popup positioning reads `getBoundingClientRect()` once when the popup is triggered. No continuous measurement.
- All transitions are CSS-only (opacity, transform, background-color). No JS animation loops.

---

## Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| toc-sticky | MUST | TOC remains visible during scroll on viewports wider than 1024px |
| toc-active-single | MUST | Exactly zero or one TOC entry is marked active at any time |
| toc-active-visual | MUST | Active TOC entry has left border, semi-bold weight, and full opacity |
| toc-no-shift | SHOULD | TOC active state change causes no layout shift in the TOC itself |
| toc-hidden-narrow | MUST | TOC is hidden below 1024px |
| toc-readtime-present | MUST | Every TOC entry displays a read time annotation |
| toc-readtime-format | MUST | Read times use the format `Nm` or `< 1m`, never "minutes" or decimals |
| toc-readtime-stable | MUST | Read time does not change opacity or weight when the entry becomes active |
| toc-readtime-truncate | SHOULD | Heading text truncates with ellipsis before the read time is hidden |
| toc-depth-line | MUST | h3 entries under a shared h2 parent are connected by a vertical line |
| toc-depth-line-color | MUST | The connector line uses `var(--color-border-subtle)` |
| toc-depth-line-active | SHOULD | The active entry's accent border visually replaces the connector for that entry's extent |
| toc-readstate-three | MUST | Each TOC entry is in exactly one of three states: unread, active, or read |
| toc-readstate-threshold | MUST | A section is only marked read after being active for at least 2 cumulative seconds |
| toc-readstate-dim | MUST | Read entries have lower opacity (0.35) than unread entries (0.5) |
| toc-readstate-sticky | MUST | Once marked read, an entry stays read for the page session |
| toc-readstate-no-persist | MUST | Read state is not persisted to localStorage or any storage; it resets on navigation |
| toc-width-fit | MUST | All TOC content fits within the ~200px left margin without horizontal overflow |
| sidenote-sync | MUST | Each sidenote's top position equals its reference's offsetTop or the bottom of the previous sidenote, whichever is greater |
| toc-collapse-no-shift | SHOULD | Collapsing the TOC does not shift its header sideways (resolved width is frozen) |
| sidenote-gap | MUST | Stacked sidenotes have at least 8px gap between them |
| sidenote-no-overlap | MUST | No two sidenotes overlap vertically |
| sidenote-drift-line | SHOULD | Sidenotes pushed more than 4rem from their reference show a connecting line |
| sidenote-narrow-clone | MUST | Below 1024px, sidenote content appears in the footer footnotes list |
| preview-delay | MUST | Link preview appears only after 750ms hover, not before |
| preview-grace | MUST | Moving cursor from link to preview within 100ms keeps preview open |
| preview-no-clip | MUST | Link preview popup never extends outside the viewport |
| preview-suppress-scroll | MUST | Scrolling suppresses new popup spawning; existing popups are not dismissed |
| preview-no-touch | MUST | Link previews do not trigger on touch devices; mobile uses popins |
| preview-pin | MUST | Pinned popups survive mouse movement and sibling spawning |
| preview-cycle-prevent | MUST | Popup spawning is blocked if the href already exists in the ancestor chain |
| layout-z-order | MUST | Link preview renders above sidenotes when they overlap |
| layout-no-scroll-jank | SHOULD | Scroll handler performs no layout reads or writes |

## Key files

- `src/scripts/toc-scrollspy.ts` -- TOC active state via IntersectionObserver, read state timer logic
- `src/scripts/footnotes.ts` -- sidenote positioning engine, mode switching
- `src/scripts/popups/` -- modular popup system (11 modules): content fetching, window management, drag, resize, taskbar
- `src/components/TOC.astro` -- TOC markup, read time rendering, data attributes
- `src/components/content/Footnote.astro` -- per-footnote HTML pair (sup + sidenote span), imported by MDX pages
- `src/components/Footnotes.astro` -- narrow-mode footer container
- `src/layouts/page/Page.astro` -- three-column grid assembly, `#popup-container`
- `src/styles/components.css` -- sidenote CSS, TOC styling (entry states, connector lines, read time), popup styling

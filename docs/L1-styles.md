---
scope: L1
summary: "CSS architecture, design tokens, and style invariants"
modified: 2026-06-25
reviewed: 2026-06-25
depends:
  - path: docs/L0-ui
  - path: docs/L1-design-vision
dependents:
  - path: docs/L2-components
  - path: docs/L2-information-density
  - path: docs/L2-embedded-content
  - path: docs/L2-reading-experience
  - path: docs/L3-link-system
---

# Styles

## Tailwind v4 and the `@theme` block

The project uses Tailwind CSS v4, which replaces `tailwind.config.js` with a CSS-native `@theme` block. All custom design tokens live in `src/styles/global.css` inside this block. Tailwind generates utility classes from these tokens automatically, so `bg-bg-subtle` or `text-text-muted` work without extra configuration.

A separate `:root` block defines properties that are not Tailwind utilities: `--height-header`, `--color-overlay`, and `color-scheme`. Both light and dark themes are supported via a manual toggle; each theme is carefully designed (dark is not an inversion of light).

## CSS layer order

`global.css` imports Tailwind first, declares `@theme`, then imports three files in order:

| Layer | File | Purpose |
| ----- | ---- | ------- |
| `base` | `base.css` | Element defaults: typography, links, lists, tables, selection highlight |
| `components` | `components.css` | Layout grid, aside panels, popups, footnotes, callouts, TODO markers |
| `components` | `prose.css` | Heading anchor links, external link icons (also in `@layer components`) |

The layer cascade means component styles always override base styles. Both `components.css` and `prose.css` declare `@layer components`, so their specificity is equal and source order determines winners.

## Token catalog

### Colors

Cool-neutral base with intentional color coding. The palette is scholarly and restrained — anchored by neutral grey paper tones rather than warm beige, then enriched by a muted ink-blue accent and semantic colors that stay secondary to typography. Color signals meaning: content types, relation types, and maturity states each have subtle, consistent color associations.

#### Light theme (default)

**Base surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-bg` | `#F4F4F2` | Page background — neutral grey paper, no beige cast |
| `--color-bg-subtle` | `#ECECE8` | Table headers, callout backgrounds, relations block |
| `--color-bg-muted` | `#E2E2DC` | Code blocks, inline code |
| `--color-text` | `#1F1F1C` | Primary text, headings (near-black, neutral) |
| `--color-text-muted` | `#4E4E49` | Secondary text, blockquotes, sidebar content |
| `--color-text-subtle` | `#787871` | Tertiary text, metadata, TOC, footnote markers |

**Accent and interactive:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-accent` | `#3A4E68` | Primary accent — restrained ink-blue, cooler and drier than teal |
| `--color-accent-hover` | derived from `#3A4E68` | Accent hover/pressed state |
| `--color-accent-muted` | `#556B84` | Lighter accent for less prominent affordances |
| `--color-link` | `#3A4E68` | Link text (same as accent — links are the primary interactive element) |
| `--color-link-hover` | derived from `#3A4E68` | Link hover state |

**Borders and surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-border` | `#CFCFC7` | Borders, horizontal rules, blockquote accents |
| `--color-border-subtle` | `#DDDDD6` | Callout title separators, table row dividers |
| `--color-highlight` | `#E1E7EF` | Text selection (tinted toward accent) |
| `--color-highlight-subtle` | `#EAEEF3` | Sidenote highlight, TODO background |

**Status and maturity:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-status-draft` | `#B38A2D` | Draft/in-progress maturity indicator (warm amber) |
| `--color-status-stable` | `#4D7A4D` | Stable maturity indicator (muted green) |
| `--color-status-evergreen` | `#2B6B6B` | Evergreen maturity indicator (deep teal) |
| `--color-error` | `#8B3A3A` | Error/danger callouts (warm red) |

**Content type tints** (background tints for type-coded elements — see Color coding strategy below):

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-type-article` | `#EAEAE7` | Long-form articles — near-neutral paper tint |
| `--color-type-project` | `#E5E8E6` | Projects — cool grey-green hint |
| `--color-type-note` | `#EBEBE6` | Short notes/TIL — neutral warm-grey hint without yellowing |
| `--color-type-interactive` | `#E4E6EB` | Interactive pages — cool blue-grey hint |

**Relation type colors** (used in graph edges and relation labels):

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-rel-hierarchy` | `#5A6E78` | `up`/`down` — cool slate, structural |
| `--color-rel-sequence` | `#6B7A5A` | `next`/`prev` — muted olive, directional |
| `--color-rel-type` | `#7A5A6B` | `is`/`has` — muted mauve, categorical |
| `--color-rel-reference` | `#8A857C` | `ref`/`refi` — text-subtle, the default/lightest |

**Header (ambient status bar):**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-header-bg` | `#22211E` | Status bar background |
| `--color-header-text` | `#C7C1B7` | Status bar text |
| `--color-header-accent` | `#5AADA5` | Status bar site name, progress bar (bright teal) |

**Overlay:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-overlay` | `rgba(0,0,0,0.3)` | Modal overlays (`:root`, not `@theme`) |

#### Dark theme

Deep charcoal backgrounds (not pure black), warm light text. The accent shifts to a brighter ink-blue for adequate contrast. Content-type tints and relation colors are adjusted for dark backgrounds.

**Base surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-bg` | `#1A1918` | Page background — warm charcoal |
| `--color-bg-subtle` | `#242220` | Table headers, callout backgrounds, relations block |
| `--color-bg-muted` | `#2E2B28` | Code blocks, inline code |
| `--color-text` | `#E0DDD6` | Primary text (warm off-white) |
| `--color-text-muted` | `#A8A39A` | Secondary text, blockquotes, sidebar content |
| `--color-text-subtle` | `#7A756C` | Tertiary text, metadata, TOC, footnote markers |

**Accent and interactive:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-accent` | `#6F88A8` | Primary accent — brighter ink-blue for dark contrast |
| `--color-accent-hover` | `#7AC4BD` | Accent hover state |
| `--color-accent-muted` | `#5E7694` | Less prominent affordances |
| `--color-link` | `#6F88A8` | Link text |
| `--color-link-hover` | `#8FA3BC` | Link hover state |

**Borders and surfaces:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-border` | `#3D3A36` | Borders, rules |
| `--color-border-subtle` | `#33302D` | Subtle dividers |
| `--color-highlight` | `#263B38` | Text selection |
| `--color-highlight-subtle` | `#1F2E2C` | Sidenote highlight |

**Status and maturity:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-status-draft` | `#D4A843` | Draft/in-progress (brighter amber for dark bg) |
| `--color-status-stable` | `#6B9E6B` | Stable (brighter green) |
| `--color-status-evergreen` | `#4A9E9E` | Evergreen (brighter teal) |
| `--color-error` | `#C25A5A` | Error/danger (brighter red) |

**Content type tints:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-type-article` | `#242220` | Articles — neutral (same as bg-subtle) |
| `--color-type-project` | `#202625` | Projects — cool green hint |
| `--color-type-note` | `#252320` | Notes — warm hint |
| `--color-type-interactive` | `#202024` | Interactive — cool blue hint |

**Relation type colors:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-rel-hierarchy` | `#7A95A2` | `up`/`down` — lighter slate |
| `--color-rel-sequence` | `#8FA27A` | `next`/`prev` — lighter olive |
| `--color-rel-type` | `#A27A8F` | `is`/`has` — lighter mauve |
| `--color-rel-reference` | `#7A756C` | `ref`/`refi` — text-subtle |

**Header:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-header-bg` | `#141312` | Status bar background |
| `--color-header-text` | `#A8A39A` | Status bar text |
| `--color-header-accent` | `#6F88A8` | Status bar accent (same bright ink-blue) |

**Overlay:**

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-overlay` | `rgba(0,0,0,0.5)` | Modal overlays (stronger for dark theme) |

#### Color coding strategy

The earlier approach of "no color coding" produced a monotonous result. The revised strategy uses color as a **quiet signal** — never the primary differentiator, always paired with shape/icon/typography, but present enough to create subliminal wayfinding.

**Principles:**

1. **Color reinforces, never replaces.** Content types are still differentiated by icon and typography treatment. Color tints are a secondary layer that builds pattern recognition over time.
2. **Tints, not blocks.** Content-type color appears as a subtle background shift (3-5% hue variation from the base), not as colored badges or borders. The reader should feel the difference before consciously noticing it.
3. **Relations use color in the graph only.** In text (relation labels, breadcrumbs), relations are monochrome. In the SVG graph, edges are colored by relation type to make structure visually parseable at a glance. Stroke width is the secondary cue for structural weight; line texture is not used.
4. **Status colors are the loudest.** Maturity indicators (draft/stable/evergreen) use the most saturated colors on the site because they are the highest-value semantic signal — they tell the reader how much to trust what they are reading.
5. **Accent is functional, not decorative.** The ink-blue accent appears only on interactive elements (links, buttons, focus rings, footnote numbers). It never appears as background fill or decorative stripe.

**Where color appears:**

| Context | Color treatment |
| ------- | --------------- |
| Page background | Content-type tint on the main bg token (subtle) |
| Graph edges | `--color-rel-*` tokens, one hue per relation family |
| Graph nodes | `--color-type-*` tints as node fill |
| Maturity badges | `--color-status-*` as text color on the badge |
| Links and affordances | `--color-accent` for all interactive text |
| Highlights and selections | `--color-highlight` tinted toward accent |
| Error states | `--color-error` on text and border |

**Where color does NOT appear:**

| Context | Reason |
| ------- | ------ |
| Relation labels in text | Typography (weight, style) carries the semantic load |
| Content-type badges/icons | Icon shape is the differentiator; coloring them would be redundant and noisy |
| Borders and rules | Neutral borders maintain the structural grid; colored borders would fragment it |
| Headings | Headings are always `--color-text`; coloring them would fight the reading flow |

#### Color principles (summary)

- **Accent is muted ink-blue** (`#3A4E68` in the current light theme), not bright SaaS blue and not green-leaning teal — it keeps interactive elements crisp without pushing the site into product-marketing aesthetics.
- **Base is neutral grey-paper** (`#F4F4F2`), not beige — removing the yellow cast makes the typography feel drier, sharper, and closer to the intended reading references.
- **Content-type tints are barely there** — 3-5% hue shift from base, building subliminal pattern recognition.
- **Relation colors are distinct but muted** — slate, olive, mauve, and neutral form a natural four-way split that is parseable in the graph without being garish.
- **Dark theme is independently designed**, not an inversion — accent brightens, tints darken, status colors gain saturation.

### Font stacks

Typography is the primary source of patchwork texture: serif for prose, monospace for metadata/code/relations. Exactly two typefaces — no substitutes, no third font.

| Token | Value | Role |
| ----- | ----- | ---- |
| `--font-serif` | `'Source Serif 4', 'Georgia', serif` | Prose body, headings, article titles, backlinks, **page-link content** (relation values, breadcrumb path, TOC entries) |
| `--font-mono` | `'Commit Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace` | Metadata/relation **labels**, dates, read time, code, tags, status bar, navigation, TOC labels |

**Serif = page-link content, mono = chrome.** Links to pages read as serif (relation *values*, breadcrumb path, TOC entries); labels, dates, and factual chrome are mono. Relation *labels* (`PART OF`, `IS`) are mono; their *values* are serif. This single rule is what makes the inline metadata strip and the TOC read as one family — see `L1-design-vision` Typography.

**Single-mono-font rule.** Every monospace context — code blocks, metadata chrome, navigation, breadcrumbs, TOC labels, relation labels, table headers — uses `--font-mono` (Commit Mono). No secondary monospace font (IBM Plex Mono, JetBrains Mono, etc.) should appear anywhere. The two-font system (Source Serif 4 + Commit Mono) is the design; mixing in a third typeface fragments the visual identity.

**Serif rationale — Source Serif 4.** Adobe's Source Serif 4 is a restrained text face that reads dry, clear, and dependable on screen. It is less literary and less mannered than Literata, which fits the site's direction better: closer to a research notebook than a book-jacket aesthetic. It holds up well in dense reading columns, supports italics and weight variation cleanly, and does not make the site feel overly formal. Its familiarity is a strength here; the site already gets distinctiveness from the serif/mono contrast and information architecture.

**Monospace rationale — Commit Mono.** Designed by Eigil Nikolajsen specifically for code and technical content. It is neutral, controlled, and typographic rather than aggressively "developer branded." Compared to JetBrains Mono, it is quieter and less IDE-coded. Compared to IBM Plex Mono, it feels less corporate. This matters because the site's mono is not just for code; it is also the voice of metadata, relations, TOC chrome, breadcrumbs, and labels. Commit Mono keeps those elements legible without dominating the prose.

**Loading strategy:** Self-host both fonts. Source Serif 4 ships as variable webfonts and should be served locally in `woff2` form for normal and italic. Commit Mono should also be served locally. Use `font-display: swap` for both. The site should not depend on Google Fonts or third-party font CDNs for its core typography.

Sans-serif (`--font-sans`) is no longer a primary typeface. If needed for UI chrome, fall back to the serif or mono stack depending on context. The serif-to-mono contrast is a core design element, not incidental.

### Font sizes (non-heading)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-base` | 1rem (16px) | Body text, list items, blockquotes |
| `--text-sm` | 0.875rem (14px) | Pre blocks, callout titles, popups, secondary text |
| `--text-xs` | 0.8125rem (13px) | Metadata, TOC items, footnotes, sidenotes, header navigation |
| `--text-2xs` | 0.75rem (12px) | Panel titles, popup meta, TODO labels, TOC sub-items |
| `--text-3xs` | 0.6875rem (11px) | Breadcrumbs, table headers, TOC labels, time markers |

Heading sizes use raw `rem` values in `base.css`: h1 = 1.875rem (30px), h2 = 1.3125rem (21px), h3 = 1.125rem (18px), h4 = 1rem (16px). These are exempt from the token invariant (see below).

**Minimum font size: 11px (0.6875rem).** No text on the site may be smaller than `--text-3xs`. This floor exists because text below 11px is unreadable for many users, fails accessibility spirit, and renders inconsistently across displays. Every use of `--text-3xs` should be justified — it is reserved for tertiary chrome (nav links, breadcrumbs, uppercase labels) where the monospace letterforms and contextual cues aid legibility.

**Uppercase mono tracking.** Small uppercase mono labels should use restrained tracking, typically `0.04em` to `0.06em`. Earlier px-based tracking values made labels shouty once Commit Mono became the sole metadata voice.

**Whole-pixel sizes.** Font size tokens should resolve to whole pixel values at the default root size (16px) to avoid sub-pixel rendering inconsistencies across browsers and display densities.

### Line heights

| Token | Value | Usage |
| ----- | ----- | ---- |
| `--leading-none` | 1 | -- |
| `--leading-tight` | 1.2 | Headings |
| `--leading-snug` | 1.35 | -- |
| `--leading-normal` | 1.6 | Body text (`html`, `.prose`) |
| `--leading-relaxed` | 1.5 | -- |

### Layout widths

| Token | Value | Purpose |
| ----- | ----- | ------- |
| `--width-content` | 65ch | Prose measure. The center grid track is `min(100%, calc(var(--width-content) + 2 * var(--reading-pad)))` so the padded reading surface keeps the text at this measure |
| `--width-sidebar` | 12rem | Aside margin sidebar width |
| `--width-page` | 85rem | Overall page max-width |
| `--height-header` | 2.5rem | Sticky header height (`:root`, used for scroll-padding) |

### Reading surface and gutters

The reading column is a "paper" surface floating on the page "desk"; the TOC and metadata panels sit in the gutters as marginalia. See **Texture and grain** for the rationale.

| Token | Value (light / dark) | Purpose |
| ----- | ----- | ------- |
| `--color-paper` | `#FBFBF9` / `#1F1E1C` | Reading-column surface, a step off `--color-bg` (the desk) |
| `--paper-shadow` | layered soft / single soft | Lifts the column off the desk; light leans on the shadow because its tone gap is tiny |
| `--reading-pad` | 1.5rem | Inline padding of the reading column; the center grid track is widened by `2 × --reading-pad` so the prose measure stays at `--width-content` |
| `--margin-gap` | 5rem | Gap from the prose edge to the margin furniture (TOC left, metadata/sidenotes right). Derived once and applied to both sides so the eye does not drift to one margin while reading |
| `--page-sheen` | gradient | Viewport-fixed smooth page lighting |
| `--header-texture` | sheen + grain | Header strip material |

### Border radii

| Token | Value |
| ----- | ----- |
| `--radius-sm` | 2px |
| `--radius-md` | 3px |
| `--radius-lg` | 4px |
| `--radius-full` | 9999px |

### Transitions

| Token | Value |
| ----- | ----- |
| `--ease-out` | `ease-out` |
| `--transition-duration-fast` | 50ms |
| `--transition-duration-normal` | 100ms |
| `--transition-duration-medium` | 150ms |

## Interaction primitives

Interaction styling must support the editorial reading model defined in `L1-design-vision`. The rule is consistency through restraint: small surfaces, text-first controls, and minimal state chrome.

### Control hierarchy

Use the least assertive treatment that still communicates affordance:

| Primitive | Default treatment | Notes |
| --------- | ----------------- | ----- |
| Inline action | text link or text button | Preferred for most actions |
| Row action | full-width row with subtle background wash on hover | Preferred for nav and option lists |
| Compact control | small boxed control with `--radius-sm` or `--radius-md` | Use when a discrete control boundary is needed |
| Floating overlay | framed sheet with thin border and restrained shadow | Flyouts, dropdowns, hover previews |

**Do not default to pills.** `--radius-full` exists, but capsule controls are not the house style. Use it only when a fully rounded shape is semantically required. Most site chrome should use `--radius-sm` or `--radius-md`.

### Hover and active states

| Context | Preferred hover treatment | Avoid |
| ------- | ------------------------- | ----- |
| Inline links | accent color + underline | filled button hover |
| Small controls | text color shift + faint surface tint | thick borders, heavy fills |
| List rows | subtle background wash + text darkening | pill chips inside the row |
| Selected state | clearer text, accent, or border emphasis | relying on saturation alone |

The default interaction model should not make the interface look inflated. Hover is an invitation, not a call-to-action campaign.

### Flyouts, dropdowns, and reveal panels

Reveal surfaces should behave like compact editorial slips:

- Use a flat or near-flat background derived from `--color-bg` or `--color-bg-subtle`.
- Use a 1px neutral border (`--color-border` or `--color-border-subtle`).
- Prefer `--radius-md` at most.
- Keep shadows soft and low-contrast. Blur is optional and should be subtle when used.
- Panels open adjacent to their trigger and usually only one panel in a cluster stays open at once.
- Panel internals should be aligned fields or stacked rows, not dense chip clouds.

### Tool docks

Canvas-like or power-user pages may need a persistent control locus. In those cases:

- Group controls into a compact dock rather than scattering them around viewport corners.
- Place the dock near the page's working field, usually top-center or aligned to the main content column.
- Give the dock enough surface contrast that controls are discoverable at a glance.
- Inside the dock, controls can be slightly more bounded than ordinary inline actions, but should still avoid pill styling and heavy product chrome.
- Prefer a single framing layer. If controls are individually boxed, the dock container itself should usually stay unboxed or nearly invisible.
- Tool-dock labels should use stronger text contrast than passive metadata. Default toward `--color-text` or close to it unless there is a clear hierarchy reason not to.

### Popups and previews

Hover previews and footnote popups are part of the reading system, not a separate application shell:

- Typography should match the site's prose + mono system.
- Titlebars are allowed but stay light and secondary.
- Controls inside popups use minimal icon/button styling.
- Popup content remains the visual priority; chrome only frames it.

### Focus and state badges

When the UI enters a focused or filtered mode, state should be shown as a small contextual label:

- Name the current target explicitly.
- Include path or type only if it aids orientation.
- Do not expose counts or debug metrics by default.
- Clear / exit actions should be adjacent but visually quieter than the state label itself.

## Font-size token invariant

All non-heading `font-size` declarations must use a `--text-*` token. No raw `rem` values for font-size outside headings. Relative `em` units are allowed for elements that scale with their parent (inline `code` at 0.9em, heading link icons at 0.8em, footnote superscripts at 0.85em).

This rule keeps the type scale predictable and auditable from a single location in `@theme`.

## Responsive breakpoints

Two breakpoints control layout behavior:

| Breakpoint | Condition | Effect |
| ---------- | --------- | ------ |
| 1024px | `width <= 1024px` | Grid collapses to single column; aside sidebars become inline; sidenotes hidden; sticky positioning removed |
| 640px | `width <= 640px` | Tighter inline padding (`spacing.2` instead of `spacing.4`) |

Both are declared as nested `@media` rules inside `.page-grid` in `components.css`. No shared breakpoint tokens exist; the values are inlined.

## Texture and grain

Texture lives on **chrome surfaces only — never over prose.** A page-wide noise grain over the reading column was tried and rejected: speckle lowers text contrast and reads busy. Depth and warmth come instead from smooth, contrast-safe treatments:

- **Header strip** (`--header-texture`): a symmetric vertical sheen (lighten top / darken bottom by equal amounts, mean-neutral so brightness is unchanged) plus fine, single-octave desaturated grain. The header carries no long-form text, so grain there is safe.
- **Page sheen** (`--page-sheen`): a viewport-fixed, smooth, near mean-neutral vertical gradient — a faint top light and a whisper of shade at the bottom. Smooth gradient only, so prose contrast is untouched. This shared "lit from top" cue ties the textured header into the body.
- **Reading surface / paper column** (`--color-paper`, `--paper-shadow`): the central column sits a hair lighter than the page desk (`--color-bg`), lifted by a soft shadow. The TOC and metadata panels sit on the desk as marginalia; the header chrome belongs to the same recessed layer. This realizes the three-zone structure from `L1-design-vision`.
- Typographic contrast between serif prose and mono metadata adds per-page variety.

**Per-theme depth, not inversion.** In dark, the paper's tone lift off the charcoal desk carries the depth on its own. In light, near-white paper barely differs from the desk in tone, so the **shadow does the lifting** (a layered contact + ambient soft shadow). The two themes therefore use different `--color-paper` and `--paper-shadow` values — do not assume one is an inversion of the other, and verify both themes when touching the shading.

### Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| no-prose-grain | MUST | No noise/grain texture is applied over the reading column; reading-surface texture is limited to smooth gradients or tonal surfaces |
| chrome-texture-ok | MAY | Grain/sheen texture may be applied to chrome surfaces (header) that carry no long-form text |
| paper-lift-both-themes | MUST | The reading column is perceptibly lifted off the page in both light and dark themes |
| symmetric-gutters | MUST | The gap from the prose edge to the margin furniture is equal on the left and right |

## Graph color resolution

The relation graph (`src/scripts/graph/`) renders in SVG with D3. Edge and node colors reference CSS custom properties, but SVG needs concrete color values at render time. The bridge is `src/scripts/graph/styles.ts`:

1. `EDGE_STYLES` and `NODE_COLORS` are initialized with hex fallbacks matching the `@theme` tokens.
2. `resolveRuntimeColors()` runs once after DOM ready, calling `getComputedStyle(document.documentElement).getPropertyValue(name)` for each token.
3. This updates the style objects in place, so the graph always matches the current theme even if token values change.

Edge types are distinguished by **both color and dash pattern** — color provides fast visual grouping, dash pattern provides a redundant encoding for accessibility. Each relation family uses its `--color-rel-*` token (hierarchy = slate, sequence = olive, type = mauve, reference = neutral). Node fills use the `--color-type-*` tint for the page's content type, highlights use `--color-accent`, labels use `--color-text`. See the Color coding strategy in the Colors section above.

## Key files

| File | Role |
| ---- | ---- |
| `src/styles/global.css` | Token definitions (`@theme`), `:root` overrides, layer imports |
| `src/styles/base.css` | Element-level defaults (`@layer base`) |
| `src/styles/components.css` | Layout grid, panels, popups, footnotes, callouts (`@layer components`) |
| `src/styles/prose.css` | Heading anchors, external link icons (`@layer components`) |
| `src/scripts/graph/styles.ts` | Runtime CSS variable resolution for SVG graph colors |

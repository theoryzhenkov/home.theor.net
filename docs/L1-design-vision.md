---
scope: L1
summary: "Aesthetic direction, visual language, and design rules for the site redesign"
modified: 2026-06-25
reviewed: 2026-06-25
depends:
  - path: docs/L0-ui
dependents:
  - path: docs/L1-styles
  - path: docs/L2-header-nav
  - path: docs/L2-info-architecture
  - path: docs/L2-reading-experience
  - path: docs/L2-embedded-content
  - path: docs/L2-information-density
---

# Design Vision

Target aesthetic for home.theor.net — a content-first personal knowledge site with typed relations, optimized for long-form reading.

## Aesthetic direction

**Scrapbook with coherent bones.** The site should feel like a collage — different content types have visually distinct treatments — but everything sits on a shared structural grid. The variety is organic, not chaotic. A patchwork that grew over time, held together by consistent typography and spatial rhythm.

**Texture over saturation.** The visual richness comes from layered texture — but **texture stays on chrome and surfaces, never as grain over prose** (a page-wide grain over the reading column was tried and rejected for hurting contrast; see `L1-styles` "Texture and grain"). Depth comes from a lifted "paper" reading column, a textured header strip, smooth page lighting, and the serif/mono typographic contrast — not from saturated color palettes. Color is present but quiet — used as a secondary signal that reinforces shape, icon, and typography. Content types get barely-there background tints; relation types get muted hues in the graph; maturity indicators get the loudest color. Nothing garish, but not monochrome either.

**Practical density.** Optimized for people who read. Information-dense but structured. Nothing decorative that doesn't serve comprehension or navigation.

### Inspirations

- **Gwern.net** (primary): sidenotes, link previews, metadata transparency, progressive disclosure, content maturity indicators
- **Andy Matuschak**: evergreen notes, working-in-public feel, sliding panes concept
- **Diegetic interfaces**: conceptual mood reference — the idea that interface elements feel like artifacts within the content world, not chrome imposed on top. Applied lightly, not literally.

## Color and theme

### Palette philosophy

Neutral grey-paper base with intentional color coding as a quiet secondary layer. A restrained ink-blue accent is reserved for interactive elements. Content-type background tints and relation-type graph colors provide subliminal wayfinding. Maturity indicators are the loudest chromatic element. See `docs/L1-styles.md` for full token catalog and color coding strategy.

### Dual theme

Both light and dark themes, toggled manually. Each theme is carefully designed — dark is not an inversion of light. Textures and accents adapt per theme.

- **Light theme**: off-white/cool grey backgrounds, dark ink text, subtle paper-like grain
- **Dark theme**: deep charcoal (not pure black), warm light text, adapted grain/texture

### Semantic color (quiet signal)

Color reinforces shape/icon/typography as a secondary layer — never the sole differentiator, but present enough for subliminal wayfinding:
- **Content-type tints**: barely-there background hue shifts (3-5%) for article, project, note, interactive pages. Felt before consciously noticed.
- **Relation-type colors**: muted hues (slate, olive, mauve, neutral) in the graph SVG only. In text, relations remain monochrome.
- **Maturity indicators**: the loudest color on the site — these carry the highest semantic value (trustworthiness signal).
- **Accent (ink-blue)**: reserved for interactive affordances only — links, focus rings, footnote numbers. Never decorative.

See `docs/L1-styles.md` "Color coding strategy" for the full policy.

## Typography

### Type system

Two typefaces, serif + monospace, creating the core patchwork texture through their contrast.

| Role | Treatment | Usage |
| ---- | --------- | ----- |
| Prose body | Serif, regular weight | Articles, essays, descriptions — the reading experience |
| Headings | Serif, bold/heavier weight | Section headers, page titles |
| Page-link content | Serif | Relation values, breadcrumb path, TOC entries — links to pages read as serif content |
| Labels, code, factual data | Monospace | Frontmatter/metadata labels, dates, read time, code blocks, tags, nav |
| UI chrome | Serif or mono depending on context | Navigation, buttons, controls |

**Serif = page-link content, mono = chrome.** Both the TOC and the metadata strip follow one rule: links to pages (relation values, breadcrumb, TOC entries) are serif; labels, dates, and other factual chrome are monospace. This is what makes the two read as one family. Relation *labels* (`PART OF`, `IS`) are mono; their *values* are serif.

Both typefaces must be **characterful and unexpected** — not Inter, Roboto, Arial, Space Grotesk, or other generic defaults.

### Scale

Gwern-inspired: moderate mathematical scale (~1.25x ratio), dense but legible. Body text at 1rem (16px). Tighter letter-spacing on headlines, looser on small text.

### Typography constraints

Rules that protect readability and visual coherence across the site:

1. **Two fonts only.** Source Serif 4 (serif) and Commit Mono (monospace). No third typeface. Every text element uses one of these two — the serif/mono contrast is the design's core texture. Using a second monospace (e.g. IBM Plex Mono, JetBrains Mono) or adding a sans-serif fragments the identity.
2. **11px absolute floor.** No text smaller than 0.6875rem (11px). Text below this is unreadable for many users and renders inconsistently. The 11px size is reserved for tertiary monospace chrome (nav, breadcrumbs, uppercase labels).
3. **Body-adjacent text matches body.** List items, blockquote prose, and other content that reads as part of the prose flow must use the same size and line-height as body text (16px / ~1.6). Subtle size drops (e.g. 15px for lists) create invisible inconsistency.
4. **Whole-pixel token values.** Font size tokens resolve to whole pixels at the default 16px root to avoid sub-pixel rendering variance.
5. **Token-only sizing.** All non-heading font sizes use `--text-*` tokens from `L1-styles`. No raw values outside headings. See the font-size token invariant in `L1-styles`.
6. **Small mono chrome stays quiet.** Uppercase monospace labels at `--text-3xs` use restrained tracking (`~0.04em–0.06em`), not exaggerated all-caps spacing. Commit Mono already has presence; over-tracking makes metadata louder than prose.

## Layout

### Reading column

Narrow content column (max ~65-70ch) with generous margins. Tufte-style: the margins are functional space for sidenotes, not empty decoration.

### Three-zone structure

1. **Left margin**: the collapsible table of contents ("CONTENTS")
2. **Center column**: the reading surface — a "paper" column lifted off the page "desk", holding prose, headings, inline interactives, and the inline metadata strip below the title
3. **Right margin**: sidenotes and margin notes

Metadata is **not** a margin panel. A compact, horizontal metadata strip sits inline below the title showing the most important fields (status, updated, `part_of`, `has_part`, `is`) plus a `graph` link and an `all metadata →` link to the page's dedicated metadata page (`/<slug>/metadata`), which carries the full field/relation grid. The strip keeps the serif-value / mono-label family styling so it still relates to the TOC. The gap from the text to the left margin (TOC) uses `--margin-gap`.

Collapses to single column on narrow viewports, with the margin panels and sidenotes inlining into the flow.

## Header: scroll-reveal navigation frame

The header is the site's only piece of persistent chrome. It frames the page on arrival, then gets out of the way during reading.

### Role

Site identity, quicklinks, search, theme toggle. No article-specific metadata — maturity, read time, dates, freshness, breadcrumbs, and relations belong in the MetadataStrip, a collapsible panel in the right margin (mirroring the TOC), and reading progress is tracked by the TOC's scroll-spy states. The header does one job: orient you within the site and give you an escape hatch.

### Behavior

The header is **non-sticky by default**. It sits at the top of the page in normal document flow. As you scroll down into content, it scrolls away — the full viewport belongs to the reading experience.

On **scroll-up** (direction reversal), the header slides back into view as a fixed overlay, then hides again when you resume scrolling down. This applies on all viewports — desktop and mobile share the same interaction model. No special mobile-only behavior, no TOC carrying navigation duties, no second bar.

At **scroll position zero** (top of page), the header is always visible in its normal document-flow position.

### Visual distinction

The header has a **different background** from the page surface — perceptibly darker or more muted — so it reads as a distinct strip, not as the page bleeding upward. This is realized as a sheen + fine grain texture (`--header-texture`) over a muted background: the strip reads as a distinct material from the flat reading surface, and grain is acceptable here because the header carries no long-form text. When it appears as a fixed overlay on scroll-up, this background also prevents content from showing through.

### No reading progress bar

The TOC already tracks per-section read state and estimated time. A 2px progress bar in the header is redundant. Removed.

## Content features

### Sidenotes (Tufte-style)

Margin notes appear alongside the referenced text in the right margin. On mobile, they collapse inline (expandable). Sidenotes are first-class citizens, not hidden footnotes.

### Link previews

Hover previews of linked pages — both internal and external. Shows title, excerpt, and relation type for internal links.

### Progressive disclosure

- Collapsible sections for detailed content
- Expandable details blocks
- Content reveals depth on demand — the "iceberg model"

### Content maturity

Each entry displays a visible maturity/confidence indicator:

| Level | Meaning |
| ----- | ------- |
| Draft | Early, incomplete, may change substantially |
| In-progress | Being actively developed, core ideas present |
| Stable | Reasonably complete, unlikely to change much |
| Evergreen | Maintained over time, regularly reviewed |

### Backlinks

Every entry shows its backlinks — other entries that reference it. First-class, not hidden.

## Content types

All four types share the structural grid but have distinct visual framing (the scrapbook variety):

| Type | Character |
| ---- | --------- |
| Long-form articles | Dense prose, full sidenote support, prominent metadata header |
| Projects / portfolio | Status-oriented, links to related writing, possibly visual |
| Short notes / TIL | Compact, quick to scan, accumulate over time |
| Interactive pages | Hybrid: some interactives inline within prose, some full-page takeover |

Differentiation via typography, framing, and metadata density — not color.

## Index / listing pages

**Dense table/list format.** Compact rows with title, date, type, tags, maturity. Scannable, power-reader oriented. Like a bibliography or file manager. Not cards, not a grid.

## Relations

### Frontmatter schema

Typed relations specified in page frontmatter:

| Relation | Inverse | Semantics |
| -------- | ------- | --------- |
| `up` | `down` | Hierarchical parent/child |
| `next` | `prev` | Sequential ordering |
| `is` | `has` | Type/instance relationship |
| `ref` | `refi` | Reference / back-reference (auto-extracted from links) |

### Display

- **Prominent header block**: each entry shows date, type, status, tags, and typed relations clearly at the top
- **Supplementary graph**: visible per-page relation graph, but not the primary navigation method
- **Backlinks section**: at the bottom or in margin, showing all incoming references

## Interaction language

The site should feel editorial even when it exposes power features. Interaction chrome is real, but it should read like marginal apparatus, slips, and annotations around the text rather than product UI layered on top of it.

### Hover and focus

- **Hover is a reveal, not a button effect.** The default hover treatment is text-level: color shift, underline, or a subtle background wash. Avoid hover states that make ordinary links and controls look inflated or embossed.
- **Focus state must name context.** When the interface enters a focused mode, show what is focused in plain language (title, path, relation, filter state). Do not rely on a glow or a selected pill alone to explain state.
- **Counts are optional, not ambient.** Page counts, edge counts, and other instrumentation stay hidden unless they help complete the task at hand. The interface should surface meaning first, telemetry second.

### Reveals, dropdowns, and flyouts

- **Progressive disclosure stays lightweight.** Secondary controls should hide until requested, then appear as compact sheets or slips near their trigger.
- **Use small framed surfaces, not floating gadgets.** Flyouts, dropdowns, and search reveals should feel like thin paper overlays: flat background, thin border, restrained radius, minimal shadow.
- **Avoid pill clusters as the default control language.** Capsule toggles and SaaS-style chips fight the site's editorial tone. Prefer text launchers, list rows, underlined actions, or compact boxed controls.
- **One revealed panel at a time.** When multiple tool panels exist in the same region, opening one should normally close the others.

### Controls and lists

- **Text-first controls.** If an action can be expressed as a text link or terse text button, start there. Reserve icon-only or button-heavy treatments for actions that need immediate recognition or repeated use.
- **Selection controls should read structurally.** Filters and relation toggles should behave like a small list or control strip, not like tag pills. State should be legible through label, order, and subtle emphasis.
- **Dropdown content is a sheet of options, not a menu toy.** Mobile nav, graph controls, and similar reveals should use stacked rows or aligned fields with clear hierarchy, generous hit targets, and minimal ornament.
- **Power-feature controls need a visible locus.** Minimal chrome does not mean hidden chrome. When a page is a tool or canvas, its controls should gather into a clearly findable dock near the primary working area rather than dissolving into page margins.
- **Wide screens still privilege the center.** If the main activity happens in the middle of the page, controls should stay visually associated with that center field. Do not strand critical controls at the far edges of a large viewport.
- **Use one framing layer at a time.** A dock full of boxed controls does not also need its own heavy box. Avoid nested framing unless there is a real grouping problem to solve.
- **Tool typography should read clearly first.** On canvases and power-feature pages, control labels should lean darker and clearer than ambient metadata. Low-contrast gray text is too easy to lose against the field.

### Popups and previews

- **Previews are reading aids.** Hover previews, footnote popups, and related overlays exist to preserve reading flow. They should inherit the site's typography and behave like compact excerpts, not mini apps.
- **Overlay chrome stays subordinate to content.** Borders, shadows, and titlebars establish containment, but the body content remains the visual priority.

## Motion and interaction

**Minimal and functional.** Only animate what aids comprehension:

- Page transitions (fast, crisp)
- Expanding/collapsing sections
- Hover states for interactive elements
- No decorative animation, no ambient motion, no scroll-triggered effects

All transitions under 150ms. Performance over flourish.

## Audience

Designed for **both** technical peers and broad curious readers equally. Dense enough for power readers, clear enough that anyone can read an article without feeling lost. No required onboarding to the site's structure.

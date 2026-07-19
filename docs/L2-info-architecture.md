---
scope: L2
summary: "Metadata model, spatial layout rules, and information density strategy for page chrome"
modified: 2026-06-25
reviewed: 2026-06-25
depends:
  - path: docs/L1-design-vision
  - path: docs/L1-relations
dependents:
  - path: docs/L2-components
  - path: docs/L2-information-density
---

# Information Architecture

How metadata is modeled, where it appears on the page, and how the current scattered layout consolidates into a dense, single-pass-readable header block.

## The problem

Three separate zones currently display page metadata between the title and prose content: breadcrumbs, a metadata row (dates, type, word count), and a relations block. Each occupies its own vertical band with its own visual treatment, spreading thin information across significant vertical space. The reader scans past three distinct regions before reaching content. The header bar adds a fourth zone with its own ambient metadata (read time, maturity). Meanwhile, `is:` relations and the header's "type" label duplicate each other with no clear authority.

## Metadata model

### Canonical fields

Every page has these metadata fields. There is no separate "type" field -- the `is:` relation IS the type system. The header's former "article" / "project" label was a display artifact of the first `is:` target. This spec makes that relationship explicit and kills the redundancy.

| Field | Source | Required | Semantics |
| --- | --- | --- | --- |
| `title` | frontmatter | yes | Display name |
| `created` | frontmatter | yes | First publication date |
| `modified` | frontmatter | no | Last substantive edit |
| `maturity` | frontmatter | no | Stub / Rough / Developed |
| `part_of` | frontmatter | no | Composition parent / semantic containment |
| `has_part` | inferred | -- | Parts (from others' `part_of`) |
| `is` | frontmatter | no | Type/category classification |
| `has` | inferred | -- | Instances (from others' `is`) |
| `subclass_of` / `superclass_of` | frontmatter + inferred | no / -- | Class taxonomy |
| `subject` / `subject_of` | frontmatter + inferred | no / -- | Aboutness |
| `creator` / `creator_of` | frontmatter + inferred | no / -- | Authorship / creation |
| `related` | frontmatter + inferred | no | Weak symmetric association |
| `up` / `down` | legacy frontmatter + inferred | no / -- | Route hierarchy fallback. Prefer `part_of` / `has_part` |
| `next` / `prev` | frontmatter | no | Sequence links |
| `ref` / `refi` | extracted + inferred | -- | Outbound / inbound references |
| `description` | frontmatter | no | Subtitle or summary line |

### `is:` subsumes type

The "type" display (article, project, note, etc.) derives from the first `is:` target. Pages with no `is:` relation have no type label -- they are untyped, which is fine. There is no `type` frontmatter field. The `is:` relation is richer than a flat enum because a page can be an instance of another page, inheriting context.

Rationale: a flat `type` field duplicates what `is:` already expresses but loses the graph connectivity. A page that `is: research-project` links directly to the "research-project" concept page, which can have its own description, children (`has:`), and relations. A flat enum cannot do this.

### Maturity vs. dates

Maturity is a qualitative signal (how confident/complete is this?). Dates are factual timestamps. Both display but serve different purposes. Maturity is prominent because it sets reader expectations. Dates are secondary -- useful for context but not decision-making for most readers.

## Spatial layout: the metadata strip

All page chrome between the title and prose body consolidates into a single dense region called the **metadata strip**. It replaces the current three-zone layout (breadcrumb row, relations block, metadata row) with a unified block that reads top-to-bottom in one visual pass.

### Structure (inline strip + dedicated metadata page)

Metadata sits **inline below the title** as a compact, horizontal, wrapping strip showing only the most important fields; the full set lives on a dedicated metadata page.

```
  [Title (h1)]
  [Description]
  rough; UPDATED: 2026-06-22; PART OF: Projects; IS: Project; graph; all metadata ->
  [Prose content ...]
```

- **Inline (every page):** `status`, `updated`, and the relations `part_of` / `has_part` / `is`, then a `graph` link and an `all metadata` link. Items are separated by semicolons hugging the left item, section labels are followed by a colon (`IS: Page`), and multi-value lists use commas with no space before the comma.
- **Dedicated page** at `/<slug>/metadata` (titled `<page> Metadata`): the full vertical key/value grid -- all dates, read time, breadcrumb path, and every relation, plus backlinks.

Styling follows the family rule (see `L1-design-vision` Typography): mono uppercase labels, serif page-link values, mono dates; labels are dimmed, values brighter.

> Earlier iterations placed the strip between the title and prose, then briefly as a right-margin panel mirroring the TOC. Both were retired: the inline strip keeps metadata in the reading column without a tall panel, and the dedicated page absorbs the long tail.

### Metadata strip contents (in order)

```
rough · 4 min · created 2025-06-12 · updated 2026-01-15
part of: blog    is: blog-note    subject: personal-knowledge-management
```

Row 1 is the **context line**: maturity badge, estimated read time, dates. All on one line, separated by `·` (middle dot). The type label is NOT repeated here — it already appears in the `is:` relation row, and duplicating it wastes space. This is the "ambient status" the design vision calls for, pulled down from the header into the content zone where it has immediate context.

Row 2+ are **relation rows**: only shown when non-empty. Each row is `label: link, link, link`. Relation types appear in a fixed order biased toward PKM semantics: `part_of`, `has_part`, `is`, `has`, taxonomy, aboutness, authorship, `related`, legacy hierarchy, sequence, references. External URLs are not relation rows; authors render them manually in MDX when they are part of the page content.

### Why not the header?

The design vision describes the header as an "ambient status bar." That concept is sound, but the header is persistent chrome visible on scroll. Putting per-page metadata there means it competes for attention during reading. The metadata strip places context exactly where the reader needs it: at orientation time, in the right margin beside the title and the opening of the prose. The header retains: site identity, navigation, search, and theme toggle. It does not duplicate per-page metadata. (Reading progress is tracked by the TOC scroll-spy, not a header bar — see `L1-design-vision`.)

### Why inline (not the margin)?

The right margin is reserved for sidenotes; the metadata strip lives inline in the reading column. A right-margin metadata panel was tried and reverted — it competed with sidenotes (requiring band-reservation logic) and a tall vertical panel was less readable than a short horizontal strip. The inline strip shows only the high-value fields, and the `all metadata →` link defers the rest to `/<slug>/metadata`, so the reading column stays light while the full graph remains one click away.

## Relation display rules

### Inline vs. block

Relations display inline within the metadata strip, not as a separate component with its own heading or border. They are metadata, styled identically to dates and maturity -- monospace, small, muted.

### Ordering

Fixed display order prevents cognitive load from layout variation across pages:

1. `part_of` -- what larger thing contains this semantically?
2. `has_part` -- what parts compose this?
3. `is` -- what kind of thing is this?
4. `has` -- what instances belong to this class/category?
5. `subclass_of` / `superclass_of` -- class taxonomy
6. `subject` / `subject_of` -- aboutness
7. `creator` / `creator_of` -- authorship / creation
8. `related` -- weak association
9. `up` / `down` -- legacy route hierarchy fallback
10. `prev` / `next` -- sequence navigation
11. `ref` / `refi` -- references and backlinks

### Suppression rules

Not every relation type earns screen space on every page.

| Relation | Show when |
| --- | --- |
| `part_of` | Always, if non-empty (primary orientation relation) |
| `has_part` | Only when > 0 parts exist |
| `is` | Always, if non-empty |
| `has` | Only on concept/category pages (pages that other pages point to via `is:`) |
| `subclass_of` / `superclass_of` | Always, if non-empty on class pages |
| `subject` / `subject_of` | Always, if non-empty |
| `creator` / `creator_of` | Always, if non-empty |
| `related` | Show if non-empty, but keep visually low-emphasis |
| `up` / `down` | Legacy fallback. Suppress when equivalent `part_of` / `has_part` exists |
| `prev` / `next` | Always, if set (sequence navigation is high value) |
| `ref` | Suppress in the strip. Outbound refs are visible as links within prose. Showing them again in metadata is redundant. |
| `refi` | Show as a "Backlinks" section at the page bottom, NOT in the metadata strip. Backlinks are reference material, not orientation metadata. |

This means a typical article page shows: context line + `part_of` + `is` + perhaps `subject`. Two or three lines of metadata. Dense.

### External link cards

Project/resource URLs are content, not page topology. Authors render them manually in MDX with `LinkCards` when a page needs README-style action cards for source repositories, install stores, latest releases, websites, or documentation. Cards use restrained monochrome surfaces with small monospace kind markers. Known kinds (`github`, `website`, `docs`, `release`, `chrome`, `firefox`) provide default labels; the MDX author controls ordering and can override labels/details.

### Prev/Next display

Sequence links (`prev`/`next`) display as a compact navigation row at the bottom of the metadata strip, formatted as directional links: `< Previous Title  |  Next Title >`. They also appear at the bottom of the page content (after prose, before backlinks) as a repeated navigation affordance, since readers who finish an article in a sequence need forward/back without scrolling up.

## Context line specification

The context line is the first row of the metadata strip. It packs the most decision-relevant metadata into a single scannable line.

### Format

```
{maturity} · {read_time} · created {date} [· updated {date} [{relative}]] [· {backlinks}] · graph
```

Example with all segments:

```
developed · 4 min · created 2025-06-12 · updated 2025-08-15 (7mo ago) · 3 backlinks · graph
```

Example for a fresh page with no backlinks:

```
rough · 8 min · created 2026-03-01 · graph
```

Each segment:
- **maturity**: One of `stub`, `rough`, `developed`. Styled with a subtle status indicator (the only semantic color use, per design vision). Omitted if not set in frontmatter.
- **read_time**: `N min` estimated from word count (~250 wpm). Omitted for pages under 2 minutes.
- **created**: Always shown. Format: `YYYY-MM-DD` (ISO, matching the monospace/technical aesthetic; not "Mar 15, 2026" which mixes serif-friendly formatting into a monospace context).
- **updated**: Shown only if `modified` differs from `created` by more than 24 hours. Same format.
- **freshness indicator**: A relative time shown parenthetically after the updated date when the page is older than 6 months. Rules: < 6 months: no indicator (implicitly fresh). 6 months -- 2 years: `(Nmo ago)` in `--color-text-subtle`. > 2 years: `(N yr ago)` in `--color-status-draft` (amber) -- the strongest staleness signal, justified because a page untouched for over 2 years is a trust concern equivalent to a draft.
- **backlinks**: `N backlinks` (plural) or `1 backlink` (singular), displayed as an accent-colored link that scrolls to `#backlinks-heading`. Omitted when backlink count is 0. The count is a prominence signal -- a page with many inbound references is a hub in the knowledge graph.
- **graph**: Always present. An accent-colored text link to `/graph?focus={slug}`. See L2-graph-viz for focus behavior.

### Segment ordering rationale

Left to right, from most decision-relevant to most supplementary:
1. **Maturity** -- trust signal, sets reader expectations
2. **Read time** -- commitment signal
3. **Created** -- factual origin
4. **Updated + relative** -- freshness signal
5. **Backlinks** -- prominence signal
6. **Graph** -- exploration affordance (furthest right because it is a navigation escape, not a reading aid)

### Why ISO dates?

The site's aesthetic is textured, technical, information-dense. ISO dates (`2026-03-19`) are scannable in monospace, sort lexicographically, and match the utilitarian character. Localized dates ("Mar 19, 2026") belong in friendlier contexts. This is a research notebook, not a blog.

## Index / listing pages

Listing pages (e.g., `/projects/`) use the ContentTable component. Collection membership comes from metadata relations, not directories; for example, the projects listing selects pages with `is: classes/project`. The metadata model informs column selection.

### Default columns

| Column | Source | Rationale |
| --- | --- | --- |
| Title | `title` | Primary identifier, linked |
| Type | first `is:` target | Enables scanning by kind |
| Maturity | `maturity` | Lets readers filter by completeness |
| Created | `created` | Chronological orientation |
| Updated | `modified` | Freshness signal |

Read time is omitted from listings (not useful for scanning decisions). Description is omitted to keep rows compact -- the title should be self-explanatory. If it is not, the title needs rewriting.

### Sort and filter

Default sort: `modified` descending (freshest first). The "Type" and "Maturity" columns are filterable via dropdown. This replaces tag-based filtering -- `is:` relations ARE the taxonomy.

## Information density recommendations

### Vertical budget

The metadata strip should occupy no more than 3-4 lines of monospace text for a typical article. Currently, breadcrumbs + metadata row + relations block often span 8-12 lines with spacing. Target: 50% vertical reduction.

### Consolidation moves

1. **Kill the separate Metadata component.** Merge its content (dates) into the context line of the metadata strip.
2. **Kill the separate relation heading.** Relations are rows in the strip, not a titled section.
3. **Breadcrumbs live on the metadata page.** The breadcrumb path is derived from the `part_of` chain, falling back to legacy `up`. It renders as the `PATH` row on the dedicated `/<slug>/metadata` page (only when a page has ancestors), not as a band above the title. The inline strip omits the path; `part_of` covers the immediate parent there.
4. **Move backlinks to page bottom.** They are reference material, not orientation. The reader does not need to see "5 pages link here" before deciding to read.
5. **Move the graph visualization to the bottom.** The per-page relation graph is supplementary, not primary navigation. Position it near backlinks, after the prose content.

### What stays in the header

The header bar retains only persistent, scroll-visible information:

- Site identity (logo/name)
- Primary navigation links
- Search trigger
- Theme toggle

(Reading progress is tracked by the TOC scroll-spy states, not a header bar.)

Everything else moves to the metadata strip or page bottom.

## Backlinks section

Backlinks (`refi` relations) are displayed as a dedicated section at the bottom of every page, after the prose content and prev/next navigation, before the relation graph. Inspired by Gwern.net, each backlink shows not just the linking page's title but the **text snippet** where the link appears -- the surrounding context that explains *why* the link was made. This transforms backlinks from a flat list of titles into a meaningful reading trail.

### Why snippets matter

A bare title ("Training Dynamics Overview") tells the reader *what* links here but not *why*. The snippet reveals intent: did the author cite this page as evidence, mention it in passing, or build an argument on it? This distinction is the difference between a bibliography and a research tool. The reader can decide whether to follow a backlink without navigating away -- progressive disclosure applied to the link graph.

### Visual structure

Each backlink entry is a self-contained card-like block with three elements stacked vertically:

```
[Title (linked, serif)]  [type label (mono, small)]
> Snippet paragraph with the surrounding context where
> the link appeared. The linked phrase is highlighted
> within the snippet text.                    [view in context ->]
```

**Title row.** The backlinking page's title, rendered as an accent-colored link in Source Serif 4 (serif) at `--text-sm` (14px), with the page's type label inline to the right in Commit Mono at `--text-2xs` (12px), muted (`--color-text-subtle`). The title row uses horizontal layout with baseline alignment and an 8px gap between title and type.

**Snippet blockquote.** The paragraph (or sentence cluster) from the backlinking page that contains the link to the current page. Styled as a blockquote with:

- Left border: 2px solid `--color-border` (not accent -- accent is reserved for interactive elements, and the border here is structural, not clickable)
- Padding-left: 12px (from the border to text)
- Font: Source Serif 4 at `--text-xs` (12.8px), `--color-text-muted`, `line-height: 1.5–1.55`
- The linked phrase within the snippet (the anchor text that originally pointed to this page) is rendered in `--color-accent` with no underline, distinguishing it from the surrounding context
- Max height: 4 lines (~5.2em at the given font size and line-height). Snippets longer than 4 lines are truncated with a CSS `line-clamp` and trailing ellipsis. This prevents a single verbose backlink from dominating the section.

**"View in context" link.** Optional, displayed below the snippet aligned to the right. Rendered in Commit Mono at `--text-2xs`, `--color-accent`. Links to the backlinking page with a fragment anchor that scrolls to the paragraph containing the link. Only shown when the build system can generate a stable fragment identifier for the source paragraph (i.e., the paragraph has a heading ancestor that produces an anchor). Omitted silently when no anchor is available.

### Snippet extraction rules

At build time, the backlinks system extracts context for each inbound reference:

1. **Source unit.** The snippet is the full paragraph (`<p>`) element that contains the link. If the link is inside a list item, the list item text is used instead. If inside a heading, the heading plus the first paragraph of its section.
2. **Length limit.** Snippets are capped at 280 characters (approximately two sentences). If the source paragraph exceeds this, extract a window centered on the link: take text starting ~40 characters before the anchor text and ending ~240 characters after, trimming to word boundaries and adding ellipsis (`...`) at the truncation points.
3. **Markup stripping.** The snippet is plain text with one exception: the original anchor text (the phrase that linked to this page) retains its accent color styling. All other links, formatting (bold, italic, code), and footnote references are stripped. The snippet is a reading aid, not a formatted excerpt.
4. **Fallback.** If snippet extraction fails (e.g., the link is in frontmatter, or the source page uses a non-standard content structure), fall back to the backlinking page's `description` field. If that is also absent, show the title-only format (no snippet block).

### Section header and count

The section header reads `BACKLINKS` in Commit Mono at `--text-2xs`, `font-weight: 600`, restrained tracking (`~0.06em`), `--color-text-subtle` -- matching the existing label style used for other aside-panel headers. A count badge follows inline: `(3)` in the same typographic treatment. This gives the reader a quick signal of backlink density without requiring them to scan the full list.

### Spacing and separation

- The backlinks section is separated from the preceding content by a 1px top border in `--color-border-subtle` with `padding-top: 24px` -- matching the current prototype.
- Gap between the section header and the first backlink entry: 12px.
- Gap between individual backlink entries: 16px. Each entry is visually self-contained but grouped tightly enough to scan as a list.
- Internal gap within each entry: 6px between the title row and the snippet blockquote; 4px between the snippet and the "view in context" link.

### Overflow handling (progressive disclosure)

The backlinks count determines display strategy:

| Count | Behavior |
| --- | --- |
| 0 | Section hidden entirely. No "BACKLINKS" header, no empty state. |
| 1--5 | All entries expanded with snippets visible. No collapse needed -- 5 entries with 4-line snippets occupy roughly 400px, which is acceptable for end-of-page reference material. |
| 6--20 | First 5 entries expanded. Remaining entries collapsed behind a `Show N more backlinks` toggle (Commit Mono, `--text-xs`, `--color-accent`). Clicking expands all remaining entries inline with no animation. The toggle text changes to `Show fewer` after expansion. |
| 20+ | First 5 entries expanded. A toggle shows `Show all N backlinks`. Additionally, the expanded entries beyond 5 are rendered without snippets (title + type only) to reduce vertical cost. The reader who wants snippet context for entry #17 can click through to the backlinking page. |

### Mobile behavior (below 1024px)

On narrow viewports:

- The backlinks section remains at the page bottom (same position).
- Snippet blockquotes are preserved but capped at 3 lines instead of 4 (`line-clamp: 3`).
- The "view in context" link is hidden -- on mobile, the reader will tap the title to navigate, and fragment-scrolling is less reliable on small screens.
- The overflow threshold drops: first 3 entries expanded (not 5), with `Show N more` for the rest.
- Padding and gaps tighten slightly: entry gap reduces to 12px, section top padding to 16px.

### Accessibility

- Each backlink entry is a `<li>` within a `<ul>` inside a `<section aria-labelledby="backlinks-heading">`.
- The section header is an `<h2>` (visually styled small, but semantically correct for page outline).
- Snippet blockquotes use `<blockquote cite="URL">` with the `cite` attribute pointing to the backlinking page.
- The "view in context" link has `aria-label="View this reference in context on [Page Title]"` for screen readers.
- The expand/collapse toggle uses `aria-expanded` and controls the hidden entries via `aria-controls`.

### Key files

- `src/components/Backlinks.astro` -- backlink section markup, snippet rendering
- `src/lib/backlinks.ts` -- snippet extraction, truncation, fragment anchor resolution
- `src/styles/components.css` -- `.backlink-entry`, `.backlink-snippet` styles

## Assertions

| ID | Sev. | Assertion |
| --- | --- | --- |
| no-type-field | MUST | No `type` frontmatter field exists; type derives from the first `is:` target |
| single-strip | MUST | All pre-content metadata renders as a single contiguous block (metadata strip), not multiple spaced zones |
| context-line | MUST | The context line contains type, maturity, read time, and dates on one row |
| iso-dates | MUST | Dates render in ISO 8601 format (`YYYY-MM-DD`) in the metadata strip |
| ref-suppressed | MUST | Outbound `ref` relations do not appear in the metadata strip |
| backlinks-bottom | MUST | `refi` (backlinks) display at page bottom, not in the metadata strip |
| strip-budget | SHOULD | Metadata strip occupies 4 or fewer lines for a typical article page |
| breadcrumb-part-of-dedup | SHOULD | `part_of:` relation row is suppressed when breadcrumbs are visible |
| maturity-color | SHOULD | Maturity indicator is the only element in the strip using semantic color |
| listing-type-col | SHOULD | Index/listing tables include a "Type" column derived from `is:` |
| backlinks-snippet | MUST | Each backlink entry displays a text snippet from the backlinking page showing the surrounding context of the link |
| backlinks-snippet-cap | MUST | Snippets are capped at 4 lines (3 on mobile) via `line-clamp` |
| backlinks-snippet-extraction | MUST | Snippet source is the paragraph or list item containing the link, truncated to 280 characters centered on the anchor text |
| backlinks-hidden-zero | MUST | Backlinks section is entirely hidden when no backlinks exist (no empty state) |
| backlinks-overflow | MUST | More than 5 backlinks collapse behind a "Show N more" toggle (3 on mobile) |
| backlinks-anchor-highlight | SHOULD | The original anchor text within the snippet is styled in `--color-accent` to identify the linked phrase |
| backlinks-context-link | SHOULD | Each snippet includes a "view in context" link with a fragment anchor to the source paragraph |
| backlinks-accessible | MUST | Backlinks section uses `<section>`, `<ul>`, `<blockquote cite>`, and `aria-expanded` for progressive disclosure |
| backlink-count-strip | MUST | The context line shows `N backlinks` (linked to `#backlinks-heading`) when backlink count > 0 |
| backlink-count-hidden | MUST | The backlink count segment is omitted when count is 0 |
| freshness-relative | SHOULD | Pages not updated in > 6 months show a relative time indicator in the context line |
| freshness-amber | SHOULD | Pages not updated in > 2 years use `--color-status-draft` (amber) for the relative time text |
| context-line-order | SHOULD | Context line segments appear in order: maturity, read time, created, updated, backlinks, graph |

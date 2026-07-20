---
scope: L2
summary: "Visual treatment for embedded content types: callouts, code, images, iframes, details, tables, blockquotes, and TODO markers"
modified: 2026-06-22
reviewed: 2026-06-22
depends:
  - path: docs/L1-design-vision
  - path: docs/L1-styles
  - path: docs/L3-remark-plugins
dependents: []
---

# Embedded Content

Visual language for all block-level content types that interrupt the prose flow within articles. Each type gets a distinct treatment that contributes to the scrapbook collage aesthetic while sharing enough structural DNA to feel like parts of one site.

## The framing strategy: shared skeleton, varied skin

No universal frame. A single border/shadow/background treatment applied to every embedded block would flatten the patchwork texture that L1-design-vision calls for. Instead, all embedded content types share three structural invariants, and then each type diverges in its surface treatment.

### Shared invariants

These three rules bind the variety into coherence:

1. **Vertical rhythm.** Every block-level embedded element has `margin-block: 1.5rem` (one and a half body line-heights). This consistent breathing room is the invisible grid that holds the collage together. Adjacent embedded blocks of the same type (e.g., two consecutive code blocks) collapse to `margin-block: 1rem`.

2. **Content-column width.** Embedded blocks never exceed the prose column width (`var(--width-content)`, 70ch). Images and iframes may be narrower but never wider. No full-bleed breakouts -- the reading column is sacrosanct.

3. **Border radius.** All framed elements use `var(--radius-md)` (3px). Not rounded enough to feel playful, not sharp enough to feel brutalist. Just enough to soften the mechanical edges while remaining crisp.

Beyond these three, each type earns its own visual identity through background, border treatment, typography, and color. This is where the scrapbook variety lives.

### Why not a universal frame

The Gwern approach (minimal framing, let content speak) works for a site that is almost entirely prose and footnotes. home.theor.net has more varied content types (callouts, embeds, project status, interactive elements) and the design vision explicitly calls for "visually distinct treatments" per content type. A universal frame would produce monotony. The risk of chaos is managed not by uniformity but by the three invariants above and by limiting the total number of distinct treatments to eight (the types listed below), each of which is carefully specified rather than ad-hoc.

---

## 1. Callouts / admonitions

Callouts are structurally important interruptions -- they break the prose flow to deliver a message at a different priority level. Their treatment should feel like a marginalia annotation that has been pulled into the main column: slightly set apart, clearly typed, but not shouting.

### Visual treatment

- **Background.** `var(--color-bg-subtle)`. A single step darker/warmer than the page surface. Enough to register as "this is not prose" without creating a heavy colored block.
- **Left border.** `3px solid` in a type-specific color (see table below). The left border is the primary type signal -- it is the one visual element that varies by callout kind.
- **Border radius.** `var(--radius-md)` on all corners. The left border extends the full height, creating an asymmetric emphasis.
- **Padding.** `0.75rem 1rem`. Compact but not cramped.
- **No outer border.** Only the left accent border. No `1px solid` outline. The background tint already separates the callout from the prose; a full border would over-frame it.

### Title bar

- **Typography.** Monospace (`var(--font-mono)`), `var(--text-sm)` (0.875rem), `font-weight: 600`. The mono face signals "metadata/system information," consistent with how the site uses monospace for non-prose elements.
- **Icon.** Optional inline Lucide-style SVG at `1em`, monochrome, placed before the title text. Icons should remain secondary to the left border and title text; no emoji icons.
- **Separator.** A `1px solid var(--color-border-subtle)` line between the title and the body. This creates a micro-hierarchy within the callout without using additional background colors.

### Body

- **Typography.** Serif body font at `var(--text-base)` (same as prose). Callout body text is first-class content, not small print.
- **Color.** `var(--color-text)`. Full-contrast text, not muted. Callouts contain important information; dimming them would undermine their purpose.

### Type-specific left border colors

| Callout type | Left border color | Rationale |
| --- | --- | --- |
| `note`, `info` | `var(--color-accent)` (muted ink-blue) | Informational, neutral-positive. The accent color is the site's interactive/informational signal. |
| `tip`, `hint`, `important` | `var(--color-status-stable)` (muted green) | Helpful, constructive. Green signals positive/actionable without urgency. |
| `warning`, `caution`, `attention` | `var(--color-status-draft)` (warm amber) | Caution, attention needed. Amber is universally understood as a warning signal. |
| `danger`, `error`, `bug` | `var(--color-error)` (warm red) | Danger, critical issue. Red is reserved for the highest severity. |
| `quote`, `cite` | `var(--color-border)` (neutral) | Attributed speech. Neutral border avoids implying urgency or status; the content speaks for itself. Styled identically to blockquotes (see section 7) but with the callout title showing attribution. |

### Foldable callouts

When a callout title ends with `-` (collapsed by default) or `+` (expanded by default), the `remarkCallout` plugin generates a collapsible wrapper. The behavior mirrors the `<details>/<summary>` treatment in section 5.

---

## 2. Code blocks

Code is a specimen pinned to the page -- a different medium than prose, requiring a different surface to signal the context switch. The treatment emphasizes the monospace grid and creates clear separation from the surrounding serif text.

### Visual treatment

- **Background.** `var(--color-bg-muted)`. Two steps from the page surface -- noticeably darker/different than callouts, establishing code as a distinct material.
- **Border.** `1px solid var(--color-border-subtle)`. A full-perimeter border, unlike callouts which use only a left accent. The border emphasizes that code is a self-contained artifact, not a continuation of the prose.
- **Border radius.** `var(--radius-md)`.
- **Padding.** `1rem`. Generous internal spacing to let the code breathe.
- **Overflow.** `overflow-x: auto` with a visible scrollbar when content overflows horizontally. The scrollbar uses native styling (no custom scrollbar) to keep code blocks feeling like a system artifact.

### Typography

- **Font.** `var(--font-mono)` (Commit Mono) at `var(--text-sm)` (0.875rem). Smaller than body text because monospace glyphs are wider at the same size; 0.875rem produces visual parity with 1rem serif prose.
- **Line height.** `1.5`. Slightly more generous than typical code editors to aid readability in a prose context (this is a document, not an IDE).
- **Tab size.** `tab-size: 4`.

### Language label

- **Position.** Top-right corner of the code block, inside the border, as a floating label.
- **Typography.** Monospace, `var(--text-2xs)` (0.75rem), `text-transform: uppercase`, restrained tracking (`~0.05em`), `color: var(--color-text-subtle)`.
- **Background.** Same as code block background. No distinct badge background -- the label floats directly on the code surface.
- **Visibility.** Only shown when Shiki provides a language identifier. If the language is not specified, no label appears.

### Copy button

- **Position.** Top-right corner, adjacent to (or replacing) the language label. Appears on hover over the code block.
- **Appearance.** A small clipboard icon (inline SVG, `1rem` size) in `var(--color-text-subtle)`. On hover: `var(--color-text-muted)`. On click: transforms briefly to a checkmark icon for `1.5s`, color `var(--color-status-stable)`.
- **Behavior.** Copies the code block's text content (without the language label) to the clipboard via `navigator.clipboard.writeText`. Falls back silently on failure.
- **Implementation.** Client-side JS, added to each `pre > code` block on page load.

### Line numbers

Not displayed by default. Line numbers add visual noise for short code samples (the majority use case in a knowledge site). If a future use case requires them (e.g., referencing specific lines in prose), they should be opt-in via a code fence attribute, not globally enabled.

### Syntax highlighting

Handled by Shiki at the rehype stage with the `github-light` theme (as configured in `astro.config.ts`). The theme's colors sit within the code block's `var(--color-bg-muted)` background and produce sufficient contrast in light mode. Dark mode will need a corresponding dark Shiki theme (e.g., `github-dark`) -- this is a known gap to address when the dark theme is implemented end-to-end.

---

## 3. Embedded images

Images are the most visually heterogeneous content type -- photographs, diagrams, screenshots, and pixel art all need to look appropriate. The framing is therefore minimal: just enough to separate the image from the prose without imposing a style that clashes with the image's own aesthetic.

### Visual treatment

- **Border.** `1px solid var(--color-border-subtle)`. A quiet frame that separates the image from the page surface without competing with the image content. Applied via a wrapping `<figure>` element.
- **Border radius.** `var(--radius-md)` on the `<figure>`. The `<img>` inside inherits the rounding via `overflow: hidden` on the figure.
- **Shadow.** None. Shadows imply elevation, which fights the "pinned to the page" scrapbook feel. The border is sufficient separation.
- **Background.** None on the figure. Images sit directly on the page surface. Transparent PNGs will show the page background through them, which is the intended behavior.
- **Max width.** `100%` of the content column. Images scale down to fit but never scale up beyond their natural dimensions (`max-width: min(100%, natural-width)`).
- **Centering.** Images narrower than the column are centered via `margin-inline: auto` on the `<figure>`.

### Caption

- **Element.** `<figcaption>` inside the `<figure>`.
- **Typography.** Monospace (`var(--font-mono)`), `var(--text-xs)` (0.8rem), `color: var(--color-text-muted)`. Monospace signals metadata/annotation, consistent with the site's typographic language.
- **Alignment.** Left-aligned, flush with the image's left edge.
- **Spacing.** `margin-top: 0.5rem` between the image and the caption. `padding-inline: 0.25rem` for a slight indent from the figure border.
- **Content.** Alt text is the accessibility fallback; the caption is the visible annotation. They may differ. Captions can include markdown-formatted text (links, emphasis).

### Click to expand

Not implemented in the initial design. The max 70ch column is sufficient for most images. If a future need arises for full-resolution viewing (e.g., detailed diagrams), implement it as a simple modal overlay using `var(--color-overlay)` as the backdrop, triggered by clicking the image. The image should scale to fit the viewport with padding, dismissible by click/Escape/backdrop. Do not implement a gallery/lightbox with navigation -- each image stands alone.

---

## 4. Embedded external content

Iframes, YouTube embeds, tweets, and other third-party content. These are foreign objects within the page -- the framing should acknowledge this by clearly demarcating the boundary between "our content" and "their content."

### Visual treatment

- **Wrapper.** A `<div class="embed-frame">` wrapping the `<iframe>` or embed markup.
- **Border.** `1px solid var(--color-border)`. Full-strength border (not subtle) because the boundary between the site and external content should be unambiguous.
- **Border radius.** `var(--radius-md)`.
- **Background.** `var(--color-bg-subtle)`. Visible as a mat around the embed if the iframe has padding or transparent areas, and visible during loading before the content renders.
- **Overflow.** `overflow: hidden` to clip any iframe content that bleeds past its bounds.

### Aspect ratio

- **Videos (YouTube, Vimeo).** `aspect-ratio: 16/9`. The iframe fills the wrapper's width with height determined by the ratio.
- **Tweets/social embeds.** No fixed aspect ratio. Height is determined by the embed's content. Set a `min-height: 200px` to prevent collapse during loading.
- **Generic iframes.** Author-specified height via inline style or attribute. No default aspect ratio.

### Loading state

- **Placeholder.** Before the iframe loads, the `embed-frame` wrapper shows a centered loading indicator: the text "Loading..." in monospace, `var(--text-xs)`, `var(--color-text-subtle)`, centered both horizontally and vertically. This is implemented via a `::before` pseudo-element on the wrapper that is hidden once the iframe fires its `load` event (by adding a `data-loaded` attribute to the wrapper via JS).
- **Lazy loading.** All iframes get `loading="lazy"` to defer off-screen embeds.

### Attribution line

- **Below the embed.** A small attribution line in monospace, `var(--text-2xs)`, `var(--color-text-subtle)`. Reads "Source: youtube.com" or "Source: twitter.com" (extracted from the iframe's `src` domain). Links to the original URL. This provides context about what the reader is looking at and where it comes from.
- **Styling.** Same pattern as image captions: monospace, muted, left-aligned, with `margin-top: 0.5rem`.

---

## 5. Expandable / collapsible sections (`<details>/<summary>`)

Progressive disclosure is a first-class content feature per L1-design-vision. The expandable section is a workhorse element -- it must be clearly interactive (the reader needs to know they can click) without being visually heavy.

### Collapsed state

- **Summary line.** The `<summary>` element.
  - **Typography.** Serif (`var(--font-serif)`), `var(--text-base)`, `font-weight: 600`. Semi-bold to signal interactivity and distinguish the summary from regular prose.
  - **Color.** `var(--color-text)`. Full contrast, not muted.
  - **Cursor.** `cursor: pointer`.
- **Indicator icon.** A small triangle/chevron (`0.5em` inline SVG or CSS border-trick) to the left of the summary text, pointing right (collapsed) or down (expanded). Color: `var(--color-text-subtle)`. The icon rotates smoothly between states (see animation below).
- **Border.** `1px solid var(--color-border-subtle)` on the bottom edge only. A single underline rule that signals "there is more below this line." No surrounding box in collapsed state -- the element should feel like a heading with a disclosure affordance, not a framed container.
- **Padding.** `0.5rem 0` on the summary. Enough to create a comfortable click target (minimum 44px touch target height) without excess vertical space.

### Expanded state

- **Content area.** The revealed content below the summary.
  - **Border.** `1px solid var(--color-border-subtle)` on left, bottom, and right edges (the summary's bottom border becomes the top edge of the content area, completing the frame). This creates a bordered container that only appears when content is visible -- the framing is progressive, matching the disclosure.
  - **Background.** None. The content sits on the page surface. Adding a background tint would create a nested surface hierarchy that conflicts with callouts and code blocks living inside details elements.
  - **Padding.** `0.75rem 1rem` inside the content area.
- **Summary indicator.** The triangle rotates to point downward.

### Animation

- **Indicator rotation.** `transform: rotate(0deg)` (collapsed) to `rotate(90deg)` (expanded). Duration: `var(--transition-duration-normal)` (100ms). Easing: `var(--ease-out)`.
- **Content reveal.** No height animation. The content appears instantly when the `<details>` element opens. Height animations on `<details>` are unreliable across browsers and require JS measurement of content height, which conflicts with the performance constraint that layout reads should not happen during interaction. The instant reveal is also consistent with L1-design-vision's "minimal and functional" motion philosophy: "only animate what aids comprehension." The indicator rotation already communicates the state change; animating the content height would be decorative.

### Nesting

Details elements may be nested. Inner details elements receive no additional indentation or border treatment -- they inherit the same styling. The visual hierarchy comes from the summary text itself (authors choose heading levels or emphasis to indicate nesting depth). Automated visual nesting (increasing indent, changing border color) would add complexity without aiding comprehension.

---

## 6. Tables

Data tables in a prose context. The treatment should make tables scannable without making them look like a spreadsheet application. Tables are reference material pinned into the narrative -- like a data card from a lab notebook.

### Visual treatment

- **Border.** No outer border on the `<table>`. The table's structure (headers, row dividers) provides sufficient visual containment. An outer border would over-frame it.
- **Border radius.** Not applicable (no outer border). Header row corners are not rounded.
- **Width.** `width: 100%` of the content column. Tables expand to fill available width. For narrow tables, cells expand proportionally.

### Header row

- **Background.** `var(--color-bg-subtle)`. The same tint as callout backgrounds, creating a visual link between "metadata surfaces" across the site.
- **Typography.** Monospace (`var(--font-mono)`), `var(--text-sm)`, `font-weight: 600`. The monospace face signals structured/tabular data, consistent with how metadata is rendered elsewhere.
- **Text transform.** None. Headers use the author's original casing.
- **Border.** `2px solid var(--color-border)` on the bottom edge of the header row. Heavier than body row dividers to clearly separate the header from data.

### Body rows

- **Typography.** Serif at `var(--text-base)` for text content. Monospace for cells containing code, dates, or numerical data (determined by content, not automated).
- **Row dividers.** `1px solid var(--color-border-subtle)` between rows.
- **Row striping.** None. Alternating row colors add visual noise to small tables (the common case on a knowledge site). For large tables where tracking rows becomes difficult, zebra striping should be an opt-in class rather than a default.
- **Cell padding.** `0.5rem 0.75rem`. Comfortable density -- not cramped, not wasteful.

### Horizontal scroll on overflow

- **Wrapper.** Tables are wrapped in a `<div class="table-scroll">` with `overflow-x: auto`.
- **Fade indicator.** When the table overflows, a subtle gradient fade (`linear-gradient` from transparent to `var(--color-bg)`) appears on the right edge of the wrapper, hinting that more content is scrollable. The fade is `2rem` wide and is implemented as a `::after` pseudo-element. It disappears when the user has scrolled to the right end (toggled via JS with an `IntersectionObserver` on a sentinel element at the table's right edge, or via `scroll` event checking `scrollLeft + clientWidth >= scrollWidth`).
- **Scrollbar.** Native, no custom styling. Consistent with code block overflow behavior.

---

## 7. Block quotes

Cited text from external sources. Block quotes should feel like a physical excerpt pinned to the page -- a clipping from another document. The treatment is deliberately close to callouts (they share the left-border pattern) but simpler, without the title bar machinery.

### Visual treatment

- **Left border.** `3px solid var(--color-border)`. The same width as callout left borders but in the neutral border color, not a semantic accent. This creates a visual kinship with callouts (both are "set-apart content with a left stripe") while the color difference signals that blockquotes are passive citations, not active system messages.
- **Background.** None. Blockquotes sit on the page surface. This distinguishes them from callouts (which have a `var(--color-bg-subtle)` background). The difference: callouts are the site speaking to the reader; blockquotes are other sources speaking through the site.
- **Padding.** `0 0 0 1rem`. Left padding only, creating an indented column that flows from the border.
- **Border radius.** None. The left border runs the full height as a clean vertical line, not rounded. This gives blockquotes a more austere, document-excerpt feel compared to the softly-rounded callouts.

### Typography

- **Font.** Serif at `var(--text-base)`, same as prose. No italic by default -- the left border already signals the shift in voice. Italic is reserved for emphasis within the quote.
- **Color.** `var(--color-text-muted)`. Slightly dimmed compared to the main prose, reinforcing that this is quoted/secondary material.

### Citation

- **Element.** A `<cite>` element or trailing `<footer>` inside the `<blockquote>`.
- **Typography.** Monospace (`var(--font-mono)`), `var(--text-xs)`, `color: var(--color-text-subtle)`. The monospace face signals attribution/metadata.
- **Prefix.** An em dash before the citation text: "-- Author, Source". The em dash is part of the content, not generated by CSS (to keep the citation copyable/accessible).
- **Spacing.** `margin-top: 0.5rem` above the citation line.

### Nesting

Nested blockquotes (rare) receive additional left border lines. Each nesting level adds another `3px solid var(--color-border)` border with `0.75rem` of padding between borders. This creates a visual "quote depth" that mirrors the semantic nesting.

---

## 8. TODO markers

TODO markers are work-in-progress signals -- they tell the reader (and the author) that content is incomplete. Their treatment should be noticeable but not alarming. They are annotations on the writing process, not content for the reader.

### Visual treatment

- **Display.** Inline `<span>`, not block-level. TODOs appear within the prose flow, not as separate blocks.
- **Background.** `var(--color-highlight-subtle)`. The same tint used for sidenote highlights, tying TODO markers into the site's "annotation" visual family.
- **Border.** `1px dashed var(--color-status-draft)` (warm amber). The dashed style signals "incomplete/in-progress." Amber is the maturity color for draft content -- the strongest semantic match for "work to be done."
- **Border radius.** `var(--radius-sm)` (2px). Tighter than block elements because TODOs are inline.
- **Padding.** `0.125rem 0.375rem`. Minimal, just enough to create a visible background region around the text.

### TODO label

- **Typography.** Monospace (`var(--font-mono)`), `var(--text-2xs)` (0.75rem), `font-weight: 700`, `text-transform: uppercase`. The bold monospace "TODO" badge at the smallest text size -- prominent enough to spot when scanning, small enough not to dominate the reading flow.
- **Color.** `var(--color-status-draft)` (warm amber). Same as the dashed border.
- **Spacing.** `margin-right: 0.25rem` between the label and the following description text (if any).

### Description text

- **Typography.** Inherits the surrounding prose style (serif, `var(--text-base)`). The description is content, not metadata.
- **Color.** `var(--color-text)`. Full contrast.

---

## Relationship to the scrapbook aesthetic

The eight treatments above create variety through four controlled axes:

| Axis | How it varies | Examples |
| --- | --- | --- |
| **Background** | Three levels: none (blockquotes, details, images), subtle (callouts, tables header, embeds), muted (code) | Code stands out most; blockquotes blend in |
| **Border pattern** | Left-only accent (callouts, blockquotes), full perimeter (code, embeds, expanded details), none (tables, collapsed details) | Each pattern signals a different relationship to the prose |
| **Typography switch** | Prose stays serif; metadata/labels/headers switch to monospace | The serif/mono contrast is the primary texture driver |
| **Color saturation** | Neutral (blockquotes, details), accent (callout types), status (TODOs) | Color is used sparingly and only for semantic signaling |

The variety is bounded: there are exactly four background levels, three border patterns, two typefaces, and a small set of semantic colors. This is enough for collage texture without becoming chaotic.

---

## CSS token usage summary

Every visual property maps to an existing design token. No raw color values, no raw font stacks, no arbitrary pixel sizes outside the defined scale.

| Property | Token(s) used |
| --- | --- |
| Background (none) | transparent |
| Background (subtle) | `var(--color-bg-subtle)` |
| Background (muted) | `var(--color-bg-muted)` |
| Background (highlight) | `var(--color-highlight-subtle)` |
| Full-strength border | `var(--color-border)` |
| Subtle border | `var(--color-border-subtle)` |
| Accent borders (callouts) | `var(--color-accent)`, `var(--color-status-stable)`, `var(--color-status-draft)`, `var(--color-error)` |
| TODO border/label | `var(--color-status-draft)` |
| Prose font | `var(--font-serif)` |
| Metadata/label font | `var(--font-mono)` |
| Body text size | `var(--text-base)` |
| Secondary text size | `var(--text-sm)` |
| Caption/meta text size | `var(--text-xs)` |
| Smallest label size | `var(--text-2xs)` |
| Block border radius | `var(--radius-md)` |
| Inline border radius | `var(--radius-sm)` |
| Transition timing | `var(--transition-duration-normal)`, `var(--ease-out)` |

---

## Assertions

| ID | Sev. | Assertion |
| --- | --- | --- |
| vertical-rhythm | MUST | All block-level embedded elements have `margin-block: 1.5rem` unless adjacent to a same-type sibling |
| column-width | MUST | No embedded element renders wider than `var(--width-content)` |
| border-radius | MUST | All framed embedded elements use `var(--radius-md)` or `var(--radius-sm)` (inline elements) |
| callout-left-border | MUST | Callouts display a 3px left border in their type-specific color |
| callout-icon-restraint | SHOULD | Callout icons, when present, are monochrome inline SVGs and remain secondary to title text and border color |
| code-bg-distinct | MUST | Code blocks use `var(--color-bg-muted)`, visually distinct from callout `var(--color-bg-subtle)` |
| code-overflow-scroll | MUST | Code blocks with horizontal overflow are scrollable, not clipped or wrapped |
| code-copy-hover | SHOULD | Copy button appears on hover over the code block |
| image-no-upscale | MUST | Images do not scale beyond their natural dimensions |
| image-centered | SHOULD | Images narrower than the content column are horizontally centered |
| embed-loading-state | MUST | External embeds show a loading indicator before the iframe content renders |
| embed-lazy | MUST | All iframes use `loading="lazy"` |
| details-indicator | MUST | Collapsed/expanded state is indicated by a rotating triangle icon |
| details-no-height-anim | MUST | Content reveal on details open is instant, not height-animated |
| details-touch-target | MUST | Summary element provides at least 44px touch target height |
| table-header-mono | MUST | Table header cells use monospace font |
| table-header-bg | MUST | Table header row has `var(--color-bg-subtle)` background |
| table-overflow-scroll | MUST | Tables wider than the content column are horizontally scrollable |
| table-overflow-fade | SHOULD | Overflowing tables show a right-edge fade hint |
| blockquote-no-bg | MUST | Blockquotes have no background color (transparent) |
| blockquote-left-border | MUST | Blockquotes have a 3px left border in `var(--color-border)` |
| blockquote-muted-text | MUST | Blockquote text uses `var(--color-text-muted)` |
| todo-inline | MUST | TODO markers are inline spans, not block-level elements |
| todo-dashed-border | MUST | TODO markers have a dashed border in `var(--color-status-draft)` |
| no-raw-values | MUST | All color, font, size, and radius properties reference design tokens, not raw values |

## Key files

- `src/styles/components.css` -- callout styles (`[data-callout-type]`), TODO styles (`.todo-marker`, `.todo-label`), table scroll wrapper, embed frame
- `src/styles/base.css` -- base element styles for `<blockquote>`, `<table>`, `<figure>`, `<figcaption>`, `<details>`, `<summary>`, `<pre>`, `<code>`
- `src/styles/prose.css` -- prose-specific overrides for embedded elements within `.prose`
- `src/lib/remark-todo.ts` -- TODO marker plugin (generates `.todo-marker` and `.todo-label` spans)
- `astro.config.ts` -- Shiki code highlighting configuration, remark plugin registration

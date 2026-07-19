---
scope: L0
summary: "UI components, layout system, and DSRD design tokens"
modified: 2026-05-24
reviewed: 2026-05-24

depends:
  - path: README
dependents:
  - path: src/content/pages/theor-net-dsrd
  - path: docs/L1-design-vision
  - path: docs/L1-styles
  - path: docs/L1-scripts
  - path: docs/L1-routing
  - path: docs/L2-header-nav
---

# UI and Design

## Design philosophy

Content-first, information-dense, textured. Scrapbook/collage aesthetic with coherent structural grid — different content types have visually distinct treatments held together by consistent typography and spatial rhythm. Texture over color: visual richness comes from layered grain, varied content framing, and typographic contrast (serif prose + monospace metadata), not from saturated palettes. Neutral/monochrome base with color used sparingly as semantic signal. Fast transitions (under 150ms), minimal functional animation only. Dual light/dark themes with manual toggle.

Typography: characterful serif for prose, monospace for metadata/code/relations. No system-font defaults as primary typeface.

See `docs/L1-design-vision.md` for the full aesthetic direction. The DSRD page (`src/content/pages/theor-net-dsrd.mdx`) contains a standalone reference HTML file that may lag behind `src/styles/global.css`, which is the source of truth.

Inspirations: Gwern (primary), Andy Matuschak, Edward Tufte, diegetic interfaces (conceptual).

## Font-size scale

All non-heading font sizes use tokens defined in `@theme` (`src/styles/global.css`). Do not introduce new raw `rem` values for font-size; use a token instead.

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-base` | 1rem (16px) | Body text, search input |
| `--text-sm` | 0.875rem (14px) | Nav links, pre blocks, callout titles, secondary text |
| `--text-xs` | 0.8rem (12.8px) | Metadata, breadcrumbs, TOC, footnotes, filters |
| `--text-2xs` | 0.75rem (12px) | Panel titles, badges, keyboard shortcuts |

Relative `em` units are used for elements that should scale with their parent context (inline `code` at 0.9em, heading link icons at 0.8em, footnote superscripts at 0.85em). These are intentionally not tokenized.

## Layout

Three-column grid (`page-grid`): left sidebar (TOC), content area (max `70ch`), right sidebar (Tufte-style sidenotes). Collapses to single column below 1024px. Ambient status bar header showing reading context (progress, read time, freshness, content maturity).

The page template lives in `src/layouts/page/Page.astro`, rendered by the catch-all route `src/pages/[...slug].astro`.

## Components

| Component | Purpose |
| --------- | ------- |
| `Header.astro` | Sticky nav bar |
| `Breadcrumb.astro` | Hierarchy path |
| `TOC.astro` | Table of contents with scroll spy (`toc-scrollspy.ts`) |
| `TopRelations.astro` | Display page relations (`part_of`, `has_part`, `is`, `has`, taxonomy, aboutness, authorship, sequence, refs, and legacy hierarchy) |
| `RelationsGraph.astro` | D3 force-directed graph of all pages |
| `Search.astro` | Pagefind search integration |
| `content/Footnote.astro` / `Footnotes.astro` | Inline footnotes with popup behavior (`footnotes.ts`) |
| `content/ContentTable.astro` | Renders page listings from MDX pages |
| `content/LinkCards.astro` | Renders README-style external link cards from MDX pages |
| `Metadata.astro` | Page metadata display |
| `Head.astro` | HTML head with meta tags |

## Client-side scripts

- `src/scripts/popups.ts` -- hover popups (uses `/popup-index.json` endpoint)
- `src/scripts/footnotes.ts` -- footnote interaction
- `src/scripts/toc-scrollspy.ts` -- highlights current section in TOC
- `src/scripts/graph/` -- D3 graph rendering and styling

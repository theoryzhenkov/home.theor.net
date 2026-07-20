---
scope: L2
summary: "Header component: non-sticky scroll-reveal bar with site identity, quicklinks, search, and theme toggle"
modified: 2026-07-19
reviewed: 2026-07-19
depends:
  - path: docs/L1-design-vision
    section: "Header: scroll-reveal navigation frame"
  - path: docs/L0-ui
    section: "Components"
dependents:
  - path: docs/L2-components
---

# Header and Navigation

The header is a non-sticky navigation bar that scrolls with the page, then reveals on scroll-up. It contains site identity, quicklinks, search, and theme toggle. No article metadata, no reading progress bar, no mode-shifting between page types.

## Design decisions

### Why non-sticky?

A sticky header permanently claims 44px of viewport on every page. On a reading-focused site with long-form content, that vertical space belongs to the prose. Gwern and similar dense-reading sites use no persistent chrome at all. The header should be present when you arrive (orientation) and accessible when you reach for it (scroll up), but invisible while reading.

### Why scroll-direction reveal?

Removing the header entirely (pure Gwern model) makes search and navigation inaccessible without scrolling to the top — painful on long articles, especially on mobile where there's no keyboard shortcut. Scroll-up reveal solves this: reverse your scroll direction and the header slides into view. The gesture maps naturally to the intent ("I want to go somewhere else").

This behavior is the same on all viewports. Desktop and mobile share one interaction model. The TOC sidebar (desktop-only) stays focused on its job — table of contents — and does not absorb navigation responsibilities.

### Why a distinct background?

The previous header used the same background as the page (`--color-bg`), making it visually indistinct — a thin border was the only separator. A perceptibly different, textured background makes the header read as a frame around the page content, gives it visual weight proportional to its role, and prevents content from showing through when it overlays as a fixed element on scroll-up. The header is the one place texture is applied as grain (see Visual treatment below): unlike the reading column, it carries no long-form text, so a fine grain does not cost legibility. This is the "texture on chrome, never over prose" rule from `L1-styles`.

### Why no reading progress bar?

The TOC already tracks per-section read state with scroll-spy (active / read / unread states) and shows estimated time per section. A 2px progress bar in the header duplicates this information in a less useful form. Removed.

### Why no mode-shifting?

The previous spec defined article mode and listing mode, where the header adapted its content by page type. In practice, both modes had the same layout (nav links left, empty center, actions right). The distinction added conceptual complexity without visible benefit. The header is now one thing on every page.

## Layout

A single flex row, 44px tall, full width.

```
[  LEFT: identity + quicklinks  |  spacer  |  RIGHT: search + theme  ]
```

### Left zone

Contains, in order:

1. **Site mark** — `theor.net` in monospace, links to `/`. The site's identity anchor. Slightly bolder weight than the nav links to establish hierarchy.
2. **Separator** — `/` character in monospace, dim color, not interactive.
3. **Quicklinks** — inline text links: `index`, `projects`, `blog`, `about`. Monospace, `--text-xs`, separated by a small gap. The link matching the current section gets accent color. These are always visible on desktop; on mobile they move to a dropdown.

### Right zone

Contains, right-aligned:

1. **Search trigger** — magnifying glass icon, 16x16. Opens the Pagefind search overlay. Also responds to `Cmd+K` / `Ctrl+K`.
2. **Theme toggle** — sun/moon icon, 16x16. Toggles light/dark theme.

### Spacer

The center space is a flex spacer (`flex: 1`). It contains nothing. Its only purpose is to push the left and right zones apart.

## Scroll-reveal behavior

### States

The header has three visibility states:

| State | Condition | Position | Visible |
| ----- | --------- | -------- | ------- |
| **Docked** | Page scrolled to top (scrollY near 0) | `position: static` in document flow | Yes |
| **Hidden** | Scrolling down, past the header's height | Off-screen above viewport | No |
| **Revealed** | Scrolling up (direction reversal) | `position: fixed; top: 0` | Yes, overlays content |

### Transitions

- **Docked -> Hidden**: no animation, header scrolls out naturally with the page.
- **Hidden -> Revealed**: `transform: translateY(-100%) -> translateY(0)` over 150ms ease-out.
- **Revealed -> Hidden**: `transform: translateY(0) -> translateY(-100%)` over 120ms ease-in.
- **Revealed -> Docked**: when scroll position returns to top, header transitions from fixed to static. No visual jump — the position change should be seamless.

### Scroll detection

Track `window.scrollY` on scroll events (throttled via `requestAnimationFrame`). Compare current position to previous to determine direction. A small dead zone (~5px) prevents jitter from elastic scrolling or trackpad inertia.

The reveal triggers when the user scrolls up by more than the dead zone threshold. It hides when the user scrolls down by more than the threshold.

### Body offset

When the header is in **docked** state, it occupies space in document flow normally. When it transitions to **revealed** (fixed), the page content does not jump because the header is already scrolled out of view.

CSS `scroll-padding-top` should account for the header height only when the header might be visible (for anchor link scrolling).

## Navigation destinations

Six links, always in this order:

| Label | Destination | Notes |
| ----- | ----------- | ----- |
| `index` | `/` | Main entry listing |
| `projects` | `/projects/` | Project listing |
| `blog` | `/blog/` | Blog listing |
| `notes` | `/notes/` | Notes feed |
| `knowledge` | `/knowledge/` | Knowledge pages listing |
| `links` | `/links` | Link collection |

Labels are lowercase monospace. If a destination doesn't exist yet, omit the link rather than pointing to a placeholder.

## Mobile behavior (< 768px)

On narrow viewports, the quicklinks don't fit inline. They move to a revealed navigation panel below the header bar.

### Bar layout on mobile

```
[  LEFT: site mark  |  spacer  |  RIGHT: nav trigger + search + theme  ]
```

The **nav trigger** is a small text-first control (the word `nav` in `--text-xs` monospace, or a minimal icon if needed). It should not read like a pill button. Tapping it toggles the revealed panel.

### Revealed panel

Sits directly below the header bar as a flat sheet. Contains the nav links stacked vertically with 44px touch targets. Slides open with a 120ms CSS transition. Closes on: outside tap, Escape key, or navigation.

The panel is part of the header element, so when the header is hidden (scrolled away), the panel is hidden too. When the header is revealed on scroll-up, the nav trigger is accessible and can open the panel.

### Scroll-reveal on mobile

Same behavior as desktop. Scroll up reveals the header; scroll down hides it. No differences in thresholds or animation timing.

## Visual treatment

### Background

A distinct, textured surface. The base is a muted mix (`color-mix(--color-bg-muted, --color-bg)`), perceptibly different from `--color-bg`, overlaid with `--header-texture`: a symmetric vertical sheen (mean-neutral, so it adds dimensionality without lightening the bar) plus fine, single-octave desaturated grain. This reads as a distinct material from the flat reading surface. The difference should be subtle but unambiguous — the header should be recognizable as a separate zone without needing a border. Both `--header-texture` and the base mix are theme-specific.

A 1px bottom border in `--color-border` reinforces the separation. On scroll-reveal, a subtle box-shadow (1-2px, low opacity) can appear to lift the header above the content it overlays.

The mobile reveal panel follows the same interaction language as other site overlays: thin border, restrained radius, flat background, and stacked row links rather than chip controls.

### Typography

All header text uses monospace (`--font-mono`). The header is system chrome, not content. Site mark at `--text-sm` with `font-weight: 500`. Nav links at `--text-xs` with regular weight.

### Interaction states

| Element | Default | Hover | Active/Current | Focus |
| ------- | ------- | ----- | -------------- | ----- |
| Site mark | `--color-text` | `--color-text` | n/a | Outline ring |
| Nav link | `--color-text-subtle` | `--color-text` | `--color-accent` | Outline ring |
| Search icon | `--color-text-subtle` | `--color-text` | n/a | Outline ring |
| Theme icon | `--color-text-subtle` | `--color-text` | n/a | Outline ring |

All hover/focus transitions: 120ms ease.

## Keyboard navigation

- `Tab` cycles through interactive elements: site mark, each nav link, search trigger, theme toggle.
- `Cmd+K` / `Ctrl+K` opens search from anywhere on the page.
- `Escape` closes any open dropdown or search overlay.
- Nav links are standard `<a>` elements, functional without JavaScript.

## Assertions

| ID | Sev. | Assertion |
| -- | ---- | --------- |
| bar-height | MUST | Header bar is exactly 44px tall |
| non-sticky | MUST | Header uses `position: static` at scroll top, not `position: sticky` |
| scroll-reveal | MUST | Header appears as fixed overlay when user scrolls up, hides when scrolling down |
| reveal-all-viewports | MUST | Scroll-reveal behavior is identical on desktop and mobile viewports |
| no-progress-bar | MUST | Header contains no reading progress indicator |
| no-article-metadata | MUST | Header contains no article-specific information (maturity, dates, read time) |
| uniform-layout | MUST | Header layout is the same on article pages and listing pages |
| nav-reachable | MUST | All nav destinations are reachable within two interactions (scroll-up + click) on every page |
| mobile-dropdown | MUST | Nav links move to a revealed panel below 768px viewport width |
| keyboard-accessible | MUST | All header interactive elements are reachable via Tab and operable via Enter |
| distinct-background | SHOULD | Header background is visually distinct from the page surface color |
| header-texture-chrome | MAY | The header may carry grain/sheen texture (`--header-texture`); it is the only surface where grain is applied, as it holds no long-form text |
| no-decorative-animation | SHOULD | Header contains no decorative animation; only functional transitions under 150ms |
| monospace-only | SHOULD | All header text uses the monospace typeface |

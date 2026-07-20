---
scope: L3
summary: "Footnotes layout engine: sidenote positioning, mode switching, and lifecycle"
modified: 2026-05-24
reviewed: 2026-05-24
depends:
  - path: docs/L1-scripts
  - path: docs/L2-components
  - path: docs/L2-reading-experience
---

# Footnotes Layout Engine

The footnotes system renders footnote content in two different layouts depending on viewport width. Above 1024px, footnotes appear as sidenotes in the right margin beside their reference. At 1024px and below, the sidenote spans are hidden via CSS and their content is cloned into an ordered list in the page footer.

## HTML Structure

Each footnote produces a paired `<sup>` + `<span>` from `Footnote.astro`:

```html
<sup id="fnref-{id}" class="footnote-ref">
  <a href="#fn-{id}" class="footnote-number"></a>
</sup>
<span class="sidenote" id="fn-{id}" data-footnote-id="{id}" role="note">
  <a href="#fnref-{id}" class="footnote-number"></a>
  <!-- slot content -->
</span>
```

The `.footnote-number` elements render their visible label via a CSS counter (`sidenote-counter`), incremented by `.footnote-ref`. Both the reference and the sidenote carry a `.footnote-number` link pointing back to the other, so clicking works in both directions.

The footer container lives in `Footnotes.astro`:

```html
<section class="aside-panel" id="footnotes" data-empty="true">
  <h2 class="aside-panel-title">Footnotes</h2>
  <ol class="aside-panel-list footnote-list"></ol>
</section>
```

It starts hidden (`data-empty="true"`) and only becomes visible when the layout engine populates it in narrow mode.

## Wide Mode Positioning

`layoutSidenotes()` runs on viewports wider than 1024px. It iterates over every `.sidenote` inside `.prose` in DOM order and sets each one's `top` style.

The algorithm:

1. Track `prevBottom = 0` (the bottom edge of the last positioned sidenote, in pixels relative to `.prose`).
2. For each sidenote, find its corresponding `<sup>` by ID (`fnref-{id}`). The desired `top` is `ref.offsetTop` -- the vertical position of the superscript reference within `.prose`.
3. If `top < prevBottom`, push the sidenote down to `prevBottom`. This prevents overlap when multiple footnotes appear close together.
4. Set `note.style.top = top`. Update `prevBottom = top + note.offsetHeight + SIDENOTE_GAP` (8px gap between stacked sidenotes).
5. After all sidenotes are placed, if `prevBottom` exceeds `.prose.scrollHeight`, add extra `paddingBottom` to `.prose` so the container accommodates the overflow.

The sidenotes are `position: absolute` within the relatively-positioned `.prose` container, offset to the right via `left: calc(100% + 3rem)` in CSS.

## Narrow Mode Population

`populateFootnotesList()` runs at 1024px and below. CSS already hides `.sidenote` elements via `display: none` at this breakpoint. The function clones each sidenote's child nodes (including the `.footnote-number` back-link) into `<li>` elements appended to the `#footnotes` ordered list. Each `<li>` gets the ID `fn-narrow-{id}` and class `footnote-item`.

If no sidenotes exist on the page, the section stays hidden via `data-empty="true"`.

## Mode Switching and Resize

The `layout()` function checks `isWide()` and runs the appropriate mode. When switching from wide to narrow, it clears inline `top` styles and `paddingBottom` from `.prose`. When switching from narrow to wide, it sets `data-empty="true"` on the footnotes section to hide it.

Window resize is debounced at 100ms. On resize:

- If the mode changed (crossed the 1024px threshold), run `layout()` to switch modes.
- If still in wide mode, re-run `layoutSidenotes()` alone to account for content reflow that changes element positions.
- If still in narrow mode, do nothing -- the cloned list doesn't depend on layout measurements.

## Click Behavior

In wide mode, clicking a `.footnote-number` inside `.footnote-ref` prevents the default anchor navigation. Instead it scrolls the corresponding `.sidenote` into view with `behavior: 'smooth'` and `block: 'nearest'`, then applies the `sidenote-highlight` class. This triggers a background color transition that lasts 1.5 seconds before the class is removed.

In narrow mode, the click handler returns early and lets the browser's default anchor behavior scroll to the `#fn-{id}` element in the footer list.

## Astro Page Transition Lifecycle

The engine hooks into three events to handle both initial load and Astro's client-side navigation:

- `DOMContentLoaded` (or immediate call if already past `loading` state): runs `init()` on first page load.
- `astro:page-load`: runs `init()` after each Astro page transition completes.
- `astro:before-preparation`: runs `cleanup()` once before a transition starts, removing the resize listener and clearing any pending debounce timer.

`init()` resets `lastWide` to `null` (forcing a fresh mode evaluation), calls `layout()`, attaches click handlers, and adds the resize listener.

## Edge Cases

**Many footnotes close together**: The overlap prevention loop pushes each sidenote below the previous one's bottom edge plus the 8px gap. With enough clustered footnotes, the sidenote column can extend well past the prose content. The engine compensates by adding `paddingBottom` to `.prose`, but a page with many tightly-packed footnotes will have visible vertical drift between references and their sidenotes.

**Prose overflow**: If the last sidenote's bottom exceeds `.prose.scrollHeight`, the engine adds padding. When it doesn't overflow, any previously added padding is cleared (set to empty string).

**Transition cleanup**: `cleanup()` uses `{ once: true }` on `astro:before-preparation`, so it fires at most once per navigation. Each `init()` call re-registers it.

**Missing references**: If a sidenote's `data-footnote-id` doesn't match any `fnref-{id}` element, the fallback `top` is `prevBottom` (the bottom of the previous sidenote, or 0 for the first).

## Key Files

- `src/scripts/footnotes.ts` -- layout engine (positioning, mode switching, lifecycle)
- `src/components/content/Footnote.astro` -- per-footnote HTML structure (sup + sidenote pair), imported by MDX pages
- `src/components/Footnotes.astro` -- footer container for narrow-mode list
- `src/styles/components.css` -- sidenote positioning CSS, highlight animation, footnote counter, narrow-mode styles
- `src/styles/prose.css` -- `.prose` container (position: relative)

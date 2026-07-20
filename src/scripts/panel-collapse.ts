// Collapsible margin panels (TOC "CONTENTS", metadata "METADATA").
// Each [data-collapsible] panel has a [data-panel-toggle] eye button. Toggling
// flips data-collapsed, swaps the eye/eye-off icon, persists per-panel state,
// and nudges the sidenote engine (its reserved band changes when metadata
// collapses) via a resize event.
//
// The TOC is width: fit-content and right-anchored in the gutter, so hiding its
// items would shrink the box and shift the header. To keep the header still, we
// freeze the panel's resolved (expanded) width while collapsed. On narrow
// viewports the inline width is neutralised by CSS (width: auto !important).
export {};

const STORAGE_PREFIX = 'panel-collapsed:';
const BREAKPOINT = 1024;

function isWide(): boolean {
  return window.innerWidth > BREAKPOINT;
}

function panelLabel(panel: HTMLElement): string {
  return panel.dataset.panel ?? 'panel';
}

function setIconState(panel: HTMLElement, collapsed: boolean) {
  panel.dataset.collapsed = collapsed ? 'true' : 'false';
  const btn = panel.querySelector<HTMLButtonElement>('[data-panel-toggle]');
  if (!btn) return;
  const name = panelLabel(panel);
  btn.setAttribute('aria-expanded', String(!collapsed));
  const action = collapsed ? `Show ${name}` : `Hide ${name}`;
  btn.setAttribute('aria-label', action);
  btn.setAttribute('title', action);
}

// Freeze the current (expanded) width so collapsing doesn't reflow the header.
function freezeWidth(panel: HTMLElement) {
  if (isWide()) panel.style.width = `${panel.offsetWidth}px`;
}

function clearWidth(panel: HTMLElement) {
  panel.style.width = '';
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-collapsible]').forEach((panel) => {
    const key = STORAGE_PREFIX + panelLabel(panel);

    let stored = false;
    try {
      stored = localStorage.getItem(key) === 'true';
    } catch {
      /* private mode / disabled storage — default to expanded */
    }

    // Measure while expanded so the frozen width matches the resolved width even
    // when the panel loads already collapsed.
    setIconState(panel, false);
    clearWidth(panel);
    if (stored) {
      freezeWidth(panel);
      setIconState(panel, true);
    }

    const btn = panel.querySelector<HTMLButtonElement>('[data-panel-toggle]');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const collapsing = panel.dataset.collapsed !== 'true';
      if (collapsing) {
        freezeWidth(panel); // capture resolved width before hiding the body
      } else {
        clearWidth(panel);
      }
      setIconState(panel, collapsing);
      try {
        localStorage.setItem(key, String(collapsing));
      } catch {
        /* ignore */
      }
      // Sidenote layout reserves the metadata panel's band; relayout on change.
      window.dispatchEvent(new Event('resize'));
    });
  });
}

document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

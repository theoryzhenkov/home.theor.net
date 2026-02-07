// Footnote layout engine
// Wide (>1024px): absolute-position .sidenote elements in the right margin of .prose
// Narrow (<=1024px): clone sidenote content into the #footnotes footer list

const BREAKPOINT = 1024;
const SIDENOTE_GAP = 8; // px between stacked sidenotes
const RESIZE_DEBOUNCE = 100; // ms

function isWide(): boolean {
  return window.innerWidth > BREAKPOINT;
}

// ── Wide mode: position sidenotes alongside their reference ──

function layoutSidenotes() {
  const prose = document.querySelector('.prose') as HTMLElement | null;
  if (!prose) return;

  const sidenotes = prose.querySelectorAll<HTMLElement>('.sidenote');
  if (sidenotes.length === 0) return;

  let prevBottom = 0;

  sidenotes.forEach((note) => {
    const id = note.dataset.footnoteId;
    const ref = id ? document.getElementById(`fnref-${id}`) : null;

    // Desired top = ref's offsetTop relative to .prose
    let top = ref ? ref.offsetTop : prevBottom;

    // Push down if overlapping previous sidenote
    if (top < prevBottom) {
      top = prevBottom;
    }

    note.style.top = `${top}px`;
    prevBottom = top + note.offsetHeight + SIDENOTE_GAP;
  });

  // Extend .prose padding if last sidenote overflows
  const proseHeight = prose.scrollHeight;
  if (prevBottom > proseHeight) {
    prose.style.paddingBottom = `${prevBottom - proseHeight + SIDENOTE_GAP}px`;
  } else {
    prose.style.paddingBottom = '';
  }
}

// ── Narrow mode: populate the #footnotes footer ──

function populateFootnotesList() {
  const section = document.getElementById('footnotes');
  const list = section?.querySelector('.aside-panel-list') as HTMLOListElement | null;
  if (!section || !list) return;

  const sidenotes = document.querySelectorAll<HTMLElement>('.sidenote[data-footnote-id]');
  if (sidenotes.length === 0) {
    section.dataset.empty = 'true';
    return;
  }

  list.innerHTML = '';

  sidenotes.forEach((note) => {
    const id = note.dataset.footnoteId;
    const li = document.createElement('li');
    li.id = `fn-narrow-${id}`;
    li.className = 'footnote-item';

    // Clone all content including the .footnote-number link (matches desktop structure)
    Array.from(note.childNodes).forEach((child) => {
      li.appendChild(child.cloneNode(true));
    });

    list.appendChild(li);
  });

  section.dataset.empty = 'false';
}

// ── Click handler: highlight sidenote on ref click ──

function attachClickHandlers() {
  document.querySelectorAll<HTMLElement>('.footnote-ref .footnote-number').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!isWide()) return; // on narrow, let default anchor behavior work

      e.preventDefault();
      const href = link.getAttribute('href');
      if (!href) return;

      const sidenote = document.querySelector<HTMLElement>(href);
      if (!sidenote) return;

      // Scroll into view if off-screen
      sidenote.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Highlight pulse
      sidenote.classList.add('sidenote-highlight');
      setTimeout(() => sidenote.classList.remove('sidenote-highlight'), 1500);
    });
  });
}

// ── Orchestration ──

let lastWide: boolean | null = null;

function layout() {
  const wide = isWide();
  const prose = document.querySelector('.prose') as HTMLElement | null;

  if (wide) {
    // Clean up narrow-mode artefacts
    const section = document.getElementById('footnotes');
    if (section) section.dataset.empty = 'true';

    layoutSidenotes();
  } else {
    // Clean up wide-mode inline styles
    if (prose) prose.style.paddingBottom = '';
    document.querySelectorAll<HTMLElement>('.sidenote').forEach((n) => {
      n.style.top = '';
    });

    populateFootnotesList();
  }

  lastWide = wide;
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;

function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const wide = isWide();
    if (wide !== lastWide) {
      layout();
    } else if (wide) {
      // Relayout sidenotes on resize within wide mode (content reflow)
      layoutSidenotes();
    }
  }, RESIZE_DEBOUNCE);
}

function init() {
  lastWide = null;
  layout();
  attachClickHandlers();
  window.addEventListener('resize', onResize, { passive: true });
}

function cleanup() {
  window.removeEventListener('resize', onResize);
  if (resizeTimer) clearTimeout(resizeTimer);
}

// ── Lifecycle ──

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-preparation', cleanup, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

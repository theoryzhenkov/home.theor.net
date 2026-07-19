// TOC scroll spy with read-state tracking
// Manages data-state attribute on .toc-entry elements: "unread" | "active" | "read"
export {};

interface ActiveTimer {
  startTime: number;
  accumulated: number;
}

const READ_THRESHOLD_MS = 2000;
const VIEWPORT_COVERAGE_THRESHOLD = 0.4;
const SECTION_VISIBILITY_THRESHOLD = 0.9;

let tocLinks: NodeListOf<HTMLElement> = [] as unknown as NodeListOf<HTMLElement>;
let headings: HTMLElement[] = [];
let activeIds = new Set<string>();
let readSections = new Set<string>();
let activeTimers = new Map<string, ActiveTimer>();
let ticking = false;
let scrollHandler: (() => void) | null = null;
let cleanupHandler: (() => void) | null = null;

function getHeaderOffset(): number {
  const scrollPaddingTop = parseFloat(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );

  if (Number.isFinite(scrollPaddingTop) && scrollPaddingTop > 0) {
    return scrollPaddingTop;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const headerHeight = parseFloat(rootStyles.getPropertyValue('--height-header'));
  const headerGap = parseFloat(rootStyles.getPropertyValue('--header-gap'));

  return (Number.isFinite(headerHeight) ? headerHeight : 44) +
    (Number.isFinite(headerGap) ? headerGap : 16);
}

function getTocLinkForId(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.toc-entry[href="#${id}"]`);
}

function setEntryState(id: string, state: 'unread' | 'active' | 'read') {
  const link = getTocLinkForId(id);
  if (link) {
    link.dataset.state = state;
  }
}

function calculateActiveHeadings(): Set<string> {
  const headerHeight = getHeaderOffset();
  const viewportBottom = window.innerHeight;
  const viewportHeight = viewportBottom - headerHeight;
  if (viewportHeight <= 0) return new Set([headings[0]?.id].filter(Boolean));

  const articleBody = document.querySelector('.prose');
  const contentBottom = articleBody
    ? articleBody.getBoundingClientRect().bottom
    : document.documentElement.scrollHeight;

  const result = new Set<string>();

  for (let i = 0; i < headings.length; i++) {
    const sectionTop = headings[i].getBoundingClientRect().top;
    const sectionBottom =
      i < headings.length - 1
        ? headings[i + 1].getBoundingClientRect().top
        : contentBottom;

    const sectionHeight = sectionBottom - sectionTop;
    if (sectionHeight <= 0) continue;

    const visibleTop = Math.max(sectionTop, headerHeight);
    const visibleBottom = Math.min(sectionBottom, viewportBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    const viewportCoverage = visibleHeight / viewportHeight;
    const sectionVisibility = visibleHeight / sectionHeight;

    if (
      viewportCoverage >= VIEWPORT_COVERAGE_THRESHOLD ||
      sectionVisibility >= SECTION_VISIBILITY_THRESHOLD
    ) {
      result.add(headings[i].id);
    }
  }

  // Fallback: first heading always active if nothing else qualifies
  if (result.size === 0 && headings.length > 0) {
    result.add(headings[0].id);
  }

  return result;
}

function processStateChanges(newActive: Set<string>) {
  const previousActive = activeIds;

  // Handle headings that lost active status
  for (const id of previousActive) {
    if (!newActive.has(id)) {
      // Accumulate timer for departing heading
      const timer = activeTimers.get(id);
      if (timer && timer.startTime > 0) {
        timer.accumulated += Date.now() - timer.startTime;
        timer.startTime = 0;
      }

      // Check if it qualifies as read
      if (
        readSections.has(id) ||
        (timer && timer.accumulated >= READ_THRESHOLD_MS)
      ) {
        readSections.add(id);
        setEntryState(id, 'read');
      } else {
        setEntryState(id, 'unread');
      }
    }
  }

  // Handle headings that became active
  for (const id of newActive) {
    if (!previousActive.has(id)) {
      // Start or resume timer
      let timer = activeTimers.get(id);
      if (!timer) {
        timer = { startTime: Date.now(), accumulated: 0 };
        activeTimers.set(id, timer);
      } else {
        timer.startTime = Date.now();
      }
    }

    // Check if already-active heading crossed the threshold mid-scroll
    const timer = activeTimers.get(id);
    if (timer && timer.startTime > 0) {
      const total = timer.accumulated + (Date.now() - timer.startTime);
      if (total >= READ_THRESHOLD_MS) {
        readSections.add(id);
      }
    }

    setEntryState(id, 'active');
  }

  activeIds = newActive;
}

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      const newActive = calculateActiveHeadings();
      processStateChanges(newActive);
      ticking = false;
    });
    ticking = true;
  }
}

function init() {
  tocLinks = document.querySelectorAll<HTMLElement>('.toc-entry');
  if (tocLinks.length === 0) return;

  headings = [];
  tocLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    // Use getElementById, not querySelector: heading slugs can start with a
    // digit (e.g. imported posts with numbered headings), which is an invalid
    // CSS id selector and would throw, aborting the scroll spy.
    const heading = document.getElementById(href.slice(1));
    if (heading instanceof HTMLElement) {
      headings.push(heading);
    }
  });

  if (headings.length === 0) return;

  // Reset state
  activeIds = new Set<string>();
  readSections = new Set<string>();
  activeTimers = new Map<string, ActiveTimer>();
  ticking = false;

  // Initialize all entries as unread
  tocLinks.forEach((link) => {
    link.dataset.state = 'unread';
  });

  // Bind scroll
  scrollHandler = onScroll;
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Initial calculation
  const initial = calculateActiveHeadings();
  processStateChanges(initial);

  // Cleanup on navigation
  cleanupHandler = cleanup;
  document.addEventListener('astro:before-preparation', cleanupHandler, {
    once: true,
  });
}

function cleanup() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  activeTimers.clear();
  ticking = false;
}

// Lifecycle hooks
document.addEventListener('astro:page-load', init);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

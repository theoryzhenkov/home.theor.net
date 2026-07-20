/** Event delegation, hover timing, mobile detection, and popup orchestration */

import type { PopupContent, PopupInstance, TilePosition } from './types';
import { POPUP_CONFIG } from './types';
import { fetchAndCache, prefetch, getCurrentPageDoc } from './cache';
import { classifyTarget, extractContent } from './extract';
import { loadAnnotations, getAnnotation, type LinkAnnotation } from './annotations';
import { calculatePosition, getTileRect } from './position';
import {
  createLoadingPopup, upgradeLoadingPopup,
  createPopin, showPopup, showPopin, dismissTopPopin, escapeHtml,
  setTiled,
} from './render';
import {
  pushPopup, removePopup, findPopupByElement, findPopupById, findPopupByAnchor,
  getDepthOf, getTopPopup,
  clearAll, focusPopup, getFocusedPopup, togglePin, pinPopup, wouldCycle,
  setOnRemove,
} from './stack';
import { initDrag, teardownDrag } from './drag';
import { initResize, teardownResize } from './resize';
import { minimize, removeFromTaskbar, destroyTaskbar } from './taskbar';

/** Check if `instance` is a descendant of `ancestorId` in the popup tree */
function isDescendantOf(instance: PopupInstance, ancestorId: string): boolean {
  let currentId = instance.parentId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    const parent = findPopupById(currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }
  return false;
}

interface PopupIndexEntry {
  title: string;
  description?: string;
  maturity?: string;
}

type PopupIndex = Record<string, PopupIndexEntry>;

let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
let spawnTimer: ReturnType<typeof setTimeout> | null = null;
let currentHoverAnchor: HTMLAnchorElement | null = null;
let popupIndex: PopupIndex | null = null;
let popupIndexPromise: Promise<PopupIndex> | null = null;
let isScrolling = false;
const spawningHrefs = new Set<string>();

// Wire drag/resize teardown + taskbar cleanup into stack removal
setOnRemove((instance) => {
  teardownDrag(instance.element);
  teardownResize(instance.element);
  removeFromTaskbar(instance.id);
});

function isMobile(): boolean {
  return window.innerWidth <= POPUP_CONFIG.mobileBreakpoint;
}

function isSidenoteVisible(footnoteId: string): boolean {
  if (window.innerWidth <= POPUP_CONFIG.mobileBreakpoint) return false;
  const sidenote = document.querySelector(`.sidenote[data-footnote-id="${footnoteId}"]`);
  if (!sidenote || sidenote.hasAttribute('data-hidden')) return false;
  const rect = sidenote.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function loadPopupIndex(): Promise<PopupIndex> {
  if (popupIndex) return popupIndex;
  if (popupIndexPromise) return popupIndexPromise;

  popupIndexPromise = fetch('/popup-index.json')
    .then((r) => r.json())
    .then((data: PopupIndex) => {
      popupIndex = data;
      return data;
    })
    .catch(() => {
      popupIndex = {};
      return {};
    });

  return popupIndexPromise;
}

function buildExternalContent(ann: LinkAnnotation): PopupContent {
  const parts: string[] = ['<div class="link-card">'];
  parts.push('<div class="link-card-head">');
  if (ann.favicon) {
    parts.push(
      `<img class="link-card-favicon" src="${escapeHtml(ann.favicon)}" alt="" width="16" height="16" loading="lazy">`,
    );
  }
  parts.push(`<span class="link-card-domain">${escapeHtml(ann.siteName || ann.domain)}</span>`);
  parts.push('</div>');
  if (ann.image) {
    parts.push(`<img class="link-card-image" src="${escapeHtml(ann.image)}" alt="" loading="lazy">`);
  }
  if (ann.description) {
    parts.push(`<p class="link-card-desc">${escapeHtml(ann.description)}</p>`);
  } else if (!ann.ok) {
    parts.push('<p class="link-card-desc popup-no-content">No preview available — open the link directly.</p>');
  }
  parts.push('</div>');

  return { title: ann.title, bodyHtml: parts.join(''), href: ann.url, contentType: 'external' };
}

function buildFallbackContent(path: string, entry: PopupIndexEntry): PopupContent {
  const bodyHtml = entry.description
    ? `<p>${escapeHtml(entry.description)}</p>`
    : '<p class="popup-no-content">No preview available</p>';

  return {
    title: entry.title,
    bodyHtml,
    href: path,
    contentType: 'page',
  };
}

function clearHoverTimers(): void {
  if (prefetchTimer) { clearTimeout(prefetchTimer); prefetchTimer = null; }
  if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
}

function scheduleFade(instance: PopupInstance): void {
  // Pinned popups don't auto-fade
  if (instance.state === 'pinned') return;

  const timer = setTimeout(() => {
    if (!instance.element.matches(':hover') && currentHoverAnchor !== instance.anchor) {
      removePopup(instance.id);
    }
  }, POPUP_CONFIG.fadeOutDelay);
  instance.timers.push(timer);
}

function cancelFadeTimers(instance: PopupInstance): void {
  for (const timer of instance.timers) {
    clearTimeout(timer);
  }
  instance.timers.length = 0;
}

function wirePopupInteractions(popupEl: HTMLElement, instance: PopupInstance): void {
  // Close events
  popupEl.addEventListener('popup:close', ((e: CustomEvent) => {
    if (e.detail?.altKey) {
      clearAll();
      destroyTaskbar();
    } else {
      removePopup(instance.id);
    }
  }) as EventListener);

  // Pin toggle
  popupEl.addEventListener('popup:pin', () => {
    togglePin(instance.id);
  });

  // Minimize
  popupEl.addEventListener('popup:minimize', () => {
    minimize(instance);
  });

  // Zoom/tile cycling
  popupEl.addEventListener('popup:zoom', () => {
    cycleTile(instance);
  });

  // Keep popup alive while mouse is over it
  popupEl.addEventListener('mouseenter', () => {
    cancelFadeTimers(instance);
    focusPopup(instance.id);
  });

  // Start fade when mouse leaves popup
  popupEl.addEventListener('mouseleave', (e: MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related === instance.anchor || instance.anchor.contains(related)) return;
    // Only skip fade if moving to a descendant popup (child, grandchild, etc.)
    const relatedPopupEl = related?.closest?.('.popup') as HTMLElement | null;
    if (relatedPopupEl) {
      const relatedInstance = findPopupByElement(relatedPopupEl);
      if (relatedInstance && isDescendantOf(relatedInstance, instance.id)) return;
    }
    scheduleFade(instance);
  });

  // Init drag and resize
  initDrag(popupEl, instance);
  initResize(popupEl, instance);
}

/** Tile positions to cycle through when pressing zoom */
const TILE_CYCLE: TilePosition[] = ['center', 'left', 'right', 'top', 'bottom'];

function cycleTile(instance: PopupInstance): void {
  const currentIdx = instance.tilePosition
    ? TILE_CYCLE.indexOf(instance.tilePosition)
    : -1;
  const nextIdx = (currentIdx + 1) % TILE_CYCLE.length;
  tilePopup(instance, TILE_CYCLE[nextIdx]);
}

function tilePopup(instance: PopupInstance, position: TilePosition): void {
  pinPopup(instance.id);
  instance.tilePosition = position;

  const rect = getTileRect(position, POPUP_CONFIG.tileMargin);
  const el = instance.element;

  setTiled(el, position);
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.maxWidth = 'none';
  el.style.maxHeight = 'none';
}

async function spawnPopup(anchor: HTMLAnchorElement, parentPopupEl: HTMLElement | null): Promise<void> {
  const target = classifyTarget(anchor);
  if (!target) return;

  if (target.contentType === 'footnote' && target.footnoteId && isSidenoteVisible(target.footnoteId)) {
    return;
  }

  const parentDepth = getDepthOf(parentPopupEl);
  const depth = parentDepth + 1;

  const parentInstance = parentPopupEl ? findPopupByElement(parentPopupEl) : undefined;
  const href = target.hash ? `${target.path}${target.hash}` : target.path;

  // Duplicate prevention: if a popup already exists for this anchor, focus it
  const existing = findPopupByAnchor(anchor);
  if (existing) {
    focusPopup(existing.id);
    return;
  }

  // Cycle prevention: check ancestor chain for same href
  if (wouldCycle(href, parentInstance?.id ?? null)) return;

  // Prevent duplicate concurrent spawns for the same href
  if (spawningHrefs.has(href)) return;
  spawningHrefs.add(href);

  try {
    if (isMobile()) {
      const content = await fetchContent(target);
      if (!content) return;
      if (currentHoverAnchor !== anchor) return;
      const popin = createPopin(content);
      showPopin(popin);
      return;
    }

    // Create loading popup immediately
    const loadingEl = createLoadingPopup(depth, POPUP_CONFIG, target.contentType);
    document.body.appendChild(loadingEl);

    // Position the loading popup
    const loadingRect = loadingEl.getBoundingClientRect();
    const pos = calculatePosition(
      anchor,
      loadingRect.width,
      loadingRect.height,
      POPUP_CONFIG,
      parentInstance?.element ?? null,
    );

    loadingEl.style.position = 'fixed';
    loadingEl.style.top = `${pos.top}px`;
    loadingEl.style.left = `${pos.left}px`;
    loadingEl.style.maxHeight = `${pos.maxHeight}px`;

    const instance: PopupInstance = {
      id: loadingEl.dataset.popupId!,
      element: loadingEl,
      anchor,
      parentId: parentInstance?.id ?? null,
      depth,
      timers: [],
      state: 'ephemeral',
      href,
      tilePosition: null,
      zIndex: 0,
      isMinimized: false,
      savedRect: null,
    };

    pushPopup(instance);
    showPopup(loadingEl);
    wirePopupInteractions(loadingEl, instance);

    // Fetch actual content
    const content = await fetchContent(target);

    // Check if popup was dismissed during fetch
    if (!document.body.contains(loadingEl)) return;

    if (!content) {
      removePopup(instance.id);
      return;
    }

    // Upgrade loading popup with real content
    upgradeLoadingPopup(loadingEl, content);

    // Reposition with actual content dimensions
    const actualRect = loadingEl.getBoundingClientRect();
    const finalPos = calculatePosition(
      anchor,
      actualRect.width,
      actualRect.height,
      POPUP_CONFIG,
      parentInstance?.element ?? null,
    );
    loadingEl.style.top = `${finalPos.top}px`;
    loadingEl.style.left = `${finalPos.left}px`;
    loadingEl.style.maxHeight = `${finalPos.maxHeight}px`;
  } finally {
    spawningHrefs.delete(href);
  }
}

async function fetchContent(target: ReturnType<typeof classifyTarget>): Promise<PopupContent | null> {
  if (!target) return null;

  if (target.contentType === 'external') {
    await loadAnnotations();
    const ann = getAnnotation(target.path);
    return ann ? buildExternalContent(ann) : null;
  }

  let content: PopupContent | null = null;

  try {
    if (target.contentType === 'footnote') {
      const cached = getCurrentPageDoc();
      content = extractContent(cached, target);
    } else {
      const cached = await fetchAndCache(target.path);
      content = extractContent(cached, target);
    }
  } catch {
    // Fall back to popup index
  }

  if (!content) {
    const index = await loadPopupIndex();
    const entry = index[target.path];
    if (entry) {
      content = buildFallbackContent(target.path, entry);
    }
  }

  return content;
}

// ─── Scroll suppression ───

export function handleScroll(): void {
  isScrolling = true;
}

export function handleMouseMoveGlobal(): void {
  isScrolling = false;
}

// ─── Focus on click ───

export function handlePopupFocus(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const popupEl = target.closest('.popup') as HTMLElement | null;
  if (!popupEl) return;
  const instance = findPopupByElement(popupEl);
  if (instance) {
    focusPopup(instance.id);
  }
}

// ─── Keyboard tiling ───

const TILE_KEYS: Record<string, TilePosition> = {
  q: 'top-left',
  w: 'top',
  e: 'top-right',
  a: 'left',
  s: 'center',
  d: 'right',
  z: 'bottom-left',
  x: 'bottom',
  c: 'bottom-right',
};

export function handleMouseOver(event: MouseEvent): void {
  // Suppress during scroll
  if (isScrolling) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  const parentPopupEl = anchor.closest('.popup') as HTMLElement | null;

  if (currentHoverAnchor === anchor) return;

  clearHoverTimers();
  currentHoverAnchor = anchor;

  const classified = classifyTarget(anchor);
  if (!classified) {
    currentHoverAnchor = null;
    return;
  }

  if (isMobile()) {
    currentHoverAnchor = null;
    return;
  }

  // Only same-origin pages are prefetchable; external URLs are CORS-blocked and
  // footnotes are already on the page.
  if (classified.contentType === 'page' || classified.contentType === 'section') {
    prefetchTimer = setTimeout(() => {
      prefetch(classified.path);
    }, POPUP_CONFIG.prefetchDelay);
  }

  spawnTimer = setTimeout(() => {
    spawnPopup(anchor, parentPopupEl);
  }, POPUP_CONFIG.spawnDelay);
}

export function handleMouseOut(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget?.closest?.('.popup')) return;

  clearHoverTimers();
  currentHoverAnchor = null;

  const topPopup = getTopPopup();
  if (topPopup && !topPopup.element.matches(':hover')) {
    scheduleFade(topPopup);
  }
}

export function handleClick(event: MouseEvent): void {
  if (!isMobile()) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  const classified = classifyTarget(anchor);
  if (!classified) return;

  event.preventDefault();
  spawnPopup(anchor, null);
}

export function handlePopupInternalMouseOver(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest('.popup')) return;
  handleMouseOver(event);
}

export function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (dismissTopPopin()) {
      event.preventDefault();
      return;
    }
    const topPopup = getTopPopup();
    if (topPopup) {
      removePopup(topPopup.id);
      event.preventDefault();
    }
    return;
  }

  // Keyboard tiling requires Alt modifier: Alt+Q/W/E/A/S/D/Z/X/C
  if (!event.altKey) return;

  // Skip if an input element is focused
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
  if ((document.activeElement as HTMLElement)?.isContentEditable) return;

  const tilePos = TILE_KEYS[event.key.toLowerCase()];
  if (tilePos) {
    const focused = getFocusedPopup();
    if (focused && !focused.isMinimized) {
      event.preventDefault();
      tilePopup(focused, tilePos);
    }
  }
}

export function resetState(): void {
  clearHoverTimers();
  currentHoverAnchor = null;
  isScrolling = false;
  clearAll();
}

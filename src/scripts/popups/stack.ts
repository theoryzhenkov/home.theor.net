/** Nested popup stack management with z-order, pinning, and focus tracking */

import type { PopupInstance } from './types';
import { POPUP_CONFIG } from './types';
import { startFadeOut } from './render';

const popups: PopupInstance[] = [];
let focusedId: string | null = null;
let onRemoveCallback: ((instance: PopupInstance) => void) | null = null;

/** Register a callback invoked for each popup instance before it is removed */
export function setOnRemove(cb: (instance: PopupInstance) => void): void {
  onRemoveCallback = cb;
}

export function pushPopup(instance: PopupInstance): void {
  // Despawn non-ancestor ephemeral popups first
  const ancestors = getAncestorChain(instance.parentId);
  const ancestorIds = new Set(ancestors.map((p) => p.id));
  if (instance.parentId) ancestorIds.add(instance.parentId);

  // Only auto-despawn ephemeral popups that aren't in the ancestor chain
  const toRemove = popups.filter(
    (p) => !ancestorIds.has(p.id) && p.state === 'ephemeral',
  );
  for (const p of toRemove) {
    removePopupInternal(p.id);
  }

  popups.push(instance);
  focusPopup(instance.id);
}

export function removePopup(id: string): void {
  removePopupInternal(id);
  updateZOrder();
}

function removePopupInternal(id: string): void {
  const toRemoveIds = new Set<string>([id]);
  collectDescendantIds(id, toRemoveIds);

  const removed: PopupInstance[] = [];
  for (let i = popups.length - 1; i >= 0; i--) {
    if (toRemoveIds.has(popups[i].id)) {
      removed.push(popups[i]);
      popups.splice(i, 1);
    }
  }

  for (const instance of removed) {
    for (const timer of instance.timers) {
      clearTimeout(timer);
    }
    instance.timers.length = 0;
    onRemoveCallback?.(instance);
    startFadeOut(instance.element, () => {});
  }

  if (focusedId && toRemoveIds.has(focusedId)) {
    focusedId = popups[popups.length - 1]?.id ?? null;
  }
}

function collectDescendantIds(id: string, out: Set<string>): void {
  for (const p of popups) {
    if (p.parentId === id && !out.has(p.id)) {
      out.add(p.id);
      collectDescendantIds(p.id, out);
    }
  }
}

export function getAncestorChain(id: string | null): PopupInstance[] {
  const chain: PopupInstance[] = [];
  let currentId = id;
  while (currentId) {
    const popup = popups.find((p) => p.id === currentId);
    if (!popup) break;
    chain.push(popup);
    currentId = popup.parentId;
  }
  return chain;
}

export function findPopupByElement(element: HTMLElement): PopupInstance | undefined {
  return popups.find((p) => p.element === element || p.element.contains(element));
}

export function getTopPopup(): PopupInstance | undefined {
  return popups[popups.length - 1];
}

export function clearAll(): void {
  for (const p of [...popups]) {
    for (const timer of p.timers) {
      clearTimeout(timer);
    }
    onRemoveCallback?.(p);
    p.element.remove();
  }
  popups.length = 0;
  focusedId = null;
}

export function getDepthOf(popupElement: HTMLElement | null): number {
  if (!popupElement) return 0;
  const instance = popups.find(
    (p) => p.element === popupElement || p.element.contains(popupElement),
  );
  return instance ? instance.depth : 0;
}

/** Reassign z-indices sequentially; focused popup gets the top slot */
export function updateZOrder(): void {
  const visible = popups.filter((p) => !p.isMinimized);
  const base = POPUP_CONFIG.baseZIndex;

  for (let i = 0; i < visible.length; i++) {
    const z = visible[i].id === focusedId ? base + visible.length : base + i;
    visible[i].zIndex = z;
    visible[i].element.style.zIndex = String(z);
  }
}

/** Set a popup as focused, update z-order and visual state */
export function focusPopup(id: string): void {
  const prev = focusedId ? popups.find((p) => p.id === focusedId) : null;
  if (prev) {
    prev.element.classList.remove('popup-focused');
  }

  focusedId = id;
  const instance = popups.find((p) => p.id === id);
  if (instance) {
    instance.element.classList.add('popup-focused');
  }
  updateZOrder();
}

export function getFocusedPopup(): PopupInstance | undefined {
  if (!focusedId) return undefined;
  return popups.find((p) => p.id === focusedId);
}

export function togglePin(id: string): void {
  const instance = popups.find((p) => p.id === id);
  if (!instance) return;
  instance.state = instance.state === 'pinned' ? 'ephemeral' : 'pinned';
  instance.element.classList.toggle('popup-pinned', instance.state === 'pinned');
}

export function pinPopup(id: string): void {
  const instance = popups.find((p) => p.id === id);
  if (!instance || instance.state === 'pinned') return;
  instance.state = 'pinned';
  instance.element.classList.add('popup-pinned');
}

export function getMinimizedPopups(): PopupInstance[] {
  return popups.filter((p) => p.isMinimized);
}

export function getAllPopups(): readonly PopupInstance[] {
  return popups;
}

export function findPopupById(id: string): PopupInstance | undefined {
  return popups.find((p) => p.id === id);
}

/** Find an existing popup spawned from a given anchor element */
export function findPopupByAnchor(anchor: HTMLAnchorElement): PopupInstance | undefined {
  return popups.find((p) => p.anchor === anchor);
}

/** Check if spawning a popup for this href would create a cycle in the ancestor chain */
export function wouldCycle(href: string, parentId: string | null): boolean {
  let currentId = parentId;
  while (currentId) {
    const popup = popups.find((p) => p.id === currentId);
    if (!popup) break;
    if (popup.href === href) return true;
    currentId = popup.parentId;
  }
  return false;
}

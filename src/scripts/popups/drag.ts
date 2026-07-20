/** Pointer-capture drag on popup titlebar */

import type { PopupInstance } from './types';
import { POPUP_CONFIG } from './types';
import { pinPopup, focusPopup } from './stack';

interface DragState {
  startX: number;
  startY: number;
  startTop: number;
  startLeft: number;
  isDragging: boolean;
  rafId: number | null;
  pendingX: number;
  pendingY: number;
}

const dragStates = new WeakMap<HTMLElement, DragState>();
const controllers = new WeakMap<HTMLElement, AbortController>();

export function initDrag(popup: HTMLElement, instance: PopupInstance): void {
  const titlebar = popup.querySelector('.popup-titlebar') as HTMLElement | null;
  if (!titlebar) return;

  const controller = new AbortController();
  const signal = controller.signal;
  controllers.set(popup, controller);

  // Suppress native browser link-drag on the titlebar
  titlebar.addEventListener('dragstart', (e) => e.preventDefault(), { signal });
  const titleLink = titlebar.querySelector('.popup-titlebar-link');
  if (titleLink) titleLink.setAttribute('draggable', 'false');

  titlebar.addEventListener('pointerdown', (e: PointerEvent) => {
    // Don't drag from buttons
    if ((e.target as HTMLElement).closest('.popup-btn')) return;
    if (e.button !== 0) return;

    focusPopup(instance.id);

    const rect = popup.getBoundingClientRect();
    const state: DragState = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: rect.top,
      startLeft: rect.left,
      isDragging: false,
      rafId: null,
      pendingX: rect.left,
      pendingY: rect.top,
    };
    dragStates.set(popup, state);

    titlebar.setPointerCapture(e.pointerId);

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - state.startX;
      const dy = me.clientY - state.startY;

      if (!state.isDragging) {
        if (Math.abs(dx) < POPUP_CONFIG.dragThreshold && Math.abs(dy) < POPUP_CONFIG.dragThreshold) {
          return;
        }
        state.isDragging = true;
        popup.classList.add('popup-dragging');
        // Auto-pin and clear tile on first real drag
        pinPopup(instance.id);
        instance.tilePosition = null;
        popup.classList.remove('popup-tiled');
        popup.dataset.tilePosition = '';
        // Remove max-width/max-height constraints for free movement
        popup.style.maxWidth = '';
      }

      state.pendingX = state.startLeft + dx;
      state.pendingY = state.startTop + dy;

      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(() => {
          popup.style.left = `${state.pendingX}px`;
          popup.style.top = `${state.pendingY}px`;
          state.rafId = null;
        });
      }
    };

    const onUp = (ue: PointerEvent) => {
      titlebar.releasePointerCapture(ue.pointerId);
      titlebar.removeEventListener('pointermove', onMove);
      titlebar.removeEventListener('pointerup', onUp);

      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
      }
      popup.classList.remove('popup-dragging');
      dragStates.delete(popup);
    };

    titlebar.addEventListener('pointermove', onMove, { signal });
    titlebar.addEventListener('pointerup', onUp, { signal });
  }, { signal });
}

export function teardownDrag(popup: HTMLElement): void {
  const controller = controllers.get(popup);
  if (controller) {
    controller.abort();
    controllers.delete(popup);
  }

  const state = dragStates.get(popup);
  if (state?.rafId !== null && state?.rafId !== undefined) {
    cancelAnimationFrame(state.rafId);
  }
  dragStates.delete(popup);
  popup.classList.remove('popup-dragging');
}

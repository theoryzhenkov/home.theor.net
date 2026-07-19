/** 8-direction edge/corner resize for popups */

import type { PopupInstance, ResizeEdge } from './types';
import { POPUP_CONFIG } from './types';
import { pinPopup, focusPopup } from './stack';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;

const EDGE_CLASSES = ['popup-resize-n', 'popup-resize-s', 'popup-resize-e', 'popup-resize-w',
  'popup-resize-ne', 'popup-resize-nw', 'popup-resize-se', 'popup-resize-sw'];

interface ResizeState {
  edge: ResizeEdge;
  startX: number;
  startY: number;
  startRect: { top: number; left: number; width: number; height: number };
  rafId: number | null;
  pendingRect: { top: number; left: number; width: number; height: number };
}

const resizeStates = new WeakMap<HTMLElement, ResizeState>();
const controllers = new WeakMap<HTMLElement, AbortController>();

function detectEdge(popup: HTMLElement, x: number, y: number): ResizeEdge | null {
  const rect = popup.getBoundingClientRect();
  const diagonal = Math.sqrt(rect.width ** 2 + rect.height ** 2);
  const edgeSize = Math.min(POPUP_CONFIG.cornerDetectionSize, diagonal / 3);

  const nearTop = y - rect.top < edgeSize;
  const nearBottom = rect.bottom - y < edgeSize;
  const nearLeft = x - rect.left < edgeSize;
  const nearRight = rect.right - x < edgeSize;

  if (nearTop && nearLeft) return 'nw';
  if (nearTop && nearRight) return 'ne';
  if (nearBottom && nearLeft) return 'sw';
  if (nearBottom && nearRight) return 'se';
  if (nearTop) return 'n';
  if (nearBottom) return 's';
  if (nearLeft) return 'w';
  if (nearRight) return 'e';
  return null;
}

function updateEdgeCursor(popup: HTMLElement, edge: ResizeEdge | null): void {
  for (const cls of EDGE_CLASSES) {
    popup.classList.remove(cls);
  }
  if (edge) {
    popup.classList.add(`popup-resize-${edge}`);
  }
}

export function initResize(popup: HTMLElement, instance: PopupInstance): void {
  const controller = new AbortController();
  const signal = controller.signal;
  controllers.set(popup, controller);

  // Track edge on mousemove for cursor updates
  popup.addEventListener('mousemove', (e: MouseEvent) => {
    // Don't update cursor while actively resizing
    if (resizeStates.has(popup)) return;
    // Don't show resize cursor over titlebar content
    if ((e.target as HTMLElement).closest('.popup-titlebar')) {
      updateEdgeCursor(popup, null);
      return;
    }
    const edge = detectEdge(popup, e.clientX, e.clientY);
    updateEdgeCursor(popup, edge);
  }, { signal });

  popup.addEventListener('pointerdown', (e: PointerEvent) => {
    // Skip if on titlebar or buttons
    if ((e.target as HTMLElement).closest('.popup-titlebar')) return;
    if (e.button !== 0) return;

    const edge = detectEdge(popup, e.clientX, e.clientY);
    if (!edge) return;

    e.preventDefault();
    e.stopPropagation();
    focusPopup(instance.id);

    const rect = popup.getBoundingClientRect();
    const state: ResizeState = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      rafId: null,
      pendingRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };
    resizeStates.set(popup, state);
    popup.setPointerCapture(e.pointerId);
    popup.classList.add('popup-resizing');

    // Auto-pin and clear tile on resize
    pinPopup(instance.id);
    instance.tilePosition = null;
    popup.classList.remove('popup-tiled');
    popup.dataset.tilePosition = '';

    // Per-resize-session controller so cleanup is isolated
    const sessionController = new AbortController();
    const sessionSignal = sessionController.signal;

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - state.startX;
      const dy = me.clientY - state.startY;
      const s = state.startRect;
      const next = { ...s };

      if (state.edge.includes('e')) {
        next.width = Math.max(MIN_WIDTH, s.width + dx);
      }
      if (state.edge.includes('w')) {
        const newW = Math.max(MIN_WIDTH, s.width - dx);
        next.left = s.left + (s.width - newW);
        next.width = newW;
      }
      if (state.edge.includes('s')) {
        next.height = Math.max(MIN_HEIGHT, s.height + dy);
      }
      if (state.edge.includes('n')) {
        const newH = Math.max(MIN_HEIGHT, s.height - dy);
        next.top = s.top + (s.height - newH);
        next.height = newH;
      }

      state.pendingRect = next;

      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(() => {
          const r = state.pendingRect;
          popup.style.top = `${r.top}px`;
          popup.style.left = `${r.left}px`;
          popup.style.width = `${r.width}px`;
          popup.style.height = `${r.height}px`;
          popup.style.maxWidth = 'none';
          popup.style.maxHeight = 'none';
          state.rafId = null;
        });
      }
    };

    const onUp = (ue: PointerEvent) => {
      popup.releasePointerCapture(ue.pointerId);
      sessionController.abort();

      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
      }
      popup.classList.remove('popup-resizing');
      resizeStates.delete(popup);
    };

    document.addEventListener('pointermove', onMove, { signal: sessionSignal });
    document.addEventListener('pointerup', onUp, { signal: sessionSignal });
  }, { signal });
}

export function teardownResize(popup: HTMLElement): void {
  const controller = controllers.get(popup);
  if (controller) {
    controller.abort();
    controllers.delete(popup);
  }

  const state = resizeStates.get(popup);
  if (state?.rafId !== null && state?.rafId !== undefined) {
    cancelAnimationFrame(state.rafId);
  }
  resizeStates.delete(popup);
  popup.classList.remove('popup-resizing');
  for (const cls of EDGE_CLASSES) {
    popup.classList.remove(cls);
  }
}

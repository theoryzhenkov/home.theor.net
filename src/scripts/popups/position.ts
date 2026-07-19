/** Viewport-aware positioning engine for popups */

import type { PopupConfig, PopupPosition, TilePosition, Rect } from './types';

type Placement = PopupPosition['placement'];

function getViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function tryPlacement(
  anchorRect: DOMRect,
  popupWidth: number,
  popupHeight: number,
  placement: Placement,
  config: PopupConfig,
  parentRect: DOMRect | null,
): PopupPosition | null {
  const vp = getViewport();
  const margin = config.viewportMargin;
  let top: number;
  let left: number;

  switch (placement) {
    case 'below':
      top = anchorRect.bottom + config.gap;
      left = anchorRect.left;
      break;
    case 'above':
      top = anchorRect.top - popupHeight - config.gap;
      left = anchorRect.left;
      break;
    case 'right':
      top = anchorRect.top;
      left = (parentRect ? parentRect.right : anchorRect.right) + config.gap;
      break;
    case 'left':
      top = anchorRect.top;
      left = (parentRect ? parentRect.left : anchorRect.left) - popupWidth - config.gap;
      break;
  }

  // Check if it fits in viewport
  if (top < margin || top + popupHeight > vp.height - margin) {
    // Can we clamp it?
    top = Math.max(margin, Math.min(top, vp.height - popupHeight - margin));
    if (top + popupHeight > vp.height - margin) return null;
  }
  if (left < margin || left + popupWidth > vp.width - margin) {
    left = Math.max(margin, Math.min(left, vp.width - popupWidth - margin));
    if (left + popupWidth > vp.width - margin) return null;
  }

  const maxHeight = Math.min(config.maxContentHeight + 60, vp.height - top - margin);

  return { top, left, placement, maxHeight };
}

export function calculatePosition(
  anchor: HTMLElement,
  popupWidth: number,
  popupHeight: number,
  config: PopupConfig,
  parentPopup: HTMLElement | null,
): PopupPosition {
  const anchorRect = anchor.getBoundingClientRect();
  const parentRect = parentPopup?.getBoundingClientRect() ?? null;

  // Nested popups prefer side placement; root popups prefer vertical
  const priorities: Placement[] = parentPopup
    ? ['right', 'left', 'below', 'above']
    : ['below', 'above', 'right', 'left'];

  for (const placement of priorities) {
    const position = tryPlacement(anchorRect, popupWidth, popupHeight, placement, config, parentRect);
    if (position) return position;
  }

  // Fallback: force below, clamped
  const vp = getViewport();
  const margin = config.viewportMargin;
  return {
    top: Math.max(margin, anchorRect.bottom + config.gap),
    left: Math.max(margin, Math.min(anchorRect.left, vp.width - popupWidth - margin)),
    placement: 'below',
    maxHeight: Math.min(config.maxContentHeight + 60, vp.height - margin * 2),
  };
}

/** Calculate a tile rectangle for the given position, using viewport dimensions */
export function getTileRect(position: TilePosition, margin: number): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const m = margin;
  const halfW = (vw - m * 3) / 2;
  const halfH = (vh - m * 3) / 2;

  switch (position) {
    case 'top-left':
      return { top: m, left: m, width: halfW, height: halfH };
    case 'top':
      return { top: m, left: m, width: vw - m * 2, height: halfH };
    case 'top-right':
      return { top: m, left: m * 2 + halfW, width: halfW, height: halfH };
    case 'left':
      return { top: m, left: m, width: halfW, height: vh - m * 2 };
    case 'center':
      return { top: m, left: m, width: vw - m * 2, height: vh - m * 2 };
    case 'right':
      return { top: m, left: m * 2 + halfW, width: halfW, height: vh - m * 2 };
    case 'bottom-left':
      return { top: m * 2 + halfH, left: m, width: halfW, height: halfH };
    case 'bottom':
      return { top: m * 2 + halfH, left: m, width: vw - m * 2, height: halfH };
    case 'bottom-right':
      return { top: m * 2 + halfH, left: m * 2 + halfW, width: halfW, height: halfH };
  }
}

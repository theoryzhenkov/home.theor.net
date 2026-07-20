/** Popup system types and configuration constants */

type PopupContentType = 'page' | 'section' | 'footnote' | 'external';
type PopupState = 'ephemeral' | 'pinned';
type TilePosition = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopupTarget {
  anchor: HTMLAnchorElement;
  path: string;
  hash: string | null;
  contentType: PopupContentType;
  footnoteId: string | null;
}

interface CachedDocument {
  doc: Document;
  title: string;
  cachedAt: number;
}

interface PopupContent {
  title: string;
  bodyHtml: string;
  href: string;
  contentType: PopupContentType;
}

interface PopupInstance {
  id: string;
  element: HTMLElement;
  anchor: HTMLAnchorElement;
  parentId: string | null;
  depth: number;
  timers: ReturnType<typeof setTimeout>[];
  state: PopupState;
  href: string;
  tilePosition: TilePosition | null;
  zIndex: number;
  isMinimized: boolean;
  savedRect: Rect | null;
}

interface PopupPosition {
  top: number;
  left: number;
  placement: 'below' | 'above' | 'right' | 'left';
  maxHeight: number;
}

interface PopupConfig {
  spawnDelay: number;
  prefetchDelay: number;
  fadeOutDelay: number;
  fadeOutDuration: number;
  maxContentHeight: number;
  maxWidth: number;
  gap: number;
  mobileBreakpoint: number;
  viewportMargin: number;
  baseZIndex: number;
  cornerDetectionSize: number;
  taskbarWidth: number;
  taskbarItemHeight: number;
  tileMargin: number;
  dragThreshold: number;
}

const POPUP_CONFIG: PopupConfig = {
  spawnDelay: 750,
  prefetchDelay: 50,
  fadeOutDelay: 100,
  fadeOutDuration: 250,
  maxContentHeight: 400,
  maxWidth: 640,
  gap: 8,
  mobileBreakpoint: 1024,
  viewportMargin: 12,
  baseZIndex: 200,
  cornerDetectionSize: 20,
  taskbarWidth: 36,
  taskbarItemHeight: 28,
  tileMargin: 4,
  dragThreshold: 3,
} as const;

export type {
  PopupContentType,
  PopupState,
  TilePosition,
  ResizeEdge,
  Rect,
  PopupTarget,
  CachedDocument,
  PopupContent,
  PopupInstance,
  PopupPosition,
  PopupConfig,
};
export { POPUP_CONFIG };

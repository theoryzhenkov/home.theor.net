import type { EdgeType } from '@/lib/graph-data';

export interface EdgeStyle {
  color: string;
  width: number;
  dasharray: string;
  directed: boolean;
  label: string;
}

/**
 * Visual style for each relation type.
 * Colors reference the site's CSS custom properties at runtime via
 * getComputedStyle, but we keep hex fallbacks for the SVG markers
 * which need concrete values.
 */
export const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  ntpp: {
    color: '#000055',   // --color-accent
    width: 2,
    dasharray: '',
    directed: true,
    label: 'NTPP — deeply contained in',
  },
  tpp: {
    color: '#000055',
    width: 1.5,
    dasharray: '6 3',
    directed: true,
    label: 'TPP — tangentially part of',
  },
  po: {
    color: '#885500',   // --color-warning
    width: 1.5,
    dasharray: '',
    directed: false,
    label: 'PO — partially overlapped',
  },
  ec: {
    color: '#666666',   // --color-text-subtle
    width: 1,
    dasharray: '',
    directed: false,
    label: 'EC — externally connected',
  },
  eq: {
    color: '#006600',   // --color-success
    width: 2.5,
    dasharray: '',
    directed: false,
    label: 'EQ — equal',
  },
  dc: {
    color: '#cccccc',   // --color-border
    width: 1,
    dasharray: '3 3',
    directed: false,
    label: 'DC — disconnected',
  },
  next: {
    color: '#000055',
    width: 1,
    dasharray: '2 4',
    directed: true,
    label: 'Next / Prev — sequential',
  },
  r: {
    color: '#aaaaaa',
    width: 0.75,
    dasharray: '1 3',
    directed: true,
    label: 'R — reference link',
  },
};

/** Read a CSS custom property value from :root, with fallback. */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Resolve runtime CSS variable colors. Call once on the client after DOM ready.
 */
export function resolveRuntimeColors(): void {
  EDGE_STYLES.ntpp.color = cssVar('--color-accent', '#000055');
  EDGE_STYLES.tpp.color = cssVar('--color-accent', '#000055');
  EDGE_STYLES.po.color = cssVar('--color-warning', '#885500');
  EDGE_STYLES.ec.color = cssVar('--color-text-subtle', '#666666');
  EDGE_STYLES.eq.color = cssVar('--color-success', '#006600');
  EDGE_STYLES.dc.color = cssVar('--color-border', '#cccccc');
  EDGE_STYLES.next.color = cssVar('--color-accent', '#000055');
  EDGE_STYLES.r.color = cssVar('--color-border', '#cccccc');
}

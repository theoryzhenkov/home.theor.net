import { visit } from 'unist-util-visit';

interface ElementNode {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}

const iconPathByType: Record<string, string[]> = {
  note: [
    '<path d="M12 8h.01" />',
    '<path d="M11 12h1v4h1" />',
    '<circle cx="12" cy="12" r="10" />',
  ],
  info: [
    '<circle cx="12" cy="12" r="10" />',
    '<path d="M12 16v-4" />',
    '<path d="M12 8h.01" />',
  ],
  tip: [
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />',
    '<path d="M9 18h6" />',
    '<path d="M10 22h4" />',
  ],
  hint: [
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />',
    '<path d="M9 18h6" />',
    '<path d="M10 22h4" />',
  ],
  important: [
    '<path d="M12 2v20" />',
    '<path d="m17 5-5-3-5 3" />',
    '<path d="m17 19-5 3-5-3" />',
  ],
  warning: [
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />',
    '<path d="M12 9v4" />',
    '<path d="M12 17h.01" />',
  ],
  caution: [
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />',
    '<path d="M12 9v4" />',
    '<path d="M12 17h.01" />',
  ],
  attention: [
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />',
    '<path d="M12 9v4" />',
    '<path d="M12 17h.01" />',
  ],
  danger: [
    '<circle cx="12" cy="12" r="10" />',
    '<line x1="12" x2="12" y1="8" y2="12" />',
    '<line x1="12" x2="12.01" y1="16" y2="16" />',
  ],
  error: [
    '<circle cx="12" cy="12" r="10" />',
    '<line x1="12" x2="12" y1="8" y2="12" />',
    '<line x1="12" x2="12.01" y1="16" y2="16" />',
  ],
  bug: [
    '<path d="m8 2 1.88 1.88" />',
    '<path d="M14.12 3.88 16 2" />',
    '<path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />',
    '<path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />',
    '<path d="M12 20v-9" />',
    '<path d="M6.53 9C4.6 8.8 3 7.1 3 5" />',
    '<path d="M6 13H2" />',
    '<path d="M3 21c0-2.1 1.7-3.9 3.8-4" />',
    '<path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />',
    '<path d="M22 13h-4" />',
    '<path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />',
  ],
  quote: [
    '<path d="M16 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" />',
    '<path d="M8 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" />',
    '<path d="M14 15c0 2 1 3 3 3" />',
    '<path d="M6 15c0 2 1 3 3 3" />',
  ],
  cite: [
    '<path d="M16 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" />',
    '<path d="M8 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" />',
    '<path d="M14 15c0 2 1 3 3 3" />',
    '<path d="M6 15c0 2 1 3 3 3" />',
  ],
};

export default function rehypeCalloutIcons() {
  return (tree: unknown) => {
    visit(tree, 'element', (node: ElementNode) => {
      if (!isCallout(node)) return;

      const calloutType = getStringProperty(node, 'dataCalloutType')
        ?? getStringProperty(node, 'data-callout-type')
        ?? 'note';
      const title = node.children?.find(isCalloutTitle);
      if (!title?.children || title.children.some(isCalloutIcon)) return;

      title.children.unshift(createIcon(calloutType));
    });
  };
}

function isCallout(node: ElementNode): boolean {
  return Boolean(node.properties?.dataCallout ?? node.properties?.['data-callout']);
}

function isCalloutTitle(node: unknown): node is ElementNode {
  if (!isElement(node)) return false;
  return Boolean(node.properties?.dataCalloutTitle ?? node.properties?.['data-callout-title']);
}

function isCalloutIcon(node: unknown): boolean {
  if (!isElement(node)) return false;
  return Boolean(node.properties?.dataCalloutIcon ?? node.properties?.['data-callout-icon']);
}

function isElement(node: unknown): node is ElementNode {
  return Boolean(node && typeof node === 'object' && 'type' in node && (node as { type: unknown }).type === 'element');
}

function getStringProperty(node: ElementNode, key: string): string | undefined {
  const value = node.properties?.[key];
  return typeof value === 'string' ? value : undefined;
}

function createIcon(calloutType: string): ElementNode {
  const normalizedType = calloutType.toLowerCase();
  const paths = iconPathByType[normalizedType] ?? iconPathByType.note;
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      dataCalloutIcon: '',
      ariaHidden: 'true',
    },
    children: [{
      type: 'raw',
      value: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${normalizedType}">${paths.join('')}</svg>`,
    }],
  };
}

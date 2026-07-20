export type LinkCardKind = 'github' | 'chrome' | 'firefox' | 'release' | 'website' | 'docs' | 'other';

export interface LinkCardInput {
  href: string;
  kind?: LinkCardKind | string;
  label?: string;
  detail?: string;
}

export interface LinkCardInfo {
  label: string;
  href: string;
  detail: string;
  kind: LinkCardKind;
}

interface LinkDescriptor {
  label: string;
  kind: LinkCardKind;
  order: number;
}

const LINK_DESCRIPTORS: Record<string, LinkDescriptor> = {
  github: { label: 'GitHub', kind: 'github', order: 10 },
  repo: { label: 'GitHub', kind: 'github', order: 10 },
  source: { label: 'Source', kind: 'github', order: 10 },
  website: { label: 'Website', kind: 'website', order: 20 },
  site: { label: 'Website', kind: 'website', order: 20 },
  homepage: { label: 'Website', kind: 'website', order: 20 },
  docs: { label: 'Docs', kind: 'docs', order: 30 },
  documentation: { label: 'Docs', kind: 'docs', order: 30 },
  release: { label: 'Latest release', kind: 'release', order: 40 },
  releases: { label: 'Releases', kind: 'release', order: 40 },
  latest_release: { label: 'Latest release', kind: 'release', order: 40 },
  latest: { label: 'Latest release', kind: 'release', order: 40 },
  chrome: { label: 'Chrome Web Store', kind: 'chrome', order: 50 },
  chromium: { label: 'Chrome Web Store', kind: 'chrome', order: 50 },
  chrome_web_store: { label: 'Chrome Web Store', kind: 'chrome', order: 50 },
  chromium_store: { label: 'Chrome Web Store', kind: 'chrome', order: 50 },
  firefox: { label: 'Firefox Add-ons', kind: 'firefox', order: 60 },
  firefox_addons: { label: 'Firefox Add-ons', kind: 'firefox', order: 60 },
  firefox_store: { label: 'Firefox Add-ons', kind: 'firefox', order: 60 },
  amo: { label: 'Firefox Add-ons', kind: 'firefox', order: 60 },
};

export function resolveLinkCards(links: readonly LinkCardInput[]): LinkCardInfo[] {
  return links.map(resolveLinkCard);
}

export function resolveLinkCard(link: LinkCardInput): LinkCardInfo {
  const descriptor = descriptorFor(link.kind ?? link.label ?? 'other');
  const url = parseExternalUrl(link.label ?? link.kind ?? 'link', link.href);

  return {
    label: link.label ?? descriptor.label,
    href: link.href,
    detail: link.detail ?? displayHost(url),
    kind: descriptor.kind,
  };
}

export function resolveLinkRecord(links: Record<string, string> | undefined): LinkCardInfo[] {
  if (!links) return [];

  return Object.entries(links)
    .map(([key, href]) => resolveLinkCard({ kind: key, href }))
    .sort((left, right) => {
      const leftOrder = descriptorFor(left.kind).order;
      const rightOrder = descriptorFor(right.kind).order;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label);
    });
}

function descriptorFor(key: string): LinkDescriptor {
  const normalizedKey = normalizeKey(key);
  const descriptor = LINK_DESCRIPTORS[normalizedKey];
  if (descriptor) return descriptor;
  return { label: titleCase(key), kind: 'other', order: 100 };
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function titleCase(value: string): string {
  const words = value.trim().replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Link';
  return words.map((word) => `${word[0]!.toUpperCase()}${word.slice(1).toLowerCase()}`).join(' ');
}

function parseExternalUrl(label: string, href: string): URL {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
    return url;
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new Error(`Invalid link card URL for ${JSON.stringify(label)}: ${href}${detail}`);
  }
}

function displayHost(url: URL): string {
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.replace(/\/$/, '');
  if (!path || path === '/') return host;
  return `${host}${path}`;
}

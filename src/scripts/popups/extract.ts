/** Content extraction from cached documents — page, section, footnote */

import type { PopupContent, PopupTarget, CachedDocument, PopupContentType } from './types';
import { getAnnotation } from './annotations';

const REMOVE_SELECTORS = '.sidenote, script, style, .todo-marker';

/** Strip inline event handler attributes (on*) from all elements */
function stripEventHandlers(root: HTMLElement): void {
  const all = root.querySelectorAll('*');
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

function cleanClone(element: Element): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(REMOVE_SELECTORS).forEach((el) => el.remove());
  stripEventHandlers(clone);
  return clone;
}


function extractPageContent(doc: Document, path: string): PopupContent | null {
  const prose = doc.querySelector('.prose');
  if (!prose) return null;

  const cleaned = cleanClone(prose);
  const title = doc.querySelector('h1')?.textContent?.trim() ?? '';

  return {
    title,
    bodyHtml: cleaned.innerHTML,
    href: path,
    contentType: 'page',
  };
}

function extractSectionContent(doc: Document, hash: string, path: string): PopupContent | null {
  const headingId = hash.replace(/^#/, '');
  const heading = doc.getElementById(headingId);
  if (!heading) return null;

  const headingLevel = parseInt(heading.tagName.substring(1), 10);
  if (isNaN(headingLevel)) return null;

  // Collect siblings until next heading of equal or higher level
  const container = document.createElement('div');
  container.appendChild(heading.cloneNode(true));

  let sibling = heading.nextElementSibling;
  while (sibling) {
    const siblingTag = sibling.tagName;
    if (/^H[1-6]$/.test(siblingTag)) {
      const siblingLevel = parseInt(siblingTag.substring(1), 10);
      if (siblingLevel <= headingLevel) break;
    }
    container.appendChild(sibling.cloneNode(true));
    sibling = sibling.nextElementSibling;
  }

  // Clean and sanitize
  container.querySelectorAll(REMOVE_SELECTORS).forEach((el) => el.remove());
  stripEventHandlers(container);

  const title = heading.textContent?.trim() ?? '';

  return {
    title,
    bodyHtml: container.innerHTML,
    href: `${path}#${headingId}`,
    contentType: 'section',
  };
}

function extractFootnoteContent(doc: Document, footnoteId: string): PopupContent | null {
  const sidenote = doc.querySelector(`.sidenote[data-footnote-id="${footnoteId}"]`);
  if (!sidenote) return null;

  const clone = sidenote.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.sidenote-number').forEach((el) => el.remove());
  stripEventHandlers(clone);

  return {
    title: `Footnote ${footnoteId}`,
    bodyHtml: clone.innerHTML,
    href: `#sidenote-${footnoteId}`,
    contentType: 'footnote',
  };
}

export function extractContent(cached: CachedDocument, target: PopupTarget): PopupContent | null {
  switch (target.contentType) {
    case 'page':
      return extractPageContent(cached.doc, target.path);
    case 'section':
      return target.hash
        ? extractSectionContent(cached.doc, target.hash, target.path)
        : extractPageContent(cached.doc, target.path);
    case 'footnote':
      return target.footnoteId
        ? extractFootnoteContent(cached.doc, target.footnoteId)
        : null;
    case 'external':
      // External content is built from annotations, not the cached document.
      return null;
  }
}

/** Classify an anchor element into a PopupTarget, or null if it should not get a popup */
export function classifyTarget(anchor: HTMLAnchorElement): PopupTarget | null {
  const href = anchor.getAttribute('href');
  if (!href) return null;

  // Footnote reference
  if (anchor.classList.contains('footnote-number')) {
    const fnRef = anchor.closest('.footnote-ref');
    const fnHref = anchor.getAttribute('href');
    if (fnHref?.startsWith('#sidenote-')) {
      const footnoteId = fnHref.replace('#sidenote-', '');
      return {
        anchor,
        path: window.location.pathname,
        hash: null,
        contentType: 'footnote' as PopupContentType,
        footnoteId,
      };
    }
    return null;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }

  // External links: preview from build-time annotations when one exists.
  // Opt out per-link with `no-annotation`, and skip the README-style link cards
  // which already present their own treatment.
  if (url.origin !== window.location.origin) {
    if (
      anchor.classList.contains('no-annotation') ||
      anchor.classList.contains('external-link-card')
    ) {
      return null;
    }
    if (!getAnnotation(anchor.href)) return null;
    return {
      anchor,
      path: anchor.href,
      hash: null,
      contentType: 'external',
      footnoteId: null,
    };
  }

  // Normalize path
  let path = url.pathname;
  if (path.endsWith('/')) path = path.slice(0, -1);
  if (path === '') path = '/';

  const hash = url.hash || null;
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  // Same-page anchor links — skip (no popup for same-page jumps)
  if (path === currentPath && hash) return null;
  // Self-link with no hash — skip
  if (path === currentPath && !hash) return null;

  const contentType: PopupContentType = hash ? 'section' : 'page';

  return {
    anchor,
    path,
    hash,
    contentType,
    footnoteId: null,
  };
}

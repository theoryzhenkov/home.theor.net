/**
 * Popup link previews - shows page title and description on hover
 */

interface PopupData {
  title: string;
  description?: string;
  excerpt?: string;
  status?: string;
  tags?: string[];
}

type PopupIndex = Record<string, PopupData>;

let popupIndex: PopupIndex | null = null;
let popupElement: HTMLElement | null = null;
let currentTarget: HTMLElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

async function loadPopupIndex(): Promise<PopupIndex> {
  if (popupIndex) return popupIndex;
  
  try {
    const response = await fetch('/popup-index.json');
    popupIndex = await response.json();
    return popupIndex!;
  } catch {
    console.warn('Failed to load popup index');
    return {};
  }
}

function createPopupElement(): HTMLElement {
  if (popupElement) return popupElement;
  
  popupElement = document.createElement('div');
  popupElement.className = 'link-popup';
  popupElement.innerHTML = `
    <div class="link-popup-content">
      <h4 class="link-popup-title"></h4>
      <p class="link-popup-description"></p>
      <div class="link-popup-meta">
        <span class="link-popup-status"></span>
        <span class="link-popup-tags"></span>
      </div>
    </div>
  `;
  document.body.appendChild(popupElement);
  
  // Keep popup visible when hovering over it
  popupElement.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  popupElement.addEventListener('mouseleave', () => {
    hidePopup();
  });
  
  return popupElement;
}

function showPopup(target: HTMLElement, data: PopupData) {
  const popup = createPopupElement();
  
  // Fill content
  const title = popup.querySelector('.link-popup-title') as HTMLElement;
  const description = popup.querySelector('.link-popup-description') as HTMLElement;
  const status = popup.querySelector('.link-popup-status') as HTMLElement;
  const tags = popup.querySelector('.link-popup-tags') as HTMLElement;
  
  title.textContent = data.title;
  description.textContent = data.description || '';
  
  // Only show meta section if there's status or tags
  const meta = popup.querySelector('.link-popup-meta') as HTMLElement;
  const hasStatus = !!data.status;
  const hasTags = data.tags && data.tags.length > 0;
  
  if (hasStatus || hasTags) {
    meta.style.display = '';
    status.textContent = hasStatus ? data.status!.replace('-', ' ') : '';
    status.dataset.status = data.status || '';
    status.style.display = hasStatus ? '' : 'none';
    tags.textContent = hasTags ? data.tags!.join(', ') : '';
    tags.style.display = hasTags ? '' : 'none';
  } else {
    meta.style.display = 'none';
  }
  
  // Position popup
  const rect = target.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  
  // Default: below and to the right
  let top = rect.bottom + scrollY + 8;
  let left = rect.left + scrollX;
  
  // Show popup to calculate dimensions
  popup.style.visibility = 'hidden';
  popup.style.display = 'block';
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  
  const popupRect = popup.getBoundingClientRect();
  
  // Adjust if off-screen
  if (left + popupRect.width > window.innerWidth - 20) {
    left = window.innerWidth - popupRect.width - 20 + scrollX;
  }
  
  if (top + popupRect.height > window.innerHeight + scrollY - 20) {
    // Show above instead
    top = rect.top + scrollY - popupRect.height - 8;
  }
  
  popup.style.top = `${top}px`;
  popup.style.left = `${Math.max(20, left)}px`;
  popup.style.visibility = 'visible';
  popup.classList.add('visible');
  
  currentTarget = target;
}

function hidePopup() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  
  hideTimeout = setTimeout(() => {
    if (popupElement) {
      popupElement.classList.remove('visible');
      popupElement.style.display = 'none';
    }
    currentTarget = null;
    hideTimeout = null;
  }, 100);
}

function getInternalPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    
    // Only handle internal links
    if (url.origin !== window.location.origin) return null;
    
    // Normalize path
    let path = url.pathname;
    if (path.endsWith('/')) path = path.slice(0, -1);
    if (path === '') path = '/';
    
    return path;
  } catch {
    return null;
  }
}

async function handleLinkHover(event: MouseEvent) {
  const target = event.target;
  
  // Ensure target is an Element
  if (!(target instanceof Element)) return;
  
  const link = target.closest('a');
  if (!link) return;
  
  // Skip if we're already showing popup for this link
  if (link === currentTarget) return;
  
  const href = link.getAttribute('href');
  if (!href) return;
  
  const path = getInternalPath(href);
  if (!path) return;
  
  // Don't show popup for current page
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === currentPath) return;
  
  // Cancel any pending hide
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  const index = await loadPopupIndex();
  const data = index[path];
  
  if (data) {
    showPopup(link, data);
  }
}

function handleLinkLeave(event: MouseEvent) {
  const target = event.target;
  
  // Ensure target is an Element
  if (!(target instanceof Element)) return;
  
  const link = target.closest('a');
  if (!link) return;
  
  // Check if we're moving to the popup
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget?.closest?.('.link-popup')) return;
  
  hidePopup();
}

export function initPopups() {
  // Use event delegation on article (includes header, body, footer)
  // mouseover/mouseout bubble properly for event delegation (unlike mouseenter/mouseleave)
  const article = document.querySelector('.article');
  if (article) {
    article.addEventListener('mouseover', handleLinkHover as unknown as EventListener);
    article.addEventListener('mouseout', handleLinkLeave as unknown as EventListener);
  }
}

// Auto-init
if (typeof window !== 'undefined') {
  document.addEventListener('astro:page-load', initPopups);
  // Also init on first load for non-SPA navigation
  if (document.readyState === 'complete') {
    initPopups();
  } else {
    document.addEventListener('DOMContentLoaded', initPopups);
  }
}

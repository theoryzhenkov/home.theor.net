/** Popup system orchestrator — Astro lifecycle integration */

import {
  handleMouseOver, handleMouseOut, handleClick, handleKeydown,
  handlePopupInternalMouseOver, handleScroll, handleMouseMoveGlobal,
  handlePopupFocus, resetState,
} from './events';
import { clearCache } from './cache';
import { loadAnnotations } from './annotations';
import { destroyTaskbar, handleTaskbarResize } from './taskbar';

let boundArticle: HTMLElement | null = null;

function init(): void {
  if (boundArticle) cleanup();

  const article = document.querySelector('article');
  if (!article) return;

  boundArticle = article as HTMLElement;

  // Ensure external-link annotations are loading before the first hover.
  loadAnnotations();

  // Mouse events for desktop hover popups — on article for page links
  boundArticle.addEventListener('mouseover', handleMouseOver as EventListener);
  boundArticle.addEventListener('mouseout', handleMouseOut as EventListener);

  // Also listen on document for links inside popups (which are outside article)
  document.addEventListener('mouseover', handlePopupInternalMouseOver as EventListener);

  // Click events for mobile popins
  boundArticle.addEventListener('click', handleClick as EventListener);

  // Escape key and keyboard tiling
  document.addEventListener('keydown', handleKeydown);

  // Scroll suppression
  document.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('mousemove', handleMouseMoveGlobal, { passive: true });

  // Click-to-front z-order
  document.addEventListener('mousedown', handlePopupFocus as EventListener);

  // Taskbar layout on resize
  window.addEventListener('resize', handleTaskbarResize);

  // Register cleanup for Astro navigation
  document.addEventListener('astro:before-preparation', cleanup, { once: true });
}

function cleanup(): void {
  if (boundArticle) {
    boundArticle.removeEventListener('mouseover', handleMouseOver as EventListener);
    boundArticle.removeEventListener('mouseout', handleMouseOut as EventListener);
    boundArticle.removeEventListener('click', handleClick as EventListener);
    boundArticle = null;
  }

  document.removeEventListener('mouseover', handlePopupInternalMouseOver as EventListener);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('scroll', handleScroll);
  document.removeEventListener('mousemove', handleMouseMoveGlobal);
  document.removeEventListener('mousedown', handlePopupFocus as EventListener);
  window.removeEventListener('resize', handleTaskbarResize);

  // resetState → clearAll triggers onRemove callback which tears down drag/resize per popup
  resetState();
  destroyTaskbar();
  clearCache();
}

// Astro SPA lifecycle
document.addEventListener('astro:page-load', init);

// Non-SPA fallback
if (document.readyState === 'complete') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

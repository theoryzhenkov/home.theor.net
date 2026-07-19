/** Taskbar strip for minimized popups — dynamic vertical/horizontal layout */

import type { PopupInstance } from './types';
import { findPopupById, focusPopup, updateZOrder } from './stack';
import { showPopup } from './render';

let taskbarEl: HTMLElement | null = null;
const taskbarItems = new Map<string, HTMLElement>();

function ensureTaskbar(): HTMLElement {
  if (taskbarEl && document.body.contains(taskbarEl)) return taskbarEl;

  taskbarEl = document.createElement('div');
  taskbarEl.className = 'popup-taskbar';
  updateTaskbarLayout();
  document.body.appendChild(taskbarEl);
  return taskbarEl;
}

function updateTaskbarLayout(): void {
  if (!taskbarEl) return;
  const isLandscape = window.innerWidth > window.innerHeight;
  taskbarEl.classList.toggle('popup-taskbar-vertical', isLandscape);
  taskbarEl.classList.toggle('popup-taskbar-horizontal', !isLandscape);
}

export function handleTaskbarResize(): void {
  updateTaskbarLayout();
}

export function minimize(instance: PopupInstance): void {
  // Save current rect
  const rect = instance.element.getBoundingClientRect();
  instance.savedRect = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  instance.isMinimized = true;

  // Hide the popup
  instance.element.style.display = 'none';

  // Create taskbar item
  const bar = ensureTaskbar();
  const item = document.createElement('button');
  item.className = 'popup-taskbar-item';
  item.title = instance.element.querySelector('.popup-titlebar-link')?.textContent ?? 'Popup';
  item.textContent = item.title.slice(0, 3);
  item.addEventListener('click', () => restore(instance.id));

  taskbarItems.set(instance.id, item);
  bar.appendChild(item);
  bar.classList.add('popup-taskbar-visible');

  updateZOrder();
}

export function restore(id: string): void {
  const instance = findPopupById(id);
  if (!instance) return;

  instance.isMinimized = false;
  instance.element.style.display = '';

  // Restore saved position
  if (instance.savedRect) {
    instance.element.style.top = `${instance.savedRect.top}px`;
    instance.element.style.left = `${instance.savedRect.left}px`;
    instance.element.style.width = `${instance.savedRect.width}px`;
    instance.element.style.height = `${instance.savedRect.height}px`;
    instance.savedRect = null;
  }

  showPopup(instance.element);
  focusPopup(instance.id);

  removeFromTaskbar(id);
}

export function removeFromTaskbar(id: string): void {
  const item = taskbarItems.get(id);
  if (item) {
    item.remove();
    taskbarItems.delete(id);
  }

  // Auto-hide when empty
  if (taskbarItems.size === 0 && taskbarEl) {
    taskbarEl.classList.remove('popup-taskbar-visible');
  }
}

export function destroyTaskbar(): void {
  if (taskbarEl) {
    taskbarEl.remove();
    taskbarEl = null;
  }
  taskbarItems.clear();
}

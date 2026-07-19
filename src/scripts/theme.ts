export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

export const THEME_STORAGE_KEY = 'theor-theme';
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_CHANGE_EVENT = 'theor:theme-change';

type ThemeSubscriber = (theme: Theme) => void;

const subscribers = new Set<ThemeSubscriber>();
let mediaQuery: MediaQueryList | null = null;
let rootObserver: MutationObserver | null = null;
let lastNotifiedTheme: Theme | null = null;

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

function readRootTheme(): Theme | null {
  const root = getRoot();
  if (!root) return null;

  const theme = root.getAttribute(THEME_ATTRIBUTE);
  if (isTheme(theme)) return theme;
  if (root.classList.contains('dark')) return 'dark';
  return null;
}

function writeTheme(theme: Theme): void {
  const root = getRoot();
  if (!root) return;

  root.setAttribute(THEME_ATTRIBUTE, theme);
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function emitThemeChange(theme: Theme): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme },
    }),
  );
}

function notifyThemeChange(theme: Theme): void {
  if (theme === lastNotifiedTheme) return;

  lastNotifiedTheme = theme;
  subscribers.forEach((callback) => callback(theme));
  emitThemeChange(theme);
}

function syncThemeFromSystem(): void {
  if (getStoredTheme() !== null) return;

  const theme = getSystemTheme();
  writeTheme(theme);
  notifyThemeChange(theme);
}

function ensureThemeObserver(): void {
  if (typeof window === 'undefined') return;

  if (!mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', syncThemeFromSystem);
  }

  if (!rootObserver) {
    const root = getRoot();
    if (!root) return;

    rootObserver = new MutationObserver(() => {
      const theme = readRootTheme();
      if (!theme) return;
      notifyThemeChange(theme);
    });
    rootObserver.observe(root, {
      attributes: true,
      attributeFilter: [THEME_ATTRIBUTE],
    });
  }
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference = getStoredTheme() ?? 'system'): Theme {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function getTheme(): Theme {
  return readRootTheme() ?? resolveTheme();
}

export function initializeTheme(): Theme {
  ensureThemeObserver();

  const theme = getTheme();
  writeTheme(theme);
  notifyThemeChange(theme);
  return theme;
}

export function setTheme(theme: Theme, options: { persist?: boolean } = {}): Theme {
  const { persist = true } = options;

  writeTheme(theme);

  if (typeof window !== 'undefined') {
    try {
      if (persist) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } else {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures and still apply the in-memory theme.
    }
  }

  notifyThemeChange(theme);
  return theme;
}

export function toggleTheme(): Theme {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function syncThemeToggleLabel(
  button: HTMLButtonElement | null,
  theme: Theme = getTheme(),
): void {
  if (!button) return;

  button.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );
}

export function subscribeThemeChange(
  callback: ThemeSubscriber,
  options: { immediate?: boolean } = {},
): () => void {
  const { immediate = true } = options;

  ensureThemeObserver();
  subscribers.add(callback);

  if (immediate) {
    callback(getTheme());
  }

  return () => {
    subscribers.delete(callback);
  };
}

export function getThemeBootScript(): string {
  return `(() => {
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const themeAttribute = ${JSON.stringify(THEME_ATTRIBUTE)};
    const root = document.documentElement;

    const getStoredTheme = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        return stored === 'light' || stored === 'dark' ? stored : null;
      } catch {
        return null;
      }
    };

    const theme =
      getStoredTheme() ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    root.setAttribute(themeAttribute, theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  })();`;
}

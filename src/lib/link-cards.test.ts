import { describe, expect, it } from 'bun:test';
import { resolveLinkCard, resolveLinkCards, resolveLinkRecord } from './link-cards';

describe('resolveLinkCard', () => {
  it('normalizes known link labels and kinds', () => {
    expect(resolveLinkCard({ kind: 'chrome', href: 'https://chromewebstore.google.com/detail/example' })).toEqual({
      label: 'Chrome Web Store',
      href: 'https://chromewebstore.google.com/detail/example',
      detail: 'chromewebstore.google.com/detail/example',
      kind: 'chrome',
    });
  });

  it('preserves manual labels and details', () => {
    expect(resolveLinkCard({
      kind: 'website',
      label: 'Try it',
      href: 'https://example.com/',
      detail: 'live demo',
    })).toEqual({
      label: 'Try it',
      href: 'https://example.com/',
      detail: 'live demo',
      kind: 'website',
    });
  });

  it('rejects invalid urls', () => {
    expect(() => resolveLinkCard({ label: 'Website', href: '/local' })).toThrow('Invalid link card URL for "Website": /local');
  });
});

describe('resolveLinkCards', () => {
  it('preserves manual order', () => {
    const links = resolveLinkCards([
      { kind: 'firefox', href: 'https://addons.mozilla.org/addon/example' },
      { kind: 'github', href: 'https://github.com/theoryzhenkov/example' },
      { kind: 'release', href: 'https://github.com/theoryzhenkov/example/releases/latest' },
    ]);

    expect(links.map((link) => link.label)).toEqual([
      'Firefox Add-ons',
      'GitHub',
      'Latest release',
    ]);
  });
});

describe('resolveLinkRecord', () => {
  it('sorts record links in a stable display order for tables', () => {
    const links = resolveLinkRecord({
      Firefox: 'https://addons.mozilla.org/addon/example',
      GitHub: 'https://github.com/theoryzhenkov/example',
      Release: 'https://github.com/theoryzhenkov/example/releases/latest',
      Website: 'https://example.com',
    });

    expect(links.map((link) => link.label)).toEqual([
      'GitHub',
      'Website',
      'Latest release',
      'Firefox Add-ons',
    ]);
  });
});

import { describe, it, expect } from 'bun:test';
import { slugToHref, pathToSlug } from './slugs';

describe('slugToHref', () => {
  it('converts index slug to root path', () => {
    expect(slugToHref('index')).toBe('/');
  });

  it('converts regular slug to path with trailing slash', () => {
    expect(slugToHref('about')).toBe('/about/');
  });

  it('converts nested slug to nested path', () => {
    expect(slugToHref('projects/foo')).toBe('/projects/foo/');
  });
});

describe('pathToSlug', () => {
  it('converts root path to index', () => {
    expect(pathToSlug('/')).toBe('index');
  });

  it('strips leading slash', () => {
    expect(pathToSlug('/about')).toBe('about');
  });

  it('strips trailing slash', () => {
    expect(pathToSlug('/about/')).toBe('about');
  });

  it('handles nested paths', () => {
    expect(pathToSlug('/projects/foo')).toBe('projects/foo');
  });
});

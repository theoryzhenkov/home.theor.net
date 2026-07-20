import { describe, expect, it } from 'bun:test';
import { addHeadingIds, extractHtmlHeadings } from './html-content';

describe('HTML heading helpers', () => {
  it('adds stable ids to h2 and h3 headings', () => {
    expect(addHeadingIds('<h2>Hello World</h2><h3>Hello World</h3><h2 id="kept">Kept</h2>')).toBe(
      '<h2 id="hello-world">Hello World</h2><h3 id="hello-world-2">Hello World</h3><h2 id="kept">Kept</h2>',
    );
  });

  it('extracts h2 and h3 headings with word counts', () => {
    expect(extractHtmlHeadings('<h2>One</h2><p>a b c</p><h3>Two</h3><p>d e</p>')).toEqual([
      { depth: 2, slug: 'one', text: 'One', wordCount: 7 },
      { depth: 3, slug: 'two', text: 'Two', wordCount: 3 },
    ]);
  });
});

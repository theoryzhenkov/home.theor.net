import { describe, it, expect } from 'bun:test';
import {
  parseRelationList,
  addUniqueTarget,
  addUnique,
  extractLinkSlugs,
  buildGraphFromPages,
  getBreadcrumbs,
  getPageRelations,
  type PageInput,
  type RelationTarget,
} from './relations';

// -- Helpers --

function makePage(id: string, overrides: Partial<PageInput> = {}): PageInput {
  return {
    id,
    data: { title: id, ...overrides.data } as PageInput['data'],
    body: overrides.body ?? '',
  };
}

const KNOWN = new Set(['alpha', 'beta', 'gamma', 'index']);

// -- parseRelationList --

describe('parseRelationList', () => {
  it('returns empty array for undefined', () => {
    expect(parseRelationList(undefined)).toEqual([]);
  });

  it('parses entries without labels', () => {
    expect(parseRelationList([{ page: 'foo' }])).toEqual([{ slug: 'foo' }]);
  });

  it('parses entries with labels', () => {
    expect(parseRelationList([{ page: 'foo', label: 'bar' }])).toEqual([{ slug: 'foo', label: 'bar' }]);
  });
});

// -- addUniqueTarget / addUnique --

describe('addUniqueTarget', () => {
  it('adds to empty array', () => {
    const arr: RelationTarget[] = [];
    addUniqueTarget(arr, 'x');
    expect(arr).toEqual([{ slug: 'x' }]);
  });

  it('deduplicates by slug', () => {
    const arr: RelationTarget[] = [{ slug: 'x' }];
    addUniqueTarget(arr, 'x', 'label');
    expect(arr).toHaveLength(1);
  });
});

describe('addUnique', () => {
  it('adds to empty array', () => {
    const arr: string[] = [];
    addUnique(arr, 'a');
    expect(arr).toEqual(['a']);
  });

  it('deduplicates', () => {
    const arr = ['a'];
    addUnique(arr, 'a');
    expect(arr).toEqual(['a']);
  });
});

// -- extractLinkSlugs --

describe('extractLinkSlugs', () => {
  it('extracts markdown links to known pages', () => {
    expect(extractLinkSlugs('[go](/beta)', 'alpha', KNOWN)).toEqual(['beta']);
  });

  it('normalizes relative markdown links', () => {
    expect(extractLinkSlugs('[go](./beta)', 'alpha', KNOWN)).toEqual(['beta']);
  });

  it('ignores external links', () => {
    expect(extractLinkSlugs('[ext](https://example.com)', 'alpha', KNOWN)).toEqual([]);
  });

  it('ignores anchor links', () => {
    expect(extractLinkSlugs('[s](#section)', 'alpha', KNOWN)).toEqual([]);
  });

  it('ignores mailto links', () => {
    expect(extractLinkSlugs('[e](mailto:a@b.c)', 'alpha', KNOWN)).toEqual([]);
  });

  it('ignores self-references', () => {
    expect(extractLinkSlugs('[self](/alpha)', 'alpha', KNOWN)).toEqual([]);
  });

  it('ignores unknown slugs', () => {
    expect(extractLinkSlugs('[x](/unknown)', 'alpha', KNOWN)).toEqual([]);
  });

  it('deduplicates markdown links', () => {
    expect(extractLinkSlugs('[a](/beta) [b](/beta)', 'alpha', KNOWN)).toEqual(['beta']);
  });

  it('extracts multiple distinct links', () => {
    expect(extractLinkSlugs('[a](/beta) [b](/gamma)', 'alpha', KNOWN)).toEqual(['beta', 'gamma']);
  });
});

// -- buildGraphFromPages --

describe('buildGraphFromPages', () => {
  it('infers down from up', () => {
    const { graph } = buildGraphFromPages([
      makePage('child', { data: { title: 'Child', up: [{ page: 'parent' }] } }),
      makePage('parent'),
    ]);
    expect(graph.get('parent')!.down.map(t => t.slug)).toContain('child');
  });

  it('infers has from is', () => {
    const { graph } = buildGraphFromPages([
      makePage('item', { data: { title: 'Item', is: [{ page: 'category' }] } }),
      makePage('category'),
    ]);
    expect(graph.get('category')!.has.map(t => t.slug)).toContain('item');
  });

  it('infers has_part from part_of', () => {
    const { graph } = buildGraphFromPages([
      makePage('chapter', { data: { title: 'Chapter', part_of: [{ page: 'book' }] } }),
      makePage('book'),
    ]);
    expect(graph.get('book')!.has_part.map(t => t.slug)).toContain('chapter');
  });

  it('infers part_of from has_part', () => {
    const { graph } = buildGraphFromPages([
      makePage('book', { data: { title: 'Book', has_part: [{ page: 'chapter' }] } }),
      makePage('chapter'),
    ]);
    expect(graph.get('chapter')!.part_of.map(t => t.slug)).toContain('book');
  });

  it('infers superclass_of from subclass_of', () => {
    const { graph } = buildGraphFromPages([
      makePage('child-class', { data: { title: 'Child Class', subclass_of: [{ page: 'parent-class' }] } }),
      makePage('parent-class'),
    ]);
    expect(graph.get('parent-class')!.superclass_of.map(t => t.slug)).toContain('child-class');
  });

  it('infers subject_of from subject', () => {
    const { graph } = buildGraphFromPages([
      makePage('essay', { data: { title: 'Essay', subject: [{ page: 'topic' }] } }),
      makePage('topic'),
    ]);
    expect(graph.get('topic')!.subject_of.map(t => t.slug)).toContain('essay');
  });

  it('infers creator_of from creator', () => {
    const { graph } = buildGraphFromPages([
      makePage('essay', { data: { title: 'Essay', creator: [{ page: 'author' }] } }),
      makePage('author'),
    ]);
    expect(graph.get('author')!.creator_of.map(t => t.slug)).toContain('essay');
  });

  it('infers related symmetrically', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', related: [{ page: 'b' }] } }),
      makePage('b'),
    ]);
    expect(graph.get('b')!.related.map(t => t.slug)).toContain('a');
  });

  it('infers prev from next', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', next: 'b' } }),
      makePage('b'),
    ]);
    expect(graph.get('b')!.prev).toBe('a');
  });

  it('infers next from prev', () => {
    const { graph } = buildGraphFromPages([
      makePage('a'),
      makePage('b', { data: { title: 'B', prev: 'a' } }),
    ]);
    expect(graph.get('a')!.next).toBe('b');
  });

  it('infers refi from ref (markdown link)', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { body: '[link](/b)' }),
      makePage('b'),
    ]);
    expect(graph.get('a')!.ref).toContain('b');
    expect(graph.get('b')!.refi).toContain('a');
  });

  it('infers ref from frontmatter refi', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', refi: ['b'] } }),
      makePage('b'),
    ]);
    expect(graph.get('a')!.refi).toContain('b');
    expect(graph.get('b')!.ref).toContain('a');
  });

  it('merges frontmatter ref with auto-extracted refs', () => {
    const { graph } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', ref: ['c'] }, body: '[link](/b)' }),
      makePage('b'),
      makePage('c'),
    ]);
    expect(graph.get('a')!.ref).toContain('b');
    expect(graph.get('a')!.ref).toContain('c');
  });

  it('builds page info map', () => {
    const { pages } = buildGraphFromPages([
      makePage('foo', { data: { title: 'Foo Page' } }),
    ]);
    expect(pages.get('foo')).toEqual({ slug: 'foo', title: 'Foo Page' });
  });
});

// -- getBreadcrumbs --

describe('getBreadcrumbs', () => {
  it('returns linear part_of chain from root to current', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('root'),
      makePage('mid', { data: { title: 'Mid', part_of: [{ page: 'root' }] } }),
      makePage('leaf', { data: { title: 'Leaf', part_of: [{ page: 'mid' }] } }),
    ]);
    const crumbs = getBreadcrumbs('leaf', graph, pages);
    expect(crumbs.map(c => c.slug)).toEqual(['root', 'mid', 'leaf']);
  });

  it('falls back to up chain for legacy pages', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('root'),
      makePage('mid', { data: { title: 'Mid', up: [{ page: 'root' }] } }),
      makePage('leaf', { data: { title: 'Leaf', up: [{ page: 'mid' }] } }),
    ]);
    const crumbs = getBreadcrumbs('leaf', graph, pages);
    expect(crumbs.map(c => c.slug)).toEqual(['root', 'mid', 'leaf']);
  });

  it('prefers part_of over up for breadcrumbs', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('route-parent'),
      makePage('semantic-parent'),
      makePage('leaf', {
        data: {
          title: 'Leaf',
          up: [{ page: 'route-parent' }],
          part_of: [{ page: 'semantic-parent' }],
        },
      }),
    ]);
    const crumbs = getBreadcrumbs('leaf', graph, pages);
    expect(crumbs.map(c => c.slug)).toEqual(['semantic-parent', 'leaf']);
  });

  it('handles cycle without infinite loop', () => {
    const { graph, pages } = buildGraphFromPages([
      makePage('a', { data: { title: 'A', up: [{ page: 'b' }] } }),
      makePage('b', { data: { title: 'B', up: [{ page: 'a' }] } }),
    ]);
    const crumbs = getBreadcrumbs('a', graph, pages);
    expect(crumbs.length).toBeLessThanOrEqual(2);
  });

  it('returns single entry for root page', () => {
    const { graph, pages } = buildGraphFromPages([makePage('root')]);
    const crumbs = getBreadcrumbs('root', graph, pages);
    expect(crumbs).toEqual([{ slug: 'root', title: 'root' }]);
  });

  it('returns empty for unknown slug', () => {
    const { graph, pages } = buildGraphFromPages([makePage('a')]);
    expect(getBreadcrumbs('unknown', graph, pages)).toEqual([]);
  });
});

// -- getPageRelations --

describe('getPageRelations', () => {
  it('returns relations for existing page', () => {
    const { graph } = buildGraphFromPages([makePage('a')]);
    expect(getPageRelations('a', graph)).toBeDefined();
  });

  it('returns undefined for missing page', () => {
    const { graph } = buildGraphFromPages([makePage('a')]);
    expect(getPageRelations('missing', graph)).toBeUndefined();
  });
});

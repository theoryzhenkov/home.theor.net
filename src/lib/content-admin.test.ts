import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  archivePage,
  bumpPageModified,
  contentRootFromEnv,
  createPage,
  ensurePageFrontmatter,
  listPages,
  normalizePagePath,
  renderNewPage,
  slugifyTitle,
  titleFromSlug,
  updateModifiedFrontmatter,
} from './content-admin';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'home-content-admin-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('contentRootFromEnv', () => {
  it('uses the default content root when no override is set', () => {
    expect(contentRootFromEnv({})).toBe('src/content/pages');
  });

  it('uses CONTENT_PAGES_DIR when set', () => {
    expect(contentRootFromEnv({ CONTENT_PAGES_DIR: 'notes/pages' })).toBe('notes/pages');
  });
});

describe('titleFromSlug', () => {
  it('creates a readable title from the last slug segment', () => {
    expect(titleFromSlug('notes/small-thought')).toBe('Small Thought');
  });
});

describe('slugifyTitle', () => {
  it('converts titles to url-safe slugs', () => {
    expect(slugifyTitle('Agents & Classic Rock!')).toBe('agents-and-classic-rock');
  });

  it('preserves path separators for explicit nested slugs', () => {
    expect(slugifyTitle('blog/Agents & Rock')).toBe('blog/agents-and-rock');
  });
});

describe('normalizePagePath', () => {
  it('normalizes a path relative to the pages directory', () => {
    expect(normalizePagePath('Ideas/Small Thought.mdx')).toBe('ideas/small-thought');
  });

  it('rejects an empty path', () => {
    expect(() => normalizePagePath('')).toThrow('Path cannot be empty.');
  });

  it('rejects paths outside the pages directory', () => {
    expect(() => normalizePagePath('../secret')).toThrow('Path cannot contain parent directory segments.');
    expect(() => normalizePagePath('/secret')).toThrow('Path must be relative to the pages directory.');
  });
});

describe('renderNewPage', () => {
  it('renders a blank metadata block for manual classification', () => {
    const page = renderNewPage({
      path: 'small-thought',
      name: 'Small Thought',
      today: '2026-05-24',
    });

    expect(page.slug).toBe('small-thought');
    expect(page.content).toBe(`---
title: "Small Thought"
description: ""
created: 2026-05-24
modified: 2026-05-24
part_of: []
is: []
subject: []
---

`);
  });
});

describe('ensurePageFrontmatter', () => {
  it('prepends default frontmatter when a new editor-created file has none', () => {
    expect(ensurePageFrontmatter({
      content: 'Body.\n',
      title: 'Small Thought',
      today: '2026-06-22',
    })).toBe(`---
title: "Small Thought"
description: ""
created: 2026-06-22
modified: 2026-06-22
part_of: []
is: []
subject: []
---

Body.
`);
  });

  it('preserves existing created date and bumps modified', () => {
    expect(ensurePageFrontmatter({
      content: `---
title: "Draft"
created: 2026-05-24
modified: 2026-05-25
---

Body.
`,
      title: 'Ignored',
      today: '2026-06-22',
    })).toBe(`---
title: "Draft"
created: 2026-05-24
modified: 2026-06-22
---

Body.
`);
  });
});

describe('updateModifiedFrontmatter', () => {
  it('replaces an existing modified field', () => {
    expect(updateModifiedFrontmatter(`---
title: "Draft"
created: 2026-05-24
modified: 2026-05-24
---

Body.
`, '2026-06-22')).toBe(`---
title: "Draft"
created: 2026-05-24
modified: 2026-06-22
---

Body.
`);
  });

  it('inserts modified after created when missing', () => {
    expect(updateModifiedFrontmatter(`---
title: "Draft"
created: 2026-05-24
---

Body.
`, '2026-06-22')).toBe(`---
title: "Draft"
created: 2026-05-24
modified: 2026-06-22
---

Body.
`);
  });

  it('does not rewrite when modified is already current', () => {
    const content = `---
title: "Draft"
created: 2026-05-24
modified: 2026-06-22
---

Body.
`;
    expect(updateModifiedFrontmatter(content, '2026-06-22')).toBe(content);
  });
});

describe('createPage and listPages', () => {
  it('writes a page and lists its summary', async () => {
    const root = await makeTempDir();

    await createPage(root, {
      path: 'web-browsing',
      name: 'Web Browsing',
      today: '2026-05-24',
    });

    const content = await readFile(join(root, 'web-browsing.mdx'), 'utf8');
    expect(content).toContain('title: "Web Browsing"');
    expect(content).toContain('created: 2026-05-24');
    expect(content).toContain('modified: 2026-05-24');

    const pages = await listPages(root);
    expect(pages).toEqual([{ 
      slug: 'web-browsing',
      title: 'Web Browsing',
      description: '',
      maturity: undefined,
      created: '2026-05-24',
      path: join(root, 'web-browsing.mdx'),
    }]);
  });

  it('refuses to overwrite an existing page', async () => {
    const root = await makeTempDir();
    const input = { path: 'about', name: 'About', today: '2026-05-24' };

    await createPage(root, input);

    await expect(createPage(root, input)).rejects.toThrow('Page already exists: about');
  });
});

describe('bumpPageModified', () => {
  it('updates modified for an existing page', async () => {
    const root = await makeTempDir();
    await createPage(root, { path: 'about', name: 'About', today: '2026-05-24' });

    await expect(bumpPageModified(root, 'about', '2026-06-22')).resolves.toBe(true);

    const content = await readFile(join(root, 'about.mdx'), 'utf8');
    expect(content).toContain('modified: 2026-06-22');
  });

  it('returns false when modified is already current', async () => {
    const root = await makeTempDir();
    await createPage(root, { path: 'about', name: 'About', today: '2026-06-22' });

    await expect(bumpPageModified(root, 'about', '2026-06-22')).resolves.toBe(false);
  });
});

describe('archivePage', () => {
  it('moves a page into a dated archive directory', async () => {
    const root = await makeTempDir();
    const archiveRoot = await makeTempDir();
    await createPage(root, { path: 'about', name: 'About', today: '2026-05-24' });

    const destination = await archivePage(root, archiveRoot, 'about', '2026-05-25');

    expect(destination).toBe(join(archiveRoot, 'deleted-pages-2026-05-25/about.mdx'));
    const content = await readFile(destination, 'utf8');
    expect(content).toContain('title: "About"');
  });
});

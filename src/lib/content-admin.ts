import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export const DEFAULT_CONTENT_ROOT = 'src/content/pages';
export const CONTENT_ROOT_ENV = 'CONTENT_PAGES_DIR';

export interface RelationEntry {
  page: string;
  label?: string;
}

export interface NewPageInput {
  path: string;
  name: string;
  today: string;
}

export interface EnsureFrontmatterInput {
  content: string;
  title: string;
  today: string;
}

export interface RenderedPage {
  slug: string;
  content: string;
}

export interface PageSummary {
  slug: string;
  title: string;
  description?: string;
  maturity?: string;
  created?: string;
  path: string;
}

export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
}

export function titleFromSlug(slug: string): string {
  const lastSegment = slug.split('/').filter(Boolean).at(-1) ?? slug;
  return lastSegment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizePagePath(path: string): string {
  const trimmedPath = path.trim().replaceAll('\\', '/').replace(/\.mdx$/, '');
  if (trimmedPath.startsWith('/')) {
    throw new Error('Path must be relative to the pages directory.');
  }
  if (trimmedPath.split('/').includes('..')) {
    throw new Error('Path cannot contain parent directory segments.');
  }

  const cleanPath = slugifyTitle(trimmedPath);
  if (!cleanPath) {
    throw new Error('Path cannot be empty.');
  }

  return cleanPath;
}

export function contentRootFromEnv(env: Record<string, string | undefined> = process.env): string {
  const configured = env[CONTENT_ROOT_ENV]?.trim();
  return configured || DEFAULT_CONTENT_ROOT;
}

export function slugToContentPath(contentRoot: string, slug: string): string {
  return join(contentRoot, `${slug}.mdx`);
}

export function pathToSlug(contentRoot: string, path: string): string {
  const rel = relative(contentRoot, path).replaceAll('\\', '/');
  return rel.replace(/\.mdx$/, '');
}

export function renderNewPage(input: NewPageInput): RenderedPage {
  const slug = normalizePagePath(input.path);
  const content = renderDefaultPageFrontmatter(input.name, input.today);

  return { slug, content };
}

export function ensurePageFrontmatter(input: EnsureFrontmatterInput): string {
  const content = input.content;
  const match = content.match(/^---\n([\s\S]*?)\n---(?=\n|$)/);
  if (!match) {
    return `${renderDefaultPageFrontmatter(input.title, input.today)}${content.trimStart()}`;
  }

  let frontmatter = match[1];
  if (!/^title:\s*.*$/m.test(frontmatter)) {
    frontmatter = `title: ${yamlScalar(input.title)}\n${frontmatter}`;
  }
  if (!/^created:\s*.*$/m.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^(title:\s*.*)$/m, `$1\ncreated: ${input.today}`);
  }
  if (/^modified:\s*.*$/m.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^modified:\s*.*$/m, `modified: ${input.today}`);
  } else if (/^created:\s*.*$/m.test(frontmatter)) {
    frontmatter = frontmatter.replace(/^(created:\s*.*)$/m, `$1\nmodified: ${input.today}`);
  } else {
    frontmatter = `${frontmatter}\nmodified: ${input.today}`;
  }

  return `---\n${frontmatter}\n---${content.slice(match[0].length)}`;
}

export async function createPage(contentRoot: string, input: NewPageInput): Promise<RenderedPage> {
  const page = renderNewPage(input);
  const path = slugToContentPath(contentRoot, page.slug);

  if (await exists(path)) {
    throw new Error(`Page already exists: ${page.slug}`);
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, page.content, 'utf8');
  return page;
}

export async function listPages(contentRoot: string): Promise<PageSummary[]> {
  const paths = await findMdxFiles(contentRoot);
  const pages = await Promise.all(paths.map(async (path) => {
    const content = await readFile(path, 'utf8');
    const frontmatter = parseFrontmatter(content);
    return {
      slug: pathToSlug(contentRoot, path),
      title: frontmatter.title ?? pathToSlug(contentRoot, path),
      description: frontmatter.description,
      maturity: frontmatter.maturity,
      created: frontmatter.created,
      path,
    } satisfies PageSummary;
  }));

  return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function archivePage(contentRoot: string, archiveRoot: string, slug: string, today: string): Promise<string> {
  const source = slugToContentPath(contentRoot, slug);
  if (!await exists(source)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  const destination = join(archiveRoot, `deleted-pages-${today}`, `${slug}.mdx`);
  if (await exists(destination)) {
    throw new Error(`Archive destination already exists: ${destination}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await rename(source, destination);
  return destination;
}

export async function deletePage(contentRoot: string, slug: string): Promise<void> {
  const source = slugToContentPath(contentRoot, slug);
  if (!await exists(source)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  await rm(source);
}

export async function bumpPageModified(contentRoot: string, slug: string, today: string): Promise<boolean> {
  const source = slugToContentPath(contentRoot, slug);
  if (!await exists(source)) {
    throw new Error(`Page does not exist: ${slug}`);
  }

  const content = await readFile(source, 'utf8');
  const updated = updateModifiedFrontmatter(content, today);
  if (updated === content) return false;

  await writeFile(source, updated, 'utf8');
  return true;
}

export function updateModifiedFrontmatter(content: string, today: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---(?=\n|$)/);
  if (!match) {
    throw new Error('Page is missing YAML frontmatter.');
  }

  const frontmatter = match[1];
  if (new RegExp(`^modified:\\s*${escapeRegExp(today)}\\s*$`, 'm').test(frontmatter)) {
    return content;
  }

  let updatedFrontmatter: string;
  if (/^modified:\s*.*$/m.test(frontmatter)) {
    updatedFrontmatter = frontmatter.replace(/^modified:\s*.*$/m, `modified: ${today}`);
  } else if (/^created:\s*.*$/m.test(frontmatter)) {
    updatedFrontmatter = frontmatter.replace(/^(created:\s*.*)$/m, `$1\nmodified: ${today}`);
  } else {
    updatedFrontmatter = `${frontmatter}\nmodified: ${today}`;
  }

  return `---\n${updatedFrontmatter}\n---${content.slice(match[0].length)}`;
}

export async function pageExists(contentRoot: string, slug: string): Promise<boolean> {
  return exists(slugToContentPath(contentRoot, slug));
}

async function findMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findMdxFiles(path);
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [path];
    return [];
  }));

  return paths.flat();
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function renderDefaultPageFrontmatter(title: string, today: string): string {
  const lines = [
    '---',
    `title: ${yamlScalar(title)}`,
    'description: ""',
    `created: ${today}`,
    `modified: ${today}`,
    'part_of: []',
    'is: []',
    'subject: []',
    '---',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const scalar = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    const value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        result[key] = JSON.parse(value) as string;
        continue;
      } catch {
        // Fall through to raw value. This is a display helper, not a YAML parser.
      }
    }
    result[key] = value;
  }

  return result;
}

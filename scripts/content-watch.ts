#!/usr/bin/env bun
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  contentRootFromEnv,
  ensurePageFrontmatter,
  pathToSlug,
  titleFromSlug,
} from '../src/lib/content-admin';

interface ParsedArgs {
  flags: Map<string, string | boolean>;
}

const args = parseArgs(process.argv.slice(2));
const contentRoot = getContentRoot(args);
const intervalMs = getIntervalMs(args);
const mtimes = new Map<string, number>();
let scanning = false;

console.log(`content-watch: watching ${contentRoot} every ${intervalMs}ms`);
await scan({ initial: true });
setInterval(() => {
  void scan({ initial: false });
}, intervalMs);

// Keep the process alive even if the event loop is otherwise empty.
await new Promise(() => {});

async function scan(options: { initial: boolean }): Promise<void> {
  if (scanning) return;
  scanning = true;

  try {
    const files = await findMdxFiles(contentRoot);
    const current = new Set(files);

    for (const [known] of mtimes) {
      if (!current.has(known)) mtimes.delete(known);
    }

    for (const file of files) {
      const stats = await stat(file);
      const previousMtime = mtimes.get(file);
      if (options.initial) {
        mtimes.set(file, stats.mtimeMs);
        continue;
      }
      if (previousMtime === stats.mtimeMs) continue;

      await processPage(file, previousMtime === undefined ? 'created' : 'changed');
      const updatedStats = await stat(file);
      mtimes.set(file, updatedStats.mtimeMs);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`content-watch: ${message}`);
  } finally {
    scanning = false;
  }
}

async function processPage(file: string, event: 'created' | 'changed'): Promise<void> {
  const content = await readFile(file, 'utf8');
  const slug = pathToSlug(contentRoot, file);
  const updated = ensurePageFrontmatter({
    content,
    title: titleFromSlug(slug),
    today: today(),
  });

  if (updated === content) return;

  await writeFile(file, updated, 'utf8');
  console.log(`content-watch: ${event === 'created' ? 'initialized' : 'updated'} ${slug}`);
}

async function findMdxFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findMdxFiles(path);
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [path];
    return [];
  }));

  return paths.flat();
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawName, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, true);
    }
  }
  return { flags };
}

function getContentRoot(args: ParsedArgs): string {
  const flag = args.flags.get('content-root');
  if (flag === true) throw new Error('--content-root requires a value.');
  if (typeof flag === 'string' && flag.trim()) return flag.trim();
  return contentRootFromEnv();
}

function getIntervalMs(args: ParsedArgs): number {
  const flag = args.flags.get('interval');
  if (flag === true) throw new Error('--interval requires a value.');
  const raw = typeof flag === 'string' ? flag : process.env.CONTENT_WATCH_INTERVAL_MS;
  const value = raw ? Number(raw) : 1000;
  if (!Number.isFinite(value) || value < 100) throw new Error('Watch interval must be at least 100ms.');
  return value;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

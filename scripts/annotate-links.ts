#!/usr/bin/env bun
/**
 * Build-time external-link annotation pipeline.
 *
 * Scans content for external URLs, fetches each page, extracts OpenGraph/meta
 * (title, description, site name), downloads the favicon + og:image into
 * `public/link-assets/` (self-hosted, no hotlinking), and writes a committed
 * cache at `src/data/link-annotations.json`. The site build consumes the cache;
 * it never fetches. Re-run this when you add external links.
 *
 *   bun run annotate            # fetch only new/missing URLs
 *   bun run annotate --refresh  # refetch everything
 *   bun run annotate --prune    # drop entries no longer present in content
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../src/data/link-annotations.config.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src/content/pages');
const CACHE_PATH = join(ROOT, 'src/data/link-annotations.json');
const ASSET_DIR = join(ROOT, 'public/link-assets');
const ASSET_PUBLIC = '/link-assets';

const SITE_HOST = 'theor.net'; // links to this apex are internal, not annotated
const FETCH_TIMEOUT_MS = 10_000;
// Stay under jj/git's 1 MiB new-file guard; oversized images fall back to a
// favicon + text card.
const MAX_ASSET_BYTES = 1_000_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; theor.net-link-annotator/1.0; +https://theor.net/)';

interface Annotation {
  url: string;
  domain: string;
  title: string;
  description?: string;
  siteName?: string;
  favicon?: string; // local /link-assets path
  image?: string; // local /link-assets path
  ok: boolean;
  fetchedAt: string;
}

const refresh = process.argv.includes('--refresh');
const prune = process.argv.includes('--prune');

// ── URL collection ──────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s)\]}"'<>]+/g;

function isExternal(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  // Apex theor.net is the site itself; subdomains (posthaste.theor.net, …) are
  // genuinely external destinations and are annotated.
  return host !== SITE_HOST && host !== `www.${SITE_HOST}`;
}

function isExcluded(url: string): boolean {
  return config.exclude.some((needle) => url.includes(needle));
}

function trimUrl(raw: string): string {
  // Strip trailing punctuation that regex commonly over-captures.
  return raw.replace(/[.,;:]+$/, '');
}

async function collectUrls(): Promise<Set<string>> {
  const urls = new Set<string>();

  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(mdx?|astro)$/.test(entry.name)) {
        const text = await readFile(full, 'utf8');
        for (const match of text.matchAll(URL_RE)) {
          const url = trimUrl(match[0]);
          if (isExternal(url) && !isExcluded(url)) urls.add(url);
        }
      }
    }
  }

  await walk(CONTENT_DIR);
  return urls;
}

// ── Metadata extraction ─────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function metaContent(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

// Match a meta tag by property/name regardless of attribute order.
function ogTag(prop: string): RegExp[] {
  return [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
  ];
}

function extractFaviconHref(html: string): string | undefined {
  const linkTags = html.match(/<link[^>]+>/gi) ?? [];
  let appleTouch: string | undefined;
  for (const tag of linkTags) {
    if (!/rel=["'][^"']*icon[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    if (/apple-touch-icon/i.test(tag)) appleTouch ??= href;
    else return href; // prefer a normal icon
  }
  return appleTouch;
}

// ── Asset download ──────────────────────────────────────────────────────────

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
};

async function downloadAsset(assetUrl: string): Promise<string | undefined> {
  try {
    const res = await fetchWithTimeout(assetUrl);
    if (!res.ok) return undefined;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!type.startsWith('image/')) return undefined;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_ASSET_BYTES) return undefined;
    const ext = EXT_BY_TYPE[type] ?? 'img';
    const name = `${createHash('sha1').update(assetUrl).digest('hex').slice(0, 16)}.${ext}`;
    await mkdir(ASSET_DIR, { recursive: true });
    await writeFile(join(ASSET_DIR, name), buf);
    return `${ASSET_PUBLIC}/${name}`;
  } catch {
    return undefined;
  }
}

// ── Fetch ───────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function annotate(url: string): Promise<Annotation> {
  const domain = new URL(url).hostname.replace(/^www\./, '');
  const base: Annotation = { url, domain, title: domain, ok: false, fetchedAt: new Date().toISOString() };

  let html: string;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return base;
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!type.includes('html')) return base;
    html = (await res.text()).slice(0, 600_000); // head is all we need
  } catch {
    return base;
  }

  const title =
    metaContent(html, ogTag('og:title')) ??
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') ??
    domain;
  const description =
    metaContent(html, ogTag('og:description')) ?? metaContent(html, ogTag('description'));
  const siteName = metaContent(html, ogTag('og:site_name'));

  const resolve = (href?: string): string | undefined => {
    if (!href) return undefined;
    try {
      return new URL(href, url).href;
    } catch {
      return undefined;
    }
  };

  const favicon = await downloadAsset(
    resolve(extractFaviconHref(html)) ?? new URL('/favicon.ico', url).href,
  );
  const image = await downloadAsset(resolve(metaContent(html, ogTag('og:image'))) ?? '');

  return {
    url,
    domain,
    title: (title || domain).slice(0, 200),
    description: description?.slice(0, 320),
    siteName,
    favicon,
    image,
    ok: true,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const urls = await collectUrls();

  let cache: Record<string, Annotation> = {};
  if (existsSync(CACHE_PATH)) {
    cache = JSON.parse(await readFile(CACHE_PATH, 'utf8'));
  }

  if (prune) {
    for (const key of Object.keys(cache)) {
      if (!urls.has(key)) delete cache[key];
    }
  }

  const todo = [...urls].filter((u) => refresh || !cache[u]);
  console.log(`${urls.size} external URLs in content; ${todo.length} to fetch.`);

  let ok = 0;
  let failed = 0;
  for (const url of todo) {
    const ann = await annotate(url);
    cache[url] = ann;
    if (ann.ok) {
      ok++;
      console.log(`  ✓ ${url}`);
    } else {
      failed++;
      console.log(`  ✗ ${url} (unreachable / blocked)`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(`Done. ${ok} annotated, ${failed} failed, ${Object.keys(cache).length} cached total.`);
}

await main();

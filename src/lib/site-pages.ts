import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './remark-todo';
import rehypeCalloutIcons from './rehype-callout-icons';
import type { PageInput } from './relations';
import { wit } from './wit';

// Site pages, served from wit (SSR + stale-while-revalidate + SSE
// invalidation) instead of the repo's content collection. Entries keep
// their original site routes via frontmatter `route`; markdown renders
// at request time with the same remark/rehype pipeline the static build
// used. Component directives become segments the route template renders
// as real Astro components.

export interface ContentSegment {
  type: 'html' | 'directive';
  html?: string;
  name?: string;
  props?: Record<string, string>;
}

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface LocalPageEntry extends PageInput {
  id: string;
  html: string;
  body: string;
  data: Record<string, unknown> & { title: string };
  segments: ContentSegment[];
  headings: Heading[];
}

const RELATION_KEYS = [
  'up', 'down', 'is', 'has', 'subclass_of', 'superclass_of',
  'part_of', 'has_part', 'subject', 'subject_of', 'creator',
  'creator_of', 'related',
];

const WIKILINK_RE = /^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/;
const DIRECTIVE_RE = /^::([a-z][a-z0-9-]*)(\{[^}]*\})?\s*$/;

const processorPromise = createMarkdownProcessor({
  remarkPlugins: [remarkCallout, remarkTodo],
  rehypePlugins: [rehypeCalloutIcons],
  shikiConfig: { theme: 'github-light' },
});

function stripFrontmatter(text: string): string {
  const m = text.match(/^---\n[\s\S]*?\n---\n?/);
  return (m ? text.slice(m[0].length) : text).trim();
}

/** wit relation wikilinks → the site's {page, label} shape, resolved
 *  back to routes via the slug→route map. */
function convertData(
  fm: Record<string, unknown>,
  title: string,
  routeOf: (slug: string) => string,
): LocalPageEntry['data'] {
  const data: Record<string, unknown> = { ...fm, title };
  for (const key of RELATION_KEYS) {
    const value = fm[key];
    if (!Array.isArray(value)) continue;
    data[key] = value
      .map((item) => (typeof item === 'string' ? item.match(WIKILINK_RE) : null))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => ({ page: routeOf(m[1]!), ...(m[2] ? { label: m[2] } : {}) }));
  }
  for (const key of ['created', 'modified']) {
    if (typeof data[key] === 'string') data[key] = new Date(data[key] as string);
  }
  if (typeof fm['next'] === 'string') data['next'] = routeOf(fm['next'].replace(WIKILINK_RE, '$1'));
  if (typeof fm['prev'] === 'string') data['prev'] = routeOf(fm['prev'].replace(WIKILINK_RE, '$1'));
  return data as LocalPageEntry['data'];
}

/** Leaf directives split the body; markdown renders around them. */
async function toSegments(body: string): Promise<{ segments: ContentSegment[]; html: string; headings: Heading[] }> {
  const processor = await processorPromise;
  const segments: ContentSegment[] = [];
  const htmlParts: string[] = [];
  let headings: Heading[] = [];
  let buffer: string[] = [];

  const flush = async () => {
    const chunk = buffer.join('\n').trim();
    buffer = [];
    if (!chunk) return;
    const rendered = await processor.render(chunk);
    const html = String(rendered.code);
    headings = headings.concat(
      (rendered.metadata?.headings ?? []) as Heading[],
    );
    htmlParts.push(html);
    segments.push({ type: 'html', html });
  };

  for (const line of body.split('\n')) {
    const m = line.match(DIRECTIVE_RE);
    if (m) {
      await flush();
      const props: Record<string, string> = {};
      for (const attr of (m[2] ?? '').matchAll(/([a-zA-Z]+)="([^"]*)"/g)) {
        props[attr[1]!] = attr[2]!;
      }
      segments.push({ type: 'directive', name: m[1]!, props });
    } else {
      buffer.push(line);
    }
  }
  await flush();
  return { segments, html: htmlParts.join('\n'), headings };
}

export async function getLocalPages(): Promise<LocalPageEntry[]> {
  return wit.swr('site-pages', async (client) => {
    const docs = await client.allDocs({ include: ['body'] });
    const routeOf = (slug: string): string => {
      const doc = docs.find((d) => d.slug === slug);
      return (doc?.frontmatter['route'] as string) ?? slug;
    };
    return Promise.all(
      docs.map(async (doc) => {
        const route = (doc.frontmatter['route'] as string) ?? doc.slug;
        const body = stripFrontmatter(doc.text ?? '');
        const { segments, html, headings } = await toSegments(body);
        return {
          id: route,
          html,
          body,
          data: convertData(doc.frontmatter, doc.title, routeOf),
          segments,
          headings: headings.filter((h) => h.depth >= 2 && h.depth <= 5),
        };
      }),
    );
  });
}

export async function getLocalPageSlugs(): Promise<Set<string>> {
  return new Set((await getLocalPages()).map((entry) => entry.id));
}

export async function getSiteRouteEntries(): Promise<LocalPageEntry[]> {
  return getLocalPages();
}

export async function getSiteRouteEntry(slug: string): Promise<LocalPageEntry | undefined> {
  const entries = await getSiteRouteEntries();
  return entries.find((entry) => entry.id === slug);
}

export async function getAllSitePageInputs(): Promise<PageInput[]> {
  return await getLocalPages();
}

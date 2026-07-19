const DEFAULT_TANGENT_API_URL = 'https://ap.theor.net';
const DEFAULT_NOTE_PERMALINK_BASE = 'https://theor.net/notes';

export interface TangentApiAttachment {
  mediaId: string;
  url: string;
  contentType: string;
  alt: string | null;
}

export interface TangentApiNote {
  id: string;
  uri: string;
  url: string;
  html: string;
  text: string;
  inReplyTo: string | null;
  tags: string[];
  attachments: TangentApiAttachment[];
  published: string;
  updated: string | null;
}

interface TangentNotesResponse {
  notes: TangentApiNote[];
  nextCursor: string | null;
}

interface TangentThreadReply {
  id: string;
  actor: string;
  content: string;
  published: string;
  url: string;
}

interface TangentThreadResponse {
  note: TangentApiNote;
  ancestors: unknown[];
  replies: TangentThreadReply[];
  likes: number;
  announces: number;
}

export interface SiteNote {
  id: string;
  sourceUrl: string;
  contentHtml: string;
  published: Date;
  updated?: Date;
  inReplyTo?: string;
  tags: string[];
  searchText: string;
}

let notesCache: Promise<SiteNote[]> | null = null;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function tangentApiUrl(): string {
  return (env('TANGENT_API_URL') ?? DEFAULT_TANGENT_API_URL).replace(/\/$/, '');
}

function notePermalinkBase(): string {
  return (env('NOTE_PERMALINK_BASE') ?? DEFAULT_NOTE_PERMALINK_BASE).replace(/\/$/, '');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function linkifyNoteTags(html: string): string {
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) return part;
    return part.replace(/(^|\s)#([A-Za-z0-9_][A-Za-z0-9_-]*)/g, (_match, prefix: string, tag: string) => {
      const normalized = tag.toLowerCase();
      return `${prefix}<a class="note-tag no-icon" href="/notes/?tag=${encodeURIComponent(normalized)}" data-note-tag="${normalized}">#${tag}</a>`;
    });
  }).join('');
}

function dateValue(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function noteUrl(id: string): string {
  return `${notePermalinkBase()}/${id}`;
}

function fromLocalNote(note: TangentApiNote): SiteNote | undefined {
  const published = dateValue(note.published);
  if (!published) return undefined;
  const updated = note.updated ? dateValue(note.updated) : undefined;
  const attachmentHtml = note.attachments
    .filter((attachment) => attachment.contentType.startsWith('image/'))
    .map((attachment) => `<figure><img src="${attachment.url}" alt="${attachment.alt ?? ''}" loading="lazy"></figure>`)
    .join('');
  const contentHtml = linkifyNoteTags(`${note.html}${attachmentHtml}`);
  return {
    id: note.id,
    sourceUrl: noteUrl(note.id),
    contentHtml,
    published,
    ...(updated ? { updated } : {}),
    ...(note.inReplyTo ? { inReplyTo: note.inReplyTo } : {}),
    tags: [...note.tags].sort((a, b) => a.localeCompare(b)),
    searchText: stripHtml(contentHtml).toLowerCase(),
  };
}

function fromReply(root: TangentApiNote, reply: TangentThreadReply): SiteNote | undefined {
  const published = dateValue(reply.published);
  if (!published) return undefined;
  const contentHtml = linkifyNoteTags(reply.content);
  return {
    id: reply.id,
    sourceUrl: reply.url || reply.id,
    contentHtml,
    published,
    inReplyTo: root.id,
    tags: [],
    searchText: stripHtml(contentHtml).toLowerCase(),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Tangent API request failed: ${response.status} ${response.statusText} (${url})`);
  }
  return await response.json() as T;
}

export async function getTangentNotes(): Promise<SiteNote[]> {
  if (notesCache) return notesCache;

  notesCache = (async () => {
    const rootUrl = tangentApiUrl();
    const list = await fetchJson<TangentNotesResponse>(`${rootUrl}/api/notes?limit=100`);
    const threads = await Promise.all(
      list.notes.map((note) => fetchJson<TangentThreadResponse>(`${rootUrl}/api/notes/${encodeURIComponent(note.id)}/thread`)),
    );

    const notes: SiteNote[] = [];
    for (const thread of threads) {
      const root = fromLocalNote(thread.note);
      if (root) notes.push(root);
      for (const reply of thread.replies) {
        const note = fromReply(thread.note, reply);
        if (note) notes.push(note);
      }
    }

    return notes.sort((a, b) => b.published.getTime() - a.published.getTime());
  })();

  return notesCache;
}

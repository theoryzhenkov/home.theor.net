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

function slugifyHeading(text: string): string {
  const slug = stripHtml(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'section';
}

export function addHeadingIds(html: string): string {
  const counts = new Map<string, number>();

  return html.replace(/<h([2-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, depth: string, attrs: string, content: string) => {
    if (/\sid=("[^"]+"|'[^']+'|[^\s>]+)/i.test(attrs)) return full;

    const base = slugifyHeading(content);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;

    return `<h${depth}${attrs} id="${id}">${content}</h${depth}>`;
  });
}

export function extractHtmlHeadings(html: string): { depth: number; slug: string; text: string; wordCount?: number }[] {
  const withIds = addHeadingIds(html);
  const headings: { depth: number; slug: string; text: string; position: number }[] = [];
  const regex = /<h([2-3])([^>]*)id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(withIds)) !== null) {
    headings.push({
      depth: Number(match[1]),
      slug: match[3],
      text: stripHtml(match[4]),
      position: match.index,
    });
  }

  return headings.map((heading, index) => {
    let end = withIds.length;
    for (let i = index + 1; i < headings.length; i += 1) {
      if (headings[i].depth <= heading.depth) {
        end = headings[i].position;
        break;
      }
    }

    const sectionText = stripHtml(withIds.slice(heading.position, end));
    const wordCount = sectionText ? sectionText.split(/\s+/).length : 0;
    return {
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
      wordCount,
    };
  });
}

export function estimateHtmlReadTimeMinutes(html: string): number {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 238));
}

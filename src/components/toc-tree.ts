export interface Heading {
  depth: number;
  slug: string;
  text: string;
  wordCount?: number;
}

export interface TocNode {
  heading: Heading;
  time: string;
  children: TocNode[];
}

const WPM = 238;

// Read time for a heading's section: words from this heading to the next
// heading of same/higher level (precomputed upstream into wordCount).
function computeReadTime(wordCount: number | undefined): string {
  if (wordCount === undefined || wordCount === 0) return '';
  const minutes = wordCount / WPM;
  if (minutes < 1) return '< 1m';
  return `${Math.round(minutes)}m`;
}

// Build a nested tree from a flat, in-order list of headings. Each heading
// nests under the most recent heading of a shallower depth. Skipped levels
// (e.g. h2 -> h4) are handled gracefully: the h4 simply nests under the h2.
export function buildTocTree(headings: Heading[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const heading of headings) {
    const node: TocNode = {
      heading,
      time: computeReadTime(heading.wordCount),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].heading.depth >= heading.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}

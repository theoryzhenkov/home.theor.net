/** Build-time external-link annotations, loaded once for hover previews. */

export interface LinkAnnotation {
  url: string;
  domain: string;
  title: string;
  description?: string;
  siteName?: string;
  favicon?: string;
  image?: string;
  ok: boolean;
}

type AnnotationMap = Record<string, LinkAnnotation>;

let annotations: AnnotationMap | null = null;
let loadPromise: Promise<AnnotationMap> | null = null;

export function loadAnnotations(): Promise<AnnotationMap> {
  if (annotations) return Promise.resolve(annotations);
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/link-annotations.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((data: AnnotationMap) => {
      annotations = data;
      return data;
    })
    .catch(() => {
      annotations = {};
      return {};
    });

  return loadPromise;
}

/** Synchronous lookup; returns undefined until the index has loaded. */
export function getAnnotation(href: string): LinkAnnotation | undefined {
  if (!annotations) return undefined;
  if (annotations[href]) return annotations[href];
  // Tolerate trailing-slash differences between the content URL and the
  // browser-normalized anchor href.
  const alt = href.endsWith('/') ? href.slice(0, -1) : `${href}/`;
  return annotations[alt];
}

// Start loading eagerly so the index is ready before the first hover spawns.
loadAnnotations();

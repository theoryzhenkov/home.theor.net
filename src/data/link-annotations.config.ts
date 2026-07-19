// Configuration for the build-time external-link annotation pipeline
// (`scripts/annotate-links.ts`). External links are annotated by default;
// list domains or URL substrings here to opt specific links out of fetching
// and previewing. For per-link overrides, add the `no-annotation` class to an
// anchor in MDX.

export interface AnnotationConfig {
  /** Domains or URL substrings to skip entirely (no fetch, no preview). */
  exclude: string[];
}

const config: AnnotationConfig = {
  exclude: [
    // e.g. 'example.com', 'https://private.example/secret'
  ],
};

export default config;

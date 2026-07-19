import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

// All banner images live in src/assets/banners and are referenced from
// frontmatter by filename (e.g. `banner: foo.jpg`). They are cropped to a
// fixed aspect ratio and optimized at build time so every banner ships at the
// same dimensions regardless of the source image.
const bannerFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/banners/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true },
);

// Fixed output: 3:1, sized for a high-DPI content column (~720px display).
const BANNER_WIDTH = 1500;
const BANNER_HEIGHT = 500;

const byFilename = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(bannerFiles)) {
  const filename = path.split('/').pop();
  if (filename) byFilename.set(filename, mod.default);
}

export interface ResolvedBanner {
  src: string;
  width: number;
  height: number;
}

// Resolve a frontmatter banner reference to a cropped, optimized image.
// Accepts a bare filename or any path ending in one (leading slashes/dirs are
// ignored). Returns undefined if no matching file exists.
export async function resolveBanner(ref: string | undefined): Promise<ResolvedBanner | undefined> {
  if (!ref) return undefined;

  const filename = ref.split('/').pop();
  const source = filename ? byFilename.get(filename) : undefined;
  if (!source) return undefined;

  const image = await getImage({
    src: source,
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    fit: 'cover',
    position: 'center',
    format: 'webp',
  });

  return { src: image.src, width: BANNER_WIDTH, height: BANNER_HEIGHT };
}

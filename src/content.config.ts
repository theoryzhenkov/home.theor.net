import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const relationEntry = z.object({
  page: z.string(),
  label: z.string().optional(),
});
const relationList = z.array(relationEntry).optional();
const maturity = z.enum(['stub', 'rough', 'developed']);

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    modified: z.coerce.date().optional(),
    maturity: maturity.optional(),
    // Banner: a wide image shown at the top of the page. `banner` is a path to
    // an image in /public (e.g. /banners/foo.jpg).
    banner: z.string().optional(),
    bannerAlt: z.string().optional(),
    bannerCaption: z.string().optional(),
    // Relations
    // `up` / `down` are legacy route-hierarchy affordances. Prefer `part_of` / `has_part` for new content.
    up: relationList,
    down: relationList,
    is: relationList,
    has: relationList,
    subclass_of: relationList,
    superclass_of: relationList,
    part_of: relationList,
    has_part: relationList,
    subject: relationList,
    subject_of: relationList,
    creator: relationList,
    creator_of: relationList,
    related: relationList,
    next: z.string().optional(),
    prev: z.string().optional(),
    ref: z.array(z.string()).optional(),
    refi: z.array(z.string()).optional(),
  }).passthrough(),
});

export const collections = { pages };

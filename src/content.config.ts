import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    modified: z.coerce.date().optional(),
    // Page relations
    up: z.string().optional(),
    down: z.array(z.string()).optional(),
    next: z.string().optional(),
    prev: z.string().optional(),
  }).passthrough(),
});

export const collections = { pages };

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    modified: z.coerce.date().optional(),
    // Topological relations (RCC-8)
    ntpp: z.array(z.string()).optional(),   // Non-tangential proper part
    tpp: z.array(z.string()).optional(),    // Tangential proper part
    po: z.array(z.string()).optional(),     // Partially overlapped
    ec: z.array(z.string()).optional(),     // Externally connected
    eq: z.array(z.string()).optional(),     // Equal
    dc: z.array(z.string()).optional(),     // Disconnected (metadata-only)
    // Semantic relations
    next: z.string().optional(),
    prev: z.string().optional(),
  }).passthrough(),
});

export const collections = { pages };

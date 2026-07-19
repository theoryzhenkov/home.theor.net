import type { APIRoute } from 'astro';
import { getAllSitePageInputs } from '@/lib/site-pages';

export const GET: APIRoute = async () => {
  const pages = await getAllSitePageInputs();

  const index: Record<string, {
    title: string;
    description?: string;
    maturity?: string;
  }> = {};

  for (const page of pages) {
    // Keys use no trailing slash to match client-side path normalization
    const path = page.id === 'index' ? '/' : `/${page.id}`;
    index[path] = {
      title: page.data.title,
      description: 'description' in page.data && typeof page.data.description === 'string'
        ? page.data.description
        : undefined,
      maturity: 'maturity' in page.data && typeof page.data.maturity === 'string'
        ? page.data.maturity
        : undefined,
    };
  }

  return new Response(JSON.stringify(index, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

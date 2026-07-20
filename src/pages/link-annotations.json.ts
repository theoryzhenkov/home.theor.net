import type { APIRoute } from 'astro';
import annotations from '@/data/link-annotations.json';

// Serves the committed external-link annotation cache for client hover previews.
// The data is produced at author time by `bun run annotate`; the build only
// reads it (no network).
export const GET: APIRoute = () =>
  new Response(JSON.stringify(annotations), {
    headers: { 'Content-Type': 'application/json' },
  });

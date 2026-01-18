import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkCallout from '@r4ai/remark-callout';

export default defineConfig({
  site: 'https://the-o.space',
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: [/^\/pagefind\//],
      },
    },
  },

  integrations: [
    mdx({
      remarkPlugins: [remarkCallout],
    }),
  ],

  markdown: {
    remarkPlugins: [remarkCallout],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './src/lib/remark-todo';
import rehypeCalloutIcons from './src/lib/rehype-callout-icons';


export default defineConfig({
  site: 'https://theor.net',
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
    // MDX inherits the remark/rehype plugins from `markdown.processor` below.
    mdx(),
    sitemap(),
  ],

  markdown: {
    // Astro 7 defaults to the Sätteri engine; keep the unified/remark pipeline
    // so the callout/todo/callout-icon plugins continue to work.
    processor: unified({
      remarkPlugins: [remarkCallout, remarkTodo],
      rehypePlugins: [rehypeCalloutIcons],
    }),
    shikiConfig: {
      theme: 'github-light',
    },
  },
});

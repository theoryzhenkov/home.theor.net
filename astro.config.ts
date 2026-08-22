import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './src/lib/remark-todo';
import rehypeCalloutIcons from './src/lib/rehype-callout-icons';


export default defineConfig({
  site: 'https://theor.net',
  output: 'server',
  adapter: node({ mode: 'standalone' }),

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

import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  
  // Map: target path -> array of { path, title } that link to it
  const backlinks: Record<string, Array<{ path: string; title: string }>> = {};
  
  // Initialize backlinks for all pages
  for (const page of pages) {
    const path = page.id === 'index' ? '/' : `/${page.id}`;
    backlinks[path] = [];
  }
  
  // Extract links from each page
  for (const page of pages) {
    const sourcePath = page.id === 'index' ? '/' : `/${page.id}`;
    const sourceTitle = page.data.title;
    
    // Render the page to get the HTML content
    const { Content } = await render(page);
    
    // Get the body content - we need to extract links from the raw MDX
    // Since we can't easily get HTML from Content component,
    // we'll parse the raw body for markdown links
    const body = page.body || '';
    
    // Find markdown links: [text](/path) or [text](./path) or [text](path)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(body)) !== null) {
      const href = match[2];
      
      // Skip external links and anchors
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
        continue;
      }
      
      // Normalize the path
      let targetPath = href;
      
      // Handle relative paths
      if (targetPath.startsWith('./')) {
        targetPath = targetPath.slice(1);
      }
      if (!targetPath.startsWith('/')) {
        targetPath = '/' + targetPath;
      }
      
      // Remove trailing slash
      if (targetPath.endsWith('/') && targetPath !== '/') {
        targetPath = targetPath.slice(0, -1);
      }
      
      // Add backlink if target exists and is not self-reference
      if (backlinks[targetPath] && targetPath !== sourcePath) {
        // Avoid duplicates
        const exists = backlinks[targetPath].some(bl => bl.path === sourcePath);
        if (!exists) {
          backlinks[targetPath].push({
            path: sourcePath,
            title: sourceTitle,
          });
        }
      }
    }
  }
  
  return new Response(JSON.stringify(backlinks, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

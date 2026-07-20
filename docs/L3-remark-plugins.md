---
scope: L3
summary: "Remark/rehype plugin pipeline: registration, transforms, ordering, and edge cases"
modified: 2026-03-19
reviewed: 2026-03-19
depends:
  - path: docs/L1-routing
dependents:
  - path: docs/L2-embedded-content
  - path: docs/L3-link-system
---

# Remark Plugin Pipeline

Two remark plugins process content during the Astro build: `remarkCallout` and `remarkTodo`. They are registered in `astro.config.ts` and run in array order before rehype (standard unified pipeline).

## Plugin registration

The same plugin array appears in two places in `astro.config.ts`:

```typescript
integrations: [
  mdx({
    remarkPlugins: [remarkCallout, remarkTodo],
  }),
],
markdown: {
  remarkPlugins: [remarkCallout, remarkTodo],
},
```

Both are needed because Astro treats `.md` and `.mdx` files as separate pipelines. `markdown.remarkPlugins` applies to `.md` files. `mdx.remarkPlugins` applies to `.mdx` files. Without both, one format would get raw, untransformed text. In practice this site only uses `.mdx`, but the `markdown` block also holds `shikiConfig`, and keeping the plugin lists identical avoids surprises if `.md` files are added later.

## remarkCallout

External plugin from `@r4ai/remark-callout`. Transforms Obsidian-style blockquote callouts into structured HTML with `data-callout` attributes.

Input syntax:

```markdown
> [!note] Optional title
> Body text here.
```

Supported callout types (styled in `components.css` via `[data-callout-type]`):

- `note`, `info` -- accent color border
- `tip`, `hint`, `important` -- success color border
- `warning`, `caution`, `attention` -- warning color border
- `danger`, `error`, `bug` -- error color border
- `quote`, `cite` -- transparent background, italic

The plugin outputs elements with `data-callout`, `data-callout-title`, and `data-callout-body` attributes. Styling lives in `src/styles/components.css`.

## remarkTodo

Custom plugin (`src/lib/remark-todo.ts`). Converts inline TODO markers into styled HTML spans.

Input syntax: `[TODO::label text]` or `[TODO::]` (label is optional).

Regex: `/\[TODO::([^\]]*)\]/g`

The plugin visits every `text` node in the mdast tree. When it finds a match, it splits the text node into a sequence of `text` and `html` nodes, then splices them into the parent's children array in place. This is a destructive operation on the AST -- the original text node is replaced.

Output HTML for `[TODO::fix this]`:

```html
<span class="todo-marker" role="note">
  <span class="todo-label">TODO</span> fix this
</span>
```

Output HTML for `[TODO::]` (empty label):

```html
<span class="todo-marker" role="note">
  <span class="todo-label">TODO</span>
</span>
```

The `role="note"` attribute provides accessibility semantics. Visual styling (dashed warning-colored border, highlighted background) is defined in `src/styles/components.css` under `.todo-marker` and `.todo-label`.

## Processing order

Plugins run in array order: callout first, then todo. Since `remarkCallout` transforms blockquote nodes (not text nodes), it doesn't interfere with `remarkTodo` which visits text nodes.

After remark plugins finish, the unified pipeline runs rehype (HTML processing). Shiki code highlighting happens at the rehype stage.

## Shiki code highlighting

Configured under `markdown.shikiConfig` with the `github-light` theme. Shiki processes fenced code blocks (triple-backtick) into syntax-highlighted HTML. The theme applies to both `.md` and `.mdx` files.

The MDX integration inherits `shikiConfig` from the `markdown` block automatically -- it does not need to be specified separately.

## Edge cases

**MDX component boundaries.** Remark plugins operate on the mdast (Markdown AST). Content inside imported MDX components (e.g., `<MyComponent>text</MyComponent>`) is parsed as JSX, not as markdown text nodes. The `remarkTodo` plugin will not transform `[TODO::...]` syntax that appears inside JSX component tags. The syntax must appear in regular markdown flow content to be processed.

**Multiple matches in one text node.** `remarkTodo` handles multiple matches per node correctly. It iterates all regex matches, builds an array of interleaved text/html children, and splices them in a single operation.

**Empty/whitespace labels.** `remarkTodo` trims the label (`match[1].trim()`). An empty label like `[TODO::]` produces a span with just the "TODO" badge and no trailing text.

## Key files

- `astro.config.ts` -- plugin registration, Shiki theme config
- `src/lib/remark-todo.ts` -- TODO marker plugin
- `src/styles/components.css` -- `.todo-marker`, `.todo-label`, `[data-callout*]` styles

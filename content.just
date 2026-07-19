# Create a new content page. Prompts for path and name.
new:
    bun run content:new

# List content pages by slug.
list:
    bun run content:list

# Open a content page in $EDITOR. If SLUG is omitted, prints pages and prompts.
edit SLUG="":
    bun run content:edit -- {{SLUG}}

# Watch MDX pages edited in external editors. Initializes missing frontmatter and bumps modified.
watch:
    bun run content:watch

# Archive a content page under archive/deleted-pages-YYYY-MM-DD/.
archive SLUG:
    bun run content:archive -- {{SLUG}}

# Hard-delete a content page. Prefer `just content archive`.
delete SLUG:
    bun run content:delete -- {{SLUG}} --force

---
scope: L0
summary: "Content model: MDX pages, tangent notes, relation graph, schema"
modified: 2026-06-22
reviewed: 2026-06-22
depends:
  - path: README
dependents:
  - path: docs/L1-relations
  - path: docs/L1-routing
---

# Content System

The site has one canonical page/content source: local MDX files in `src/content/pages/`, loaded by Astro's content collection in `src/content.config.ts` and rendered through Astro's MDX pipeline.

Short-form social notes are not stored in this repository. They live in the tangent service and are fetched from tangent's public JSON API during static builds for the `/notes/` feed.

A project-native content helper can create, list, edit, archive, delete, and watch local MDX files while preserving Git/Jujutsu as the history layer. File paths are storage locations; page topology comes from metadata relations such as `is` and `part_of`.

## Page schema

Every MDX page has YAML frontmatter with required `title` and `created` fields, plus optional relation fields. The schema is defined with Zod in `src/content.config.ts` and uses `.passthrough()` to allow arbitrary extra fields.

The website relation model is a practical subset of the Obsidian PKM ontology: routes and folders are browsing affordances, while frontmatter relations carry semantic structure. New content should prefer `part_of` / `has_part` for composition over legacy `up` / `down` hierarchy fields. Collection pages should query semantic metadata (for example, `is: classes/project`) instead of deriving membership from directories.

## Relations

Pages link to each other through declared frontmatter relations and auto-extracted references. The build-time graph builder (`src/lib/relations.ts`) infers inverse relations automatically.

### Hierarchy and typing

Declared as arrays of `{ page, label? }` objects in frontmatter.

| Frontmatter key | Meaning | Inverse (inferred) |
| --------------- | ------- | ------------------- |
| `is` | "this page is an instance of..." | `has` on target |
| `subclass_of` | class taxonomy / subsumption | `superclass_of` on target |
| `part_of` | mereology / composition | `has_part` on target |
| `subject` | aboutness | `subject_of` on target |
| `creator` | authorship / creation | `creator_of` on target |
| `related` | weak symmetric association | `related` on target |
| `up` | legacy route hierarchy | `down` on target |

Breadcrumbs walk the `part_of` chain first and fall back to legacy `up` when `part_of` is absent.

### Sequential ordering

| Key | Meaning | Inverse (inferred) |
| --- | ------- | ------------------- |
| `next` | next page in sequence (string slug) | `prev` on target |
| `prev` | previous page in sequence (string slug) | `next` on target |

### Auto-extracted references

`relations.ts` parses each page's MDX body for internal markdown links and populates `ref` (references) and `refi` (referenced-by) arrays. External links, anchors, and mailto are excluded.

## Embedded components

Routes pass a small component set into MDX pages, so authors can embed site components directly without per-page imports:

```mdx
<ContentTable classSlug="classes/project" />
<NotesFeed />
<LinkCards github="https://github.com/theoryzhenkov/blank" />
```

`ContentTable` lists pages by path prefix or semantic class relation. `LinkCards` renders compact external action cards and accepts either a `links` array or shorthand props such as `github`, `website`, `docs`, `release`, `chrome`, and `firefox`.

## Notes feed

The `/notes/` MDX page renders `<NotesFeed />`. `src/components/notes/NotesFeed.astro` calls `src/lib/tangent-notes.ts`, which fetches tangent's public API:

- `GET https://feed.theor.net/api/notes`
- `GET https://feed.theor.net/api/notes/:id/thread`

Notes are grouped into threads when `inReplyTo` points at another fetched note. Each local tangent note links to its canonical public permalink under `https://theor.net/notes/:id`. Reply actions open a Mastodon composer prefilled with the site's Fediverse handle.

Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `TANGENT_API_URL` | no | Public tangent origin; defaults to `https://feed.theor.net` |
| `NOTE_PERMALINK_BASE` | no | Public note permalink base; defaults to `https://theor.net/notes` |
| `PUBLIC_FEDIVERSE_HANDLE` | no | Handle displayed in the notes feed and prefilled in Mastodon reply links; defaults to `@theor@theor.net` |
| `PUBLIC_MASTODON_INSTANCE_URL` | no | Mastodon instance used for profile/share links in the notes feed; defaults to `https://mastodon.social` |

## Authoring commands and watcher

The `content` just module wraps `scripts/content.ts` and `scripts/content-watch.ts`:

```sh
just content new              # prompt for path and name, then create default frontmatter
just content list             # list content page slugs and titles
just content edit SLUG        # open $EDITOR and bump modified if the file changes
just content watch            # watch Zed/external-editor saves
just content archive SLUG
just content delete SLUG
```

`new` asks for a path relative to the pages directory and a display name, then writes the default frontmatter block: `title`, empty `description`, `created`, `modified`, and empty `part_of`, `is`, and `subject` lists.

`watch` is the preferred workflow when editing in Zed or another external editor. It polls the pages directory recursively, initializes missing frontmatter for new `.mdx` files, preserves existing `created` dates, and updates `modified` when a watched page changes. The pages directory defaults to `src/content/pages`, can be changed per command with `--content-root DIR`, or set for the process with `CONTENT_PAGES_DIR=DIR`. The polling interval defaults to `1000ms` and can be changed with `--interval MS` or `CONTENT_WATCH_INTERVAL_MS`.

`archive` is the preferred removal path; it moves pages under `archive/deleted-pages-YYYY-MM-DD/`. Hard deletion requires `--force`.

## Key files

- `src/content.config.ts` -- local collection definition and Zod schema
- `src/lib/site-pages.ts` -- local MDX page input loader
- `src/lib/tangent-notes.ts` -- tangent notes API adapter for the static notes feed
- `src/components/notes/NotesFeed.astro` -- public notes feed renderer
- `src/lib/content-admin.ts` -- local content authoring operations and page templates
- `scripts/content.ts` -- CLI wrapper for content operations
- `scripts/content-watch.ts` -- live external-editor watcher for frontmatter initialization and `modified` updates
- `content.just` -- `just content ...` module
- `src/content/pages/` -- local MDX content
- `src/lib/relations.ts` -- relation types, link extraction, `buildGraphFromPages()`, breadcrumbs
- `src/lib/relations-graph.ts` -- Astro-dependent `buildRelationsGraph()` wrapper (memoized)
- `src/lib/slugs.ts` -- shared slug/URL utilities
- `src/lib/graph-data.ts` -- D3 graph data preparation

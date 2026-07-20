---
scope: root
summary: "Entry point for the home.theor.net project"
modified: 2026-05-24
reviewed: 2026-05-24
dependents:
  - path: docs/L0-content
  - path: docs/L0-infrastructure
  - path: docs/L0-ui
---

# home.theor.net

Theo Ryzhenkov's personal website. Static site built with Astro 5, served from Hetzner via Docker + nginx.

Pages are MDX files interconnected through a relation system (`up/down`, `is/has`, `next/prev` for explicit relations; `ref/refi` for auto-extracted links). The site uses Pagefind for search and D3 for a graph visualization of page relations.

## Setup

Requires `nix` and `direnv`.

```sh
# Template post-generation creates .env and .envrc and runs direnv allow.
# Re-enter the directory so direnv activates the flake devShell, then:
just setup
```

`just setup` initializes local base-template tooling (age key + colocated jj repo when needed) and installs JavaScript dependencies with Bun.

Common commands:

```sh
just dev        # local dev server on :4321
just build      # build to dist/ and generate Pagefind index
just preview    # preview dist/
just test       # run Bun tests
just content new # create a page with blank relation metadata
just content list # list content page slugs
just docker-run # build & serve via Docker on :8080
```

Stack: Astro 5, MDX, Tailwind 4, D3, Pagefind, Bun, Nix, direnv, jj.

## Navigation

| Spec | Scope | What it covers |
| ---- | ----- | -------------- |
| [docs/L0-content](docs/L0-content.md) | L0 | Content model, MDX pages, page relations |
| [docs/L0-infrastructure](docs/L0-infrastructure.md) | L0 | Build pipeline, Docker, deployment to Hetzner |
| [docs/L0-ui](docs/L0-ui.md) | L0 | Components, layout, design system (DSRD) |
| [docs/L1-design-vision](docs/L1-design-vision.md) | L1 | Aesthetic direction, visual language, design rules |
| [docs/L1-relations](docs/L1-relations.md) | L1 | Relations graph API, inference rules, breadcrumbs |
| [docs/L1-routing](docs/L1-routing.md) | L1 | Static generation, routes, remark pipeline |
| [docs/L1-styles](docs/L1-styles.md) | L1 | CSS tokens, Tailwind v4 theme, layer order |
| [docs/L1-scripts](docs/L1-scripts.md) | L1 | Client-side scripts: footnotes, TOC, popups, graph |
| [docs/L2-components](docs/L2-components.md) | L2 | Astro component catalog, props, data flow |
| [docs/L2-embedded-content](docs/L2-embedded-content.md) | L2 | Callouts, code, images, tables, blockquotes, TODOs |
| [docs/L2-graph-viz](docs/L2-graph-viz.md) | L2 | D3 graph visualization, force simulation, interaction |
| [docs/L2-header-nav](docs/L2-header-nav.md) | L2 | Header bar, navigation zones, mobile behavior |
| [docs/L2-info-architecture](docs/L2-info-architecture.md) | L2 | Metadata model, consolidated strip, backlinks |
| [docs/L2-information-density](docs/L2-information-density.md) | L2 | Density proposals: graph focus, link types, freshness |
| [docs/L2-reading-experience](docs/L2-reading-experience.md) | L2 | TOC, sidenotes, link previews, TOC enrichments |
| [docs/L3-footnotes-layout](docs/L3-footnotes-layout.md) | L3 | Footnotes positioning, wide/narrow modes |
| [docs/L3-link-system](docs/L3-link-system.md) | L3 | Link styling, icons, hover previews, chain popups |
| [docs/L3-remark-plugins](docs/L3-remark-plugins.md) | L3 | remarkTodo, remarkCallout pipeline |

## Updating from upstream templates

```sh
just template update
```

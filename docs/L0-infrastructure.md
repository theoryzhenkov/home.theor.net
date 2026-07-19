---
scope: L0
summary: "Build pipeline, Docker packaging, deployment to Hetzner"
modified: 2026-06-22
reviewed: 2026-06-22
depends:
  - path: README
---

# Infrastructure

## Build

Astro builds static HTML to `dist/`, then Pagefind indexes it for client-side search. Bun is the package manager and script runner. Page and post content comes from repository MDX files. The `/notes/` feed is rendered at build time from tangent's public JSON API.

```
bun run build  =  astro build && pagefind --site dist
```

## Docker

Two-stage Dockerfile: `oven/bun:1-alpine` builds, `nginx:alpine` serves. Custom `nginx.conf` at project root configures the production server. The image exposes port 80.

## Deployment

Docker images are pushed to GHCR via CI. The workflow runs on pushes to `main` and can be triggered manually with `workflow_dispatch`. The host is a Hetzner server running NixOS. DNS is managed with Terraform in the separate infra repository. Domain registration is through Porkbun.

Runtime/build-time public configuration:

| Name | Kind | Purpose |
| --- | --- | --- |
| `TANGENT_API_URL` | variable | Optional tangent API origin for build-time note feed rendering; defaults to `https://feed.theor.net` |
| `NOTE_PERMALINK_BASE` | variable | Optional note permalink base; defaults to `https://theor.net/notes` |
| `PUBLIC_FEDIVERSE_HANDLE` | variable | Optional displayed Fediverse handle; defaults to `@theor@theor.net` |
| `PUBLIC_MASTODON_INSTANCE_URL` | variable | Optional Mastodon instance for reply/profile links; defaults to `https://mastodon.social` |

The deploy quickstart page on the site itself (`src/content/pages/deploying-to-theor-net-infrastructure.mdx`, if present) documents the step-by-step process for adding new services to theor.net.

## Key files

- `Dockerfile` -- multi-stage build
- `nginx.conf` -- production server config
- `.github/workflows/deploy.yml` -- GHCR image build/push workflow
- `justfile` -- local dev/build/docker commands
- `astro.config.ts` -- Astro configuration (static output, Tailwind, MDX)

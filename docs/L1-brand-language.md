---
scope: L1
summary: "Visual language for theor.net domain marks and per-site icon variants"
modified: 2026-03-24
reviewed: 2026-03-24
depends:
  - path: docs/L1-design-vision
  - path: docs/L1-styles
dependents: []
---

# Brand Language

theor.net should read as one family of sites, not a bag of unrelated favicons. The favicon identity system therefore uses a **literal two-letter monogram** built from **Commit Mono 700 outlines exported to SVG paths**:

- a dark `T` for the domain family
- an accent-colored lowercase letter for the specific site

## Core idea

The `T` is the stable anchor. It appears on every theor.net property.

The second letter is the first letter of the subdomain:

- `home.theor.net` -> `Th`
- `graph.theor.net` -> `Tg`
- `schedule.theor.net` -> `Ts`

This is intentionally blunt. It must read correctly at favicon size before it tries to be clever.

## Rules

1. **Shared family anchor.** Every site starts with the same dark `T`.
2. **Site letter in accent color.** The second letter is lowercase and uses the site's accent color.
3. **Legible at 16px.** No metaphor, no hidden symbolism, no decorative framing that muddies the silhouette.
4. **Monogram first.** The icon should work even if the site wordmark is absent.
5. **One font grammar.** The glyphs come from Commit Mono, converted to paths so the assets do not depend on font loading.
6. **Transparent field.** No enclosing badge, tile, or shadow. The letter silhouette must do the work.

## Color mapping

The second letter is not arbitrary color. It inherits a restrained semantic hue from the wider theor.net palette so the family feels connected to the site design language.

| Site | Mark | Light | Dark | Why |
| ---- | ---- | ----- | ---- | --- |
| `theor.net` | `T` | `#111111` | `#FFFFFF` | family anchor only |
| `home.theor.net` | `Th` | `#3A4E68` | `#6F88A8` | primary ink-blue accent |
| `graph.theor.net` | `Tg` | `#46637D` | `#7A95A2` | structural slate from graph relation colors |
| `schedule.theor.net` | `Ts` | `#5E7850` | `#8FA27A` | muted olive for sequence and time |
| `cue.theor.net` | `Tc` | `#7A5567` | `#A27A8F` | muted mauve for art/generative work |

## Variants

### Domain core (`theor.net`)

The root domain mark is just the `T`.

### Home (`home.theor.net`)

The home mark is `Th`: dark `T`, accent `h`.

### Graph (`graph.theor.net`)

The graph mark is `Tg`: dark `T`, slate `g`.

### Schedule (`schedule.theor.net`)

The schedule mark is `Ts`: dark `T`, olive `s`.

### Cue (`cue.theor.net`)

The cue mark is `Tc`: dark `T`, mauve `c`.

## Future site variants

- `schedule.theor.net` -> `Ts`
- `graph.theor.net` -> `Tg`
- `cue.theor.net` -> `Tc`

The family resemblance comes from repetition of the `T`, not from a shared badge or frame.

## Asset outputs

The source of truth lives in `src/lib/theor-brand.ts`. Running `bun run brand:generate` writes:

- `public/brand/theor-core.svg`
- `public/brand/theor-home.svg`
- `public/brand/theor-graph.svg`
- `public/brand/theor-schedule.svg`
- `public/brand/theor-cue.svg`
- `public/brand/theor-*-256.png`
- `public/favicon.svg`
- `public/theor-home-256.png`
- `public/apple-touch-icon.png`

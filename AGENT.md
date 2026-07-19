# Agent Instructions

## Project

`home.theor.net` is Theo Ryzhenkov's personal website. It is an Astro 5 static site using MDX, Tailwind 4, D3 relation graphs, Pagefind search, Bun for package/runtime tooling, and Docker + nginx for production serving.

## Conventions

- Use `jj` for version control. See `jj log` for history.
- Use `just` for task running. See `just --list` for available commands.
- Use the Nix devShell via direnv (`.envrc` uses `use flake`). Project binaries from `node_modules/.bin` are added to `PATH` by `flake.nix`.
- Use Bun for JS dependency management and scripts. Prefer `bun install --frozen-lockfile`, `bun run build`, and `bun test`.
- Template updates use `just template update`, which runs `copier update` for each `.copier-answers.<layer>.yml` file. Requires `copier` (provided by the flake devShell).
- To add another Copier template layer to this project: `just template adopt LAYER SRC` (e.g. `just template adopt skypilot gh:theoryzhenkov/repo_template.python_skypilot`).
- Secrets are managed with `sops` + `age`. Never commit `.env`, `.envrc`, or `.age-key`.
- Documentation follows the [SPECial](https://the-o-space.github.io/special/) standard. See `special.conf.toml`.

mod template
mod content

set dotenv-load := true

export ASTRO_TELEMETRY_DISABLED := "1"

default:
    @just --list

# Project setup (run inside the flake devShell). Template post-generation has already created .env/.envrc.
setup:
    ./setup.sh
    bun install --frozen-lockfile

# Install or update JavaScript dependencies from bun.lock.
install:
    bun install --frozen-lockfile

# Start the Astro development server.
dev:
    bun run dev

# Build the static site and Pagefind index.
build:
    bun run build

# Run the Astro preview server for dist/.
preview:
    bun run preview

# Run the test suite.
test:
    bun test

# Run the build smoke test.
test-build:
    bun run test:build

# Regenerate brand assets.
brand-generate:
    bun run brand:generate

# Build the production Docker image.
docker-build:
    docker build -t home.prj_theornet .

# Build and serve the production Docker image on http://localhost:8080.
docker-run: docker-build
    docker run --rm -p 8080:80 home.prj_theornet

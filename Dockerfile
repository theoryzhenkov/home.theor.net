# SSR server: Astro node adapter run under bun. Content comes from wit at
# request time (stale-while-revalidate + SSE); this container renders it.
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS production
WORKDIR /app
ENV HOST=0.0.0.0 PORT=8080 NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["bun", "dist/server/entry.mjs"]

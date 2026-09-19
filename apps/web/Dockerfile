# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_SERVER_URL=https://api.innerwar.app -t innerwar-web .
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Workspace manifests + lockfile first for layer caching. The web app imports
# the API router's types (tRPC), so api/auth/db come along. The root
# postinstall runs Varlock codegen for every app, so each .env.schema is needed.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/.env.schema packages/db/
COPY apps/web/package.json apps/web/.env.schema apps/web/
COPY apps/server/.env.schema apps/server/
COPY apps/dispatch/.env.schema apps/dispatch/
COPY apps/native/.env.schema apps/native/

# Baked into the client bundle at build time (not read at runtime): the public
# URL of apps/server, e.g. https://api.innerwar.app.
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
# Server schemas are validated by codegen during install: placeholders only.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
ENV BETTER_AUTH_URL=http://localhost:3000
ENV CORS_ORIGIN=http://localhost:3001
ENV SERVER_PUBLIC_URL=http://localhost:3000

RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/ui/ packages/ui/
COPY packages/api/ packages/api/
COPY packages/auth/ packages/auth/
COPY packages/db/ packages/db/
COPY apps/web/ apps/web/

# next.config.ts sets typescript.ignoreBuildErrors; types are checked with
# `pnpm check-types`, not in the image build.
RUN pnpm --filter web build

# ---- Runner ----
FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# No `output: "standalone"`, so `next start` needs the full node_modules tree,
# copied from the builder rather than reinstalled.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["pnpm", "start"]

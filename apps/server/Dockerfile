# Build from the monorepo root: docker build -f apps/server/Dockerfile -t innerwar-server .
FROM oven/bun:1
WORKDIR /app

# Prisma needs OpenSSL; ca-certificates for TLS to managed Postgres and SMTP;
# curl for the pnpm installer; libatomic1 because the standalone pnpm binary
# links it dynamically and it is not on this image by default.
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates curl libatomic1 \
  && rm -rf /var/lib/apt/lists/*

# Bun runs the server, but installs go through pnpm: pnpm-workspace.yaml uses
# the `catalog:` protocol, which bun install does not resolve like pnpm does.
# pnpm's standalone installer brings its own Node runtime (pnpm 11 needs
# node:sqlite, which Bun does not implement yet). The binary lands in
# $PNPM_HOME/bin, and the installer's `pnpm setup` needs some $SHELL set.
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV SHELL=/bin/bash
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=11.4.0 sh - \
  && pnpm --version

# Hosting platforms can inject NODE_ENV=production at build time, which makes
# pnpm skip devDependencies (including the prisma CLI). Reset further down.
ENV NODE_ENV=development

# Manifests + lockfile first, for layer caching. The server needs api, auth,
# db and config from packages/. The root postinstall runs Varlock codegen for
# every app, so each app's .env.schema has to exist in the image too.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/.env.schema packages/db/
COPY apps/server/package.json apps/server/.env.schema apps/server/
COPY apps/web/.env.schema apps/web/
COPY apps/dispatch/.env.schema apps/dispatch/
COPY apps/native/.env.schema apps/native/

# prisma.config.ts reads DATABASE_URL through prisma's env() helper, which
# throws when it is missing, even for `prisma generate`; Varlock codegen also
# validates the schemas. Placeholders for the build only: the real values are
# passed when the container starts.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
ENV BETTER_AUTH_URL=http://localhost:3000
ENV CORS_ORIGIN=http://localhost:3001
ENV SERVER_PUBLIC_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=http://localhost:3000

RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/api/ packages/api/
COPY packages/auth/ packages/auth/
COPY packages/db/ packages/db/
COPY apps/server/ apps/server/

RUN pnpm --filter @theinnerwar.app/db db:generate

ENV NODE_ENV=production
ENV PORT=3000
# The in-process runner sends queued newsletter broadcasts every minute.
ENV NEWSLETTER_RUNNER=true
ENV LOG_LEVEL=info
EXPOSE 3000

# No build step: Bun runs the TypeScript source directly, like `pnpm dev`.
WORKDIR /app/apps/server

# Pending migrations are applied at startup, not build time: they need the real
# DATABASE_URL and network access to the database, which only the running
# container has. `migrate deploy` is a no-op when everything is applied.
# `exec` hands PID 1 to bun so SIGTERM reaches it for a clean shutdown.
CMD ["sh", "-c", "pnpm --filter @theinnerwar.app/db db:migrate:deploy && exec bun run src/index.ts"]

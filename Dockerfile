# ─── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests first (cache layer)
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/workers/package.json packages/workers/
COPY packages/sdk/package.json packages/sdk/
COPY packages/mcp/package.json packages/mcp/
COPY packages/web/package.json packages/web/

# Install ALL deps (including devDeps for build)
RUN npm ci

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
COPY packages/workers/ packages/workers/
COPY packages/sdk/ packages/sdk/
COPY packages/mcp/ packages/mcp/
COPY packages/web/ packages/web/

# Ensure public dir exists (Next.js standalone needs it)
RUN mkdir -p packages/web/public

# Build all packages (shared → api, workers, sdk, mcp, web)
RUN npm run build

# ─── Stage 2: API production image ────────────────────────────
FROM node:20-alpine AS api
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/api/package.json packages/api/
COPY --from=builder /app/packages/workers/package.json packages/workers/
COPY --from=builder /app/packages/mcp/package.json packages/mcp/

# Install production deps + tsx (workspace packages export .ts source)
RUN npm ci --omit=dev --workspace=@beastbots/api --workspace=@beastbots/shared --workspace=@beastbots/workers --workspace=@beastbots/mcp && npm install tsx

COPY --from=builder /app/packages/shared/src/ packages/shared/src/
COPY --from=builder /app/packages/api/dist/ packages/api/dist/
COPY --from=builder /app/packages/api/src/lib/migrations/ packages/api/dist/lib/migrations/
COPY --from=builder /app/packages/workers/src/ packages/workers/src/
COPY --from=builder /app/packages/mcp/src/ packages/mcp/src/

ENV NODE_ENV=production
EXPOSE 4000

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--import", "tsx", "packages/api/dist/server.js"]

# ─── Stage 3: Web production image ────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./.next/static
COPY --from=builder /app/packages/web/public ./public

ENV NODE_ENV=production
EXPOSE 3000

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

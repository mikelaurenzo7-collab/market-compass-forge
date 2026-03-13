# AGENTS.md

## Cursor Cloud specific instructions

### Overview

BeastBots is an npm-workspaces monorepo (`packages/*`) with two required dev services:

| Service | Port | Start command |
|---|---|---|
| API (`@beastbots/api`) | 4000 | `npm run dev:api` |
| Web (`@beastbots/web`) | 3000 | `npm run dev:web` |

Workers, MCP, and SDK packages are optional for local development.

### Environment setup

Copy `.env.example` to `.env` and set `JWT_SECRET` and `ENCRYPTION_KEY` to non-empty values. The API uses SQLite (`beastbot.db`, auto-created and auto-migrated on first start).

### Running services

- Start API first (`npm run dev:api`), then web (`npm run dev:web`).
- The web frontend proxies `/api/*` to `http://localhost:4000` via Next.js rewrites.
- Seed a test user: `node scripts/seed-founder-account.cjs` (creates `mikelaurenzo7@gmail.com` / `test12`).

### Testing & linting

- Tests: `npm test` (vitest). 7 pre-existing failures in bot start/stop tests that require the Cloudflare Workers runtime; these are expected without workers running.
- Typecheck (lint equivalent): `npm run typecheck` — runs `tsc --noEmit` across all packages.
- No ESLint or Prettier configured in this repo; typecheck is the primary static analysis tool.

### Non-obvious caveats

- The `better-sqlite3` native addon is compiled during `npm install`. If Node.js major version changes, you may need to `rm -rf node_modules && npm install` to rebuild it.
- The `.env` file is git-ignored. It must exist for the API to start (dotenv loads it in `packages/api/src/server.ts`).
- Bot start/stop API endpoints forward to Cloudflare Workers (`WORKERS_BASE_URL`). Without the workers runtime, these return 500/502. This is expected in local dev.

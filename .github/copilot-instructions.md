# Copilot Instructions for BeastBots

## Project Overview

BeastBots is a premium autonomous AI operator platform built as a TypeScript monorepo. It has four product lanes:

1. **Trading Operators** — crypto, prediction markets, stocks
2. **Store Operators** — Shopify, Amazon, Etsy, Square, WooCommerce, eBay
3. **Social Operators** — X, TikTok, Instagram, Facebook, LinkedIn
4. **Workforce Agent Pods** — SMB + enterprise custom automations

## Tech Stack

- **Language:** TypeScript (strict mode, ES2022 target)
- **Monorepo:** npm workspaces
- **API:** Hono framework on Node.js
- **Web:** Next.js 14 with React 18
- **Runtime:** Cloudflare Workers + Durable Objects
- **Database:** SQLite via better-sqlite3 with sequential SQL migrations
- **Auth:** JWT (jose library), bcryptjs for password hashing
- **Validation:** Zod schemas
- **Testing:** Vitest
- **CI:** GitHub Actions (typecheck → test → build)

## Monorepo Structure

- `packages/shared` — Common types, constants, business logic (no dependencies)
- `packages/api` — Hono control plane (auth, integrations, governance, billing)
- `packages/web` — Next.js command center UI
- `packages/workers` — Cloudflare Workers + Durable Objects runtime
- `packages/mcp` — Model Context Protocol server integration
- `packages/sdk` — Public SDK for partners/operators

## Development Commands

```bash
npm install          # Install all dependencies
npm run dev:api      # Start API server (port 4000)
npm run dev:web      # Start Next.js dev server (port 3000)
npm run dev:workers  # Start Cloudflare Workers dev (port 8787)
npm run typecheck    # Run TypeScript type checking across packages
npm test             # Run all tests with Vitest
npm run build        # Build all packages (shared → api → web → mcp → workers → sdk)
```

## Testing Conventions

- Test framework: Vitest with globals enabled
- Test location: `packages/*/src/**/__tests__/**/*.test.ts`
- Tests run single-threaded to avoid parser race conditions
- Test timeout: 15 seconds
- Path aliases `@beastbots/shared` and `@beastbots/workers` are configured in `vitest.config.ts`

## Coding Conventions

- TypeScript strict mode is enforced — avoid `any` types
- Use ESM imports (`.js` extensions in import paths resolve to `.ts` source files)
- No ESLint or Prettier configured — follow existing code style
- Use Zod for request/input validation in API routes
- Use `jose` for JWT operations, never raw crypto for auth tokens
- Database migrations go in `packages/api/src/lib/migrations/` with sequential numeric prefixes (e.g., `010_feature_name.sql`)

## Safety Model (Critical)

All bot actions must pass through the 5-layer safety model:

1. **Policy checks** — validate actions against configured policies
2. **Approval queue** — high-risk actions require human approval
3. **Budget caps** — enforce runtime spending limits
4. **Circuit breakers + kill switches** — automatic and manual halt mechanisms
5. **Immutable audit trail** — log all actions for compliance

Never bypass or weaken safety checks. Tenant data is isolated by default.

## Architecture Notes

- One Durable Object per tenant+operator runtime
- Trading loops target 1-second cadence where exchange limits permit
- Non-trading loops run scheduled cadences based on policy
- Tenant memory is isolated; cross-tenant learning is opt-in only
- Environment variables are documented in `.env.example`

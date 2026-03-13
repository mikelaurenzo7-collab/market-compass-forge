# BeastBots Monorepo

BeastBots is an autonomous AI bot command center for trading, ecommerce, social operations, and custom workforce automations.

## Workspace packages
- `@beastbots/api` — Hono control plane for auth, integrations, approvals, governance, and billing.
- `@beastbots/web` — Next.js command center UI.
- `@beastbots/shared` — common types/constants.
- `@beastbots/workers` — Cloudflare Workers + Durable Objects runtime.
- `@beastbots/mcp` — MCP server integration surface.
- `@beastbots/sdk` — public SDK for partner/operator marketplace.

## Quickstart
```bash
npm install
npm run dev:api
npm run dev:web
```

## Deployment
- Docker-first deployment runbook: `docs/deployment.md`
- Optional Cloudflare Workers hybrid runtime instructions: `docs/deployment.md`
- Render blueprint for managed deployment: `render.yaml`

## Product lanes
1. Trading Operator Bots (crypto, prediction markets, stocks)
2. Store Operator Bots (Shopify, Amazon, Etsy, Square, WooCommerce, eBay)
3. Social Operator Bots (X, TikTok, Instagram, Facebook, LinkedIn)
4. Workforce Agent Pods (SMB + enterprise)

## Core safety model
- policy checks
- approval queue for high-risk actions
- runtime budget caps
- circuit breakers and kill switches
- tenant isolation with opt-in privacy-preserving aggregate learning

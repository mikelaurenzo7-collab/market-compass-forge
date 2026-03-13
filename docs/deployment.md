# Deployment Runbook

This repository supports two deployment modes:

1. **Docker-first (recommended for first production rollout)**  
   - `api` container (`@beastbots/api`)  
   - `web` container (`@beastbots/web`)  
   - Local runtime fallback (no Cloudflare control-plane required)
2. **Hybrid (Docker + Cloudflare Workers Durable Objects)**  
   - Same `api` + `web` containers  
   - `@beastbots/workers` deployed with Wrangler  
   - API control plane configured to call Workers runtime
3. **Managed (Render + Cloudflare)**  
   - Render hosts `api` + `web` from this monorepo (`render.yaml`)  
   - Cloudflare hosts Worker runtime with Durable Objects

---

## Prerequisites

- Docker + Docker Compose
- Node 20+ (for local validation)
- A populated `.env` file based on `.env.example`

Minimum required secrets for API startup:

- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `FRONTEND_URL`

---

## Environment contract

### Web/API routing

- Leave `NEXT_PUBLIC_API_URL` empty to keep browser calls same-origin (`/api/*`).
- Set `INTERNAL_API_URL` for server-side rewrites from Next.js to API service.

Example:

```env
NEXT_PUBLIC_API_URL=
INTERNAL_API_URL=http://api:4000
```

### OAuth provider keys

OAuth env keys must use:

```text
OAUTH_<PROVIDER>_<KEY>
```

Examples:

- `OAUTH_COINBASE_CLIENT_ID`
- `OAUTH_COINBASE_CLIENT_SECRET`
- `OAUTH_COINBASE_AUTHORIZE_URL`
- `OAUTH_COINBASE_TOKEN_URL`

---

## Path A: Docker-first deployment

From repo root:

```bash
docker compose build
docker compose up -d
```

Expected endpoints:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`

Smoke checks:

1. Open web UI and ensure dashboard loads.
2. Create test account (signup/login).
3. Create a bot and confirm status appears in UI/API.
4. Verify analytics endpoint returns data.

---

## Path B: Hybrid with Cloudflare Workers

1. Deploy worker:

```bash
npm -w @beastbots/workers run deploy
```

2. Set worker secret:

```bash
wrangler secret put WORKER_AUTH_TOKEN
```

3. Set API env vars:

```env
WORKERS_BASE_URL=https://<your-worker-domain>
WORKER_AUTH_TOKEN=<same-token-as-worker-secret>
```

4. Redeploy `api` service and run smoke checks.

### Cloudflare Worker Builds note (Durable Objects)

If your Worker Build pipeline uses:

```bash
npx wrangler versions upload
```

Durable Object migrations cannot be applied and deploy will fail.  
Use `wrangler deploy` for Worker deploys that include migrations.

Recommended Worker Build settings:

- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy --env=""`
- Ensure Worker Build token is valid (rotate/update token in Cloudflare dashboard if expired/deleted).

---

## Path C: Render + Cloudflare managed deployment

### Render

1. In Render dashboard, create from Blueprint using `render.yaml` in repo root.
2. Create both services:
   - `beastbots-api`
   - `beastbots-web`
3. Set required API secrets:
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
   - `FRONTEND_URL` (your web service URL)
4. Set web routing env:
   - `INTERNAL_API_URL=https://<api-service>.onrender.com`
   - leave `NEXT_PUBLIC_API_URL` empty for same-origin `/api` usage.

### Cloudflare

1. Deploy Worker with `wrangler deploy` (not versions upload for migrations).
2. Set Worker secret:
   - `WORKER_AUTH_TOKEN`
3. Configure API service env vars in Render:
   - `WORKERS_BASE_URL=https://<worker-domain>`
   - `WORKER_AUTH_TOKEN=<same-secret>`

---

## Operational checks

- `GET /api/health` returns success
- auth refresh flow works (`/api/auth/refresh`)
- bot control routes (`start/pause/stop`) succeed
- worker control-plane calls are authenticated when enabled

If worker env vars are omitted, API falls back to local in-process runtime.

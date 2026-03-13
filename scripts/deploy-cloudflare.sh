#!/usr/bin/env bash
set -euo pipefail

# Deploys the Cloudflare Worker (and applies required Durable Object migrations).
# Requires:
#   - CF_API_TOKEN environment variable set (Cloudflare API token with Workers + Durable Objects write permissions)
#   - A valid wrangler.toml in the repo root
#   - Optional: specify ENVIRONMENT=production|staging|dev for an env target

# default env target
ENV_TARGET=${ENVIRONMENT:-production}

echo "Deploying to Cloudflare (env=${ENV_TARGET})..."

if [[ -z "${CF_API_TOKEN:-}" ]]; then
  echo "ERROR: CF_API_TOKEN is not set. Create a Cloudflare API token and export it." >&2
  echo "  export CF_API_TOKEN=...
" >&2
  exit 1
fi

# Ensure wrangler is available
command -v wrangler >/dev/null 2>&1 || { echo "ERROR: wrangler not installed. Run npm install -g wrangler or npm install" >&2; exit 1; }

# Apply migrations (required for Durable Objects on free plan)
echo "Applying Cloudflare migrations..."
# use the environment if defined
if [[ "$ENV_TARGET" != "production" ]]; then
  npx wrangler migrations apply --env "$ENV_TARGET"
else
  npx wrangler migrations apply
fi

# Deploy
echo "Deploying Worker..."
if [[ "$ENV_TARGET" != "production" ]]; then
  npx wrangler deploy --env "$ENV_TARGET"
else
  npx wrangler deploy
fi

echo "Deployment complete."
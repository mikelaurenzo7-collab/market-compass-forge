// ─── Cloudflare Worker Entry Point ────────────────────────────
//
// This is the main file referenced by wrangler.toml.
// It re-exports the BotRuntimeDO (Durable Object) and the Worker fetch handler.
// This file is NOT imported by vitest — only by wrangler.

import { BotRuntimeDO } from './durable-objects/BotRuntimeDO.js';
import type { Env } from './durable-objects/BotRuntimeDO.js';

export { BotRuntimeDO };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Validates that the request carries a valid worker auth token. */
function isAuthorized(request: Request, env: Env & { WORKER_AUTH_TOKEN?: string }): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const expected = env.WORKER_AUTH_TOKEN;
  if (!expected || !token) return false;
  // Constant-time comparison
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);

    // Health check — unauthenticated
    if (segments[0] === 'health' || segments.length === 0) {
      return json({
        ok: true,
        service: 'beastbots-workers',
        env: env.ENVIRONMENT ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
    }

    // All other endpoints require auth
    if (!isAuthorized(request, env)) {
      return json({ error: 'unauthorized' }, 401);
    }

    // Bot operations: /bot/:tenantId/:botId/:action
    if (segments[0] === 'bot' && segments.length >= 4) {
      const tenantId = segments[1];
      const botId = segments[2];
      const action = segments[3];

      // Derive a stable DO ID from tenant+bot
      const doId = env.BOT_RUNTIME.idFromName(`${tenantId}:${botId}`);
      const stub = env.BOT_RUNTIME.get(doId);

      // Forward the request to the DO with the action as the path
      const doUrl = new URL(request.url);
      doUrl.pathname = `/${action}`;
      const doRequest = new Request(doUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      return stub.fetch(doRequest);
    }

    return json(
      { error: 'not_found', routes: ['/health', '/bot/:tenantId/:botId/:action'] },
      404,
    );
  },
};

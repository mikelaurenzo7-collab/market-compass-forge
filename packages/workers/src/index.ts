// ─── BeastBots Worker Runtime ─────────────────────────────────
//
// Pure engine exports + local dev runtime registry.
// This module has NO Cloudflare-specific imports so it works in
// Node.js, vitest, and any other standard runtime.
//
// The Cloudflare Worker entry point is worker-entry.ts (referenced by wrangler.toml).
// It re-exports BotRuntimeDO (the CF Durable Object wrapper) and the Worker fetch handler.

import { BotRuntime } from './durable-objects/BotRuntime.js';
import type { RuntimeState, StateChangeCallback } from './durable-objects/BotRuntime.js';
import type {
  BotFamily,
  Platform,
  TradingBotConfig,
  StoreBotConfig,
  SocialBotConfig,
  WorkforceBotConfig,
} from '@beastbots/shared';

// Re-export the pure engine (safe for Node/vitest)
export { BotRuntime };
export type { RuntimeState, StateChangeCallback };

// ─── Local Dev Runtime Registry ───────────────────────────────
//
// For local development and testing (outside Cloudflare).
// Uses in-memory Map to store BotRuntime instances.

const runtimes = new Map<string, BotRuntime>();

function getRuntimeKey(tenantId: string, botId: string): string {
  return `${tenantId}:${botId}`;
}

export function createRuntime(params: {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
  tickIntervalMs?: number;
  adapter?: any;
  onStateChange?: StateChangeCallback;
}): BotRuntime {
  const key = getRuntimeKey(params.tenantId, params.botId);
  const runtime = new BotRuntime();
  runtime.initialize(params);
  if (params.onStateChange) {
    runtime.setOnStateChange(params.onStateChange);
  }
  runtimes.set(key, runtime);
  return runtime;
}

export function getRuntime(tenantId: string, botId: string): BotRuntime | undefined {
  return runtimes.get(getRuntimeKey(tenantId, botId));
}

export function listRuntimes(tenantId: string): BotRuntime[] {
  const results: BotRuntime[] = [];
  for (const [key, runtime] of runtimes) {
    if (key.startsWith(`${tenantId}:`)) {
      results.push(runtime);
    }
  }
  return results;
}

export function destroyRuntime(tenantId: string, botId: string): boolean {
  const key = getRuntimeKey(tenantId, botId);
  const runtime = runtimes.get(key);
  if (runtime) {
    runtime.stop();
    runtimes.delete(key);
    return true;
  }
  return false;
}

// ─── Bootstrap ────────────────────────────────────────────────

export function bootstrapWorkers(): { ok: boolean; message: string } {
  return {
    ok: true,
    message: 'BeastBots Workers runtime ready — Durable Objects available for tenant allocation',
  };
}


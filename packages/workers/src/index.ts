import { TradingRuntimeDO } from './durable-objects/TradingRuntimeDO.js';
import type { BotFamily, Platform, TradingBotConfig, StoreBotConfig, SocialBotConfig } from '@beastbots/shared';

export { TradingRuntimeDO };

// ─── Runtime Registry ─────────────────────────────────────────

const runtimes = new Map<string, TradingRuntimeDO>();

function getRuntimeKey(tenantId: string, botId: string): string {
  return `${tenantId}:${botId}`;
}

export function createRuntime(params: {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig;
  tickIntervalMs?: number;
  adapter?: any;
}): TradingRuntimeDO {
  const key = getRuntimeKey(params.tenantId, params.botId);
  const runtime = new TradingRuntimeDO();
  runtime.initialize(params);
  runtimes.set(key, runtime);
  return runtime;
}

export function getRuntime(tenantId: string, botId: string): TradingRuntimeDO | undefined {
  return runtimes.get(getRuntimeKey(tenantId, botId));
}

export function listRuntimes(tenantId: string): TradingRuntimeDO[] {
  const results: TradingRuntimeDO[] = [];
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

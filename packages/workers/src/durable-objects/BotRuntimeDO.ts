// ─── Cloudflare Durable Object Wrapper ────────────────────────
//
// Wraps the BotRuntime engine in a real CF Durable Object that:
//   • Uses alarm() for tick scheduling (setInterval doesn't work in DOs)
//   • Persists state to ctx.storage between restarts
//   • Exposes an HTTP fetch() handler for control plane operations
//   • One DO instance per tenant+bot pair

import { DurableObject } from 'cloudflare:workers';
import { BotRuntime } from './BotRuntime.js';
import type { RuntimeState } from './BotRuntime.js';
import type {
  BotFamily,
  Platform,
  TradingBotConfig,
  StoreBotConfig,
  SocialBotConfig,
  WorkforceBotConfig,
} from '@beastbots/shared';

export interface Env {
  BOT_RUNTIME: DurableObjectNamespace<BotRuntimeDO>;
  ENVIRONMENT?: string;
  // API keys are passed via wrangler secrets, not vars
  OAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROK_API_KEY?: string;
}

interface InitPayload {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
  tickIntervalMs?: number;
  credentials?: {
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    shopDomain?: string;
    accessToken?: string;
    sandbox?: boolean;
  };
}

// ─── Storage Keys ─────────────────────────────────────────────

const STORAGE_KEYS = {
  INIT_PARAMS: 'init_params',
  ENGINE_STATE: 'engine_state',
  SAFETY_STATE: 'safety_state',
  METRICS: 'metrics',
  TICK_HISTORY: 'tick_history',
  STATUS: 'status',
  LAST_TICK_AT: 'last_tick_at',
} as const;

// ─── Durable Object ───────────────────────────────────────────

export class BotRuntimeDO extends DurableObject<Env> {
  private runtime: BotRuntime = new BotRuntime();
  private initialized = false;

  /**
   * Restore from storage on first access.
   * Called lazily before any operation.
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;

    const params = await this.ctx.storage.get<InitPayload>(STORAGE_KEYS.INIT_PARAMS);
    if (!params) return false;

    this.runtime.initialize(params);

    // Restore persisted engine state if available
    const stored = await this.ctx.storage.get([
        STORAGE_KEYS.ENGINE_STATE,
        STORAGE_KEYS.SAFETY_STATE,
        STORAGE_KEYS.METRICS,
        STORAGE_KEYS.TICK_HISTORY,
        STORAGE_KEYS.STATUS,
        STORAGE_KEYS.LAST_TICK_AT,
      ]);
    const engineState = stored.get(STORAGE_KEYS.ENGINE_STATE) as string | undefined;
    const safetyState = stored.get(STORAGE_KEYS.SAFETY_STATE) as string | undefined;
    const metrics = stored.get(STORAGE_KEYS.METRICS) as string | undefined;
    const tickHistory = stored.get(STORAGE_KEYS.TICK_HISTORY) as string | undefined;
    const status = stored.get(STORAGE_KEYS.STATUS) as string | undefined;
    const lastTickAt = stored.get(STORAGE_KEYS.LAST_TICK_AT) as number | undefined;

    if (engineState && safetyState && metrics && tickHistory && status !== undefined) {
      this.runtime.restoreState({
        engineState,
        safetyState,
        metrics,
        tickHistory,
        status,
        lastTickAt: lastTickAt ?? 0,
      });
    }

    this.initialized = true;
    return true;
  }

  /**
   * Persist current state to durable storage.
   */
  private async persistState(): Promise<void> {
    const serialized = this.runtime.serializeState();
    if (!serialized) return;

    await this.ctx.storage.put({
      [STORAGE_KEYS.ENGINE_STATE]: serialized.engineState,
      [STORAGE_KEYS.SAFETY_STATE]: serialized.safetyState,
      [STORAGE_KEYS.METRICS]: serialized.metrics,
      [STORAGE_KEYS.TICK_HISTORY]: serialized.tickHistory,
      [STORAGE_KEYS.STATUS]: serialized.status,
      [STORAGE_KEYS.LAST_TICK_AT]: serialized.lastTickAt,
    });
  }

  /**
   * Schedule the next alarm for periodic ticking.
   */
  private async scheduleNextAlarm(): Promise<void> {
    const state = this.runtime.getState();
    if (!state || state.status !== 'running') return;
    const nextTick = Date.now() + state.tickIntervalMs;
    await this.ctx.storage.setAlarm(nextTick);
  }

  // ─── Alarm Handler (replaces setInterval) ─────

  override async alarm(): Promise<void> {
    await this.ensureInitialized();
    const state = this.runtime.getState();
    if (!state || state.status !== 'running') return;

    const result = await this.runtime.tick();

    // Persist immediately on critical actions (trades, errors), otherwise every 10 ticks
    const isCritical = result && (result.result === 'executed' || result.result === 'error');
    if (isCritical || state.metrics.totalTicks % 10 === 0) {
      await this.persistState();
    }

    // Schedule next tick
    await this.scheduleNextAlarm();
  }

  // ─── HTTP Fetch Handler ───────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    // Routes: /init, /start, /pause, /stop, /kill, /tick, /state, /metrics, /history
    const action = path[path.length - 1] ?? '';

    try {
      switch (action) {
        case 'init': {
          if (request.method !== 'POST') {
            return json({ error: 'POST required' }, 405);
          }
          const params = (await request.json()) as InitPayload;
          // Store init params for future cold starts
          await this.ctx.storage.put(STORAGE_KEYS.INIT_PARAMS, params);
          const runtimeState = this.runtime.initialize(params);
          this.initialized = true;
          await this.persistState();
          return json({ ok: true, state: runtimeState });
        }

        case 'start': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          // BotRuntime.start() uses setInterval — we skip that and use alarms
          const state = this.runtime.getState();
          if (!state) return json({ error: 'no_state' }, 500);
          if (state.safety.circuitBreaker.isTripped) {
            return json({ ok: false, status: 'error', reason: 'circuit_breaker_tripped' });
          }
          state.status = 'running';
          await this.persistState();
          await this.scheduleNextAlarm();
          return json({ ok: true, status: 'running' });
        }

        case 'pause': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          this.runtime.pause();
          await this.ctx.storage.deleteAlarm();
          await this.persistState();
          return json({ ok: true, status: 'paused' });
        }

        case 'stop': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          this.runtime.stop();
          await this.ctx.storage.deleteAlarm();
          await this.persistState();
          return json({ ok: true, status: 'stopped' });
        }

        case 'kill': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          this.runtime.killSwitch();
          await this.ctx.storage.deleteAlarm();
          await this.persistState();
          return json({ ok: true, status: 'stopped', circuitBreaker: 'tripped' });
        }

        case 'tick': {
          // Manual tick (useful for testing / on-demand execution)
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          const result = await this.runtime.tick();
          await this.persistState();
          return json({ ok: true, result });
        }

        case 'update': {
          if (request.method !== 'POST') {
            return json({ error: 'POST required' }, 405);
          }
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }

          const body = await request.json() as Pick<InitPayload, 'config' | 'tickIntervalMs'>;
          const params = await this.ctx.storage.get<InitPayload>(STORAGE_KEYS.INIT_PARAMS);
          if (!params) {
            return json({ error: 'not_initialized' }, 400);
          }

          const nextParams: InitPayload = {
            ...params,
            config: body.config ?? params.config,
            tickIntervalMs: body.tickIntervalMs ?? params.tickIntervalMs,
          };

          await this.ctx.storage.put(STORAGE_KEYS.INIT_PARAMS, nextParams);
          this.runtime.applyConfig({ config: nextParams.config, tickIntervalMs: nextParams.tickIntervalMs });
          await this.persistState();

          const state = this.runtime.getState();
          if (state?.status === 'running') {
            await this.ctx.storage.deleteAlarm();
            await this.scheduleNextAlarm();
          }

          return json({ ok: true, state });
        }

        case 'state': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          return json(this.runtime.getState());
        }

        case 'metrics': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          return json(this.runtime.getMetrics());
        }

        case 'history': {
          if (!(await this.ensureInitialized())) {
            return json({ error: 'not_initialized' }, 400);
          }
          const limit = Number(url.searchParams.get('limit') ?? 50);
          return json(this.runtime.getTickHistory(limit));
        }

        case 'delete': {
          if (await this.ensureInitialized()) {
            this.runtime.stop();
          }
          await this.ctx.storage.deleteAlarm();
          await this.ctx.storage.deleteAll();
          this.runtime = new BotRuntime();
          this.initialized = false;
          return json({ ok: true, deleted: true });
        }

        default:
          return json({ error: 'unknown_action', available: ['init','start','pause','stop','kill','tick','update','state','metrics','history','delete'] }, 404);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: 'internal_error', message }, 500);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

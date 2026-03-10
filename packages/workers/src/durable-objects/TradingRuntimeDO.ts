import type {
  BotFamily,
  Platform,
  TradingBotConfig,
  StoreBotConfig,
  SocialBotConfig,
  BotStatus,
  BotMetrics,
  TickResult,
  TradingPlatform,
  StorePlatform,
  SocialPlatform,
} from '@beastbots/shared';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  createTradingAdapter,
  createStoreAdapter,
  createSocialAdapter,
} from '@beastbots/shared';
import type { SafetyContext } from '@beastbots/shared/src/safety.js';

// engines and helpers
import {
  createTradingEngineState,
  executeTradingTick,
} from '../../../shared/src/trading/engine';
import {
  createStoreEngineState,
  executeStoreTick,
} from '../../../shared/src/store/engine';
import {
  createSocialEngineState,
  executeSocialTick,
} from '../../../shared/src/social/engine';

// simple stub adapters used when no real provider is injected
function createStubAdapter(family: BotFamily): any {
  switch (family) {
    case 'trading':
      return {
        platform: 'coinbase',
        fetchMarketData: async (symbol: string) => ({
          symbol,
          price: 100,
          volume24h: 1000,
          high24h: 105,
          low24h: 95,
          change24hPercent: 0,
          bid: 100,
          ask: 101,
          timestamp: Date.now(),
        }),
        placeOrder: async (signal: any) => ({ orderId: `stub-${Date.now()}`, filled: true }),
        getPositions: async () => [],
        getBalance: async () => ({ availableUsd: 10000, totalUsd: 10000 }),
      };
    case 'store':
      return {
        platform: 'shopify',
        fetchProducts: async () => [],
        updatePrice: async (_id: string, _price: number) => ({ success: true }),
        getCompetitorPrices: async (_id: string) => [],
        getSalesHistory: async (_id: string, _days: number) => [],
        updateInventory: async (_id: string, _qty: number) => ({ success: true }),
      };
    case 'social':
      return {
        platform: 'x',
        publishPost: async (_post: any) => ({ postId: `stub-${Date.now()}`, success: true }),
        getMetrics: async () => ({
          platform: 'x',
          followers: 0,
          followersGrowthPercent: 0,
          engagementRate: 0,
          avgReach: 0,
          bestPostingHours: [],
          topHashtags: [],
          audienceTimezone: 'UTC',
        }),
        getTrending: async () => [],
        getScheduledPosts: async () => [],
        getPostsToday: async () => 0,
      };
    default:
      return {};
  }
}

function defaultTickIntervalMs(family: BotFamily): number {
  if (family === 'trading') return 1_000;
  if (family === 'store') return 300_000;
  if (family === 'social') return 900_000;
  return 60_000;
}

// ─── Unified Bot Runtime Durable Object ───────────────────────

export interface RuntimeState {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  status: BotStatus;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig;
  safety: SafetyContext;
  metrics: BotMetrics;
  lastTickAt: number;
  createdAt: number;
  tickIntervalMs: number;
  // engine-specific persistent state used by the strategy engines
  engineState?: any;
}


const MAX_TICK_HISTORY = 200;

export class TradingRuntimeDO {
  private state: RuntimeState | null = null;
  private lastHeartbeat = Date.now();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private adapter: any = null; // will hold TradingAdapter | StoreAdapter | SocialAdapter
  private tickHistory: TickResult[] = [];

  // ─── Lifecycle ────────────────────────────────

  initialize(params: {
    botId: string;
    tenantId: string;
    family: BotFamily;
    platform: Platform;
    config: TradingBotConfig | StoreBotConfig | SocialBotConfig;
    tickIntervalMs?: number;
    adapter?: any;
    credentials?: { apiKey: string; apiSecret: string; passphrase?: string; shopDomain?: string; accessToken?: string; sandbox?: boolean };
  }): RuntimeState {
    const safety: SafetyContext = {
      tenantId: params.tenantId,
      botId: params.botId,
      platform: params.platform,
      policies: createDefaultPolicies(params.family),
      budget: createDefaultBudget(params.family),
      circuitBreaker: createDefaultCircuitBreaker(),
    };

    this.state = {
      botId: params.botId,
      tenantId: params.tenantId,
      family: params.family,
      platform: params.platform,
      status: 'idle',
      config: params.config,
      safety,
      metrics: {
        totalTicks: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        totalPnlUsd: 0,
        uptimeMs: 0,
      },
      lastTickAt: 0,
      createdAt: Date.now(),
      tickIntervalMs: params.tickIntervalMs ?? defaultTickIntervalMs(params.family),
      engineState: undefined,
    };

    // attach adapter: use real adapter when credentials provided, stub otherwise
    if (params.adapter) {
      this.adapter = params.adapter;
    } else if (params.credentials) {
      switch (params.family) {
        case 'trading':
          this.adapter = createTradingAdapter(params.platform as TradingPlatform, params.credentials);
          break;
        case 'store':
          this.adapter = createStoreAdapter(params.platform as StorePlatform, params.credentials);
          break;
        case 'social':
          this.adapter = createSocialAdapter(params.platform as SocialPlatform, params.credentials);
          break;
        default:
          this.adapter = createStubAdapter(params.family);
      }
    } else {
      this.adapter = createStubAdapter(params.family);
    }

    // initialize engine-specific state
    switch (params.family) {
      case 'trading':
        this.state.engineState = createTradingEngineState(
          params.config as TradingBotConfig,
          this.state.safety
        );
        break;
      case 'store':
        this.state.engineState = createStoreEngineState(
          params.config as StoreBotConfig,
          this.state.safety
        );
        break;
      case 'social':
        this.state.engineState = createSocialEngineState(
          params.config as SocialBotConfig,
          this.state.safety
        );
        break;
      default:
        break;
    }

    return this.state as RuntimeState;
  }

  start(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };

    if (this.state.safety.circuitBreaker.isTripped) {
      return { ok: false, status: 'error' };
    }

    this.state.status = 'running';
    this.tickTimer = setInterval(() => {
      this.tick().catch((err) => console.error('tick error', err));
    }, this.state.tickIntervalMs);

    return { ok: true, status: this.state.status };
  }

  pause(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'paused';
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    return { ok: true, status: this.state.status };
  }

  stop(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'stopped';
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    return { ok: true, status: this.state.status };
  }

  // ─── Kill Switch (Layer 4) ────────────────────

  killSwitch(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'stopped';
    this.state.safety.circuitBreaker.isTripped = true;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    return { ok: true, status: 'stopped' };
  }

  // ─── Core Tick ────────────────────────────────

  async tick(): Promise<TickResult> {
    this.lastHeartbeat = Date.now();

    if (!this.state || this.state.status !== 'running') {
      return {
        botId: this.state?.botId ?? 'unknown',
        timestamp: Date.now(),
        action: 'heartbeat',
        result: 'skipped',
        details: { status: this.state?.status ?? 'uninitialized' },
        durationMs: 0,
      };
    }

    // Circuit breaker check
    if (this.state.safety.circuitBreaker.isTripped) {
      this.state.status = 'error';
      if (this.tickTimer) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }
      return {
        botId: this.state.botId,
        timestamp: Date.now(),
        action: 'circuit_breaker_halt',
        result: 'denied',
        details: { errors: this.state.safety.circuitBreaker.currentErrors },
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    this.state.metrics.totalTicks++;
    this.state.lastTickAt = Date.now();
    this.state.metrics.uptimeMs = Date.now() - this.state.createdAt;

    // dispatch to the engine corresponding to the bot family
    let engineResult: { result: TickResult; newState: any } | null = null;
    switch (this.state.family) {
      case 'trading':
        engineResult = await executeTradingTick(this.state.engineState, this.adapter);
        break;
      case 'store':
        engineResult = await executeStoreTick(this.state.engineState, this.adapter);
        break;
      case 'social':
        engineResult = await executeSocialTick(this.state.engineState, this.adapter);
        break;
    }

    if (engineResult) {
      this.state.engineState = engineResult.newState;
      // update metrics based on result
      const r = engineResult.result;
      if (r.result === 'executed') this.state.metrics.successfulActions++;
      else if (r.result === 'denied') this.state.metrics.deniedActions++;
      else if (r.result === 'error' || r.result === 'failure') this.state.metrics.failedActions++;

      this.recordTick(r);
      return r;
    }

    // fallback if no engine executed
    const result: TickResult = {
      botId: this.state.botId,
      timestamp: Date.now(),
      action: `${this.state.family}_tick`,
      result: 'skipped',
      details: { reason: 'no_engine' },
      durationMs: Date.now() - startTime,
    };

    this.recordTick(result);
    return result;
  }

  // ─── Tick History ──────────────────────────────

  private recordTick(result: TickResult): void {
    this.tickHistory.push(result);
    if (this.tickHistory.length > MAX_TICK_HISTORY) {
      this.tickHistory.shift();
    }
  }

  getTickHistory(limit?: number): TickResult[] {
    const n = Math.min(limit ?? MAX_TICK_HISTORY, this.tickHistory.length);
    return this.tickHistory.slice(-n);
  }

  // ─── Accessors ────────────────────────────────

  getState(): RuntimeState | null {
    return this.state;
  }

  getMetrics(): BotMetrics | null {
    return this.state?.metrics ?? null;
  }

  getStatus(): BotStatus {
    return this.state?.status ?? 'idle';
  }

  getHeartbeat(): number {
    return this.lastHeartbeat;
  }
}

import type {
  BotFamily,
  Platform,
  TradingBotConfig,
  StoreBotConfig,
  SocialBotConfig,
  WorkforceBotConfig,
  BotStatus,
  BotMetrics,
  TickResult,
  TradingPlatform,
  StorePlatform,
  SocialPlatform,
  WorkforceCategory,
  SafetyContext,
  TradingAdapter,
  StoreAdapter,
  SocialAdapter,
  WorkforceAdapter,
} from '@beastbots/shared';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  resetCircuitBreaker,
  createTradingAdapter,
  createStoreAdapter,
  createSocialAdapter,
  createWorkforceAdapter,
  createTradingEngineState,
  executeTradingTick,
  createStoreEngineState,
  executeStoreTick,
  createSocialEngineState,
  executeSocialTick,
  createWorkforceEngineState,
  executeWorkforceTick,
} from '@beastbots/shared';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeComplexValue(value: unknown): unknown {
  if (value instanceof Map) {
    return {
      __type: 'Map',
      entries: Array.from(value.entries()).map(([key, entryValue]) => [key, serializeComplexValue(entryValue)]),
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeComplexValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeComplexValue(entryValue)])
    );
  }

  return value;
}

function deserializeComplexValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => deserializeComplexValue(entry));
  }

  if (isPlainObject(value) && value.__type === 'Map' && Array.isArray(value.entries)) {
    return new Map(value.entries.map((entry) => {
      const [key, entryValue] = entry as [unknown, unknown];
      return [key, deserializeComplexValue(entryValue)];
    }));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deserializeComplexValue(entryValue)])
    );
  }

  return value;
}

function isSimulationMode(
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig,
): boolean {
  if ('paperTrading' in config) return Boolean(config.paperTrading);
  return Boolean(config.paperMode);
}

// simple stub adapters used when no real provider is injected
function createStubAdapter(family: BotFamily): TradingAdapter | StoreAdapter | SocialAdapter | WorkforceAdapter {
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
    case 'workforce':
      return {
        category: 'customer_support',
        fetchPendingTasks: async () => [],
        executeTask: async (task: any) => ({
          taskId: task.id ?? `stub-${Date.now()}`,
          status: 'completed' as const,
          success: true,
          action: 'stub_execute',
          details: {},
          durationMs: 0,
          escalated: false,
        }),
        escalateTask: async () => ({ success: true }),
        getTaskHistory: async () => [],
        sendNotification: async () => ({ success: true }),
      };
    default:
      // Unreachable for valid BotFamily values; fallback to trading stub
      return {
        platform: 'coinbase' as const,
        fetchMarketData: async (symbol: string) => ({
          symbol, price: 0, volume24h: 0, high24h: 0, low24h: 0,
          change24hPercent: 0, bid: 0, ask: 0, timestamp: Date.now(),
        }),
        placeOrder: async () => ({ orderId: 'stub', filled: false }),
        getPositions: async () => [],
        getBalance: async () => ({ availableUsd: 0, totalUsd: 0 }),
      } satisfies TradingAdapter;
  }
}

/**
 * Recommended tick intervals per bot family / platform / category.
 *
 * Trading (all platforms): 1 s — crypto markets run 24/7, stocks need
 *   pre/post-market monitoring, event markets need fast reaction to news.
 *   Trading bots MUST run continuously (no downtime windows).
 *
 * Store: 5 min — repricing and inventory checks; shorter intervals
 *   waste API quota and trigger rate-limits. Peak-season operators may
 *   reduce this to 2 min via custom tickIntervalMs.
 *
 * Social: 3 min — engagement automation (replies, DMs) benefits from
 *   near-realtime cadence. Trend detection needs <10 min windows.
 *   YouTube uploads are long-running; YouTube tick is elevated to 30 min
 *   for content scheduling, but engagement is checked every 3 min.
 *
 * Workforce per category:
 *   customer_support  30 s — SLA-driven; customer waiting on responses
 *   sales_crm         60 s — lead enrichment can tolerate 1-min latency
 *   email_management  45 s — near-realtime inbox triage
 *   it_ops            20 s — incident monitoring needs sub-minute polling
 *   scheduling        90 s — calendar sync tolerate slightly longer cadence
 *   finance           5 min — batch invoice/reconciliation workflows
 *   hr                5 min — onboarding tasks are rarely time-critical to the minute
 *   document_processing 2 min — OCR/classification pipelines
 *   compliance        5 min — regulatory monitoring; not second-level urgency
 *   reporting         10 min — reports are scheduled, not reactive
 *   project_management 2 min — task orchestration needs timely coordination
 *   procurement       5 min — vendor evaluation is not real-time
 */
export const TICK_INTERVALS: {
  trading: number;
  store: number;
  social: number;
  social_youtube: number;
  workforce: Record<string, number>;
  workforce_default: number;
} = {
  trading: 1_000,           // 1 s — 24/7 continuous
  store: 300_000,           // 5 min
  social: 180_000,          // 3 min (was 15 min — improved engagement response)
  social_youtube: 1_800_000, // 30 min — content scheduling cadence
  workforce: {
    customer_support: 30_000,
    email_management: 45_000,
    it_ops: 20_000,
    sales_crm: 60_000,
    document_processing: 120_000,
    project_management: 120_000,
    scheduling: 90_000,
    finance: 300_000,
    hr: 300_000,
    compliance: 300_000,
    procurement: 300_000,
    reporting: 600_000,
  },
  workforce_default: 60_000,
};

function defaultTickIntervalMs(family: BotFamily, platform?: string): number {
  if (family === 'trading') return TICK_INTERVALS.trading;
  if (family === 'store') return TICK_INTERVALS.store;
  if (family === 'social') {
    if (platform === 'youtube') return TICK_INTERVALS.social_youtube;
    return TICK_INTERVALS.social;
  }
  if (family === 'workforce') {
    return TICK_INTERVALS.workforce[platform ?? ''] ?? TICK_INTERVALS.workforce_default;
  }
  return 60_000;
}

// ─── Unified Bot Runtime Durable Object ───────────────────────

export interface RuntimeState {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  status: BotStatus;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
  safety: SafetyContext;
  metrics: BotMetrics;
  lastTickAt: number;
  createdAt: number;
  tickIntervalMs: number;
  // engine-specific persistent state used by the strategy engines
  engineState?: any;
}


const MAX_TICK_HISTORY = 200;

export type StateChangeCallback = (state: RuntimeState) => void;

export class BotRuntime {
  private state: RuntimeState | null = null;
  private lastHeartbeat = Date.now();
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private adapter: TradingAdapter | StoreAdapter | SocialAdapter | WorkforceAdapter | null = null;
  private onStateChange: StateChangeCallback | null = null;
  private tickHistory: TickResult[] = [];
  private tickInFlight = false;
  private usingStubAdapter = false;

  // ─── Lifecycle ────────────────────────────────

  initialize(params: {
    botId: string;
    tenantId: string;
    family: BotFamily;
    platform: Platform;
    config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
    tickIntervalMs?: number;
    adapter?: TradingAdapter | StoreAdapter | SocialAdapter | WorkforceAdapter;
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
        initialBalanceUsd: 0,
        uptimeMs: 0,
        totalTrades: 0,
        winningTrades: 0,
        consecutiveLosses: 0,
        custom: {},
      },
      lastTickAt: 0,
      createdAt: Date.now(),
      tickIntervalMs: params.tickIntervalMs ?? defaultTickIntervalMs(params.family, String(params.platform)),
      engineState: undefined,
    };

    // attach adapter: use real adapter when credentials provided, stub otherwise
    if (params.adapter) {
      this.adapter = params.adapter;
      this.usingStubAdapter = false;
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
        case 'workforce':
          this.adapter = createWorkforceAdapter((params.config as WorkforceBotConfig).category, params.credentials);
          break;
        default:
          this.adapter = createStubAdapter(params.family);
          this.usingStubAdapter = true;
      }
    } else {
      console.warn(`[BotRuntime] Bot ${params.botId} (${params.family}/${params.platform}): no credentials provided — using stub adapter (no real actions will execute)`);
      this.adapter = createStubAdapter(params.family);
      this.usingStubAdapter = true;
    }

    // initialize engine-specific state
    switch (params.family) {
      case 'trading':
        this.state.engineState = createTradingEngineState(
          params.config as TradingBotConfig,
          this.state!.safety
        );
        break;
      case 'store':
        this.state.engineState = createStoreEngineState(
          params.config as StoreBotConfig,
          this.state!.safety
        );
        break;
      case 'social':
        this.state.engineState = createSocialEngineState(
          params.config as SocialBotConfig,
          this.state!.safety
        );
        break;
      case 'workforce':
        this.state.engineState = createWorkforceEngineState(
          params.config as WorkforceBotConfig,
          this.state!.safety
        );
        break;
      default:
        break;
    }

    return this.state as RuntimeState;
  }

  applyConfig(params: {
    config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
    tickIntervalMs?: number;
  }): RuntimeState | null {
    if (!this.state) return null;

    this.state.config = params.config;
    if (params.tickIntervalMs !== undefined) {
      this.state.tickIntervalMs = params.tickIntervalMs;
    }

    if (this.state.engineState && typeof this.state.engineState === 'object') {
      this.state.engineState = {
        ...this.state.engineState,
        config: params.config,
        safety: this.state.safety,
      };
    }

    if (this.state.family === 'workforce' && this.adapter && 'category' in this.adapter) {
      (this.adapter as WorkforceAdapter).category = (params.config as WorkforceBotConfig).category;
    }

    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.state.status === 'running') {
      this.scheduleNextTick();
    }

    this.notifyStateChange();
    return this.state;
  }

  start(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };

    if (this.state.status === 'running') {
      return { ok: true, status: this.state.status };
    }

    if (this.usingStubAdapter && !isSimulationMode(this.state.config)) {
      this.state.status = 'error';
      this.notifyStateChange();
      return { ok: false, status: this.state.status };
    }

    if (this.state.safety.circuitBreaker.isTripped) {
      return { ok: false, status: 'error' };
    }

    this.state.status = 'running';
    this.scheduleNextTick();

    this.notifyStateChange();
    return { ok: true, status: this.state.status };
  }

  pause(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'paused';
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.notifyStateChange();
    return { ok: true, status: this.state.status };
  }

  stop(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'stopped';
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.notifyStateChange();
    return { ok: true, status: this.state.status };
  }

  // ─── Kill Switch (Layer 4) ────────────────────

  killSwitch(): { ok: boolean; status: BotStatus } {
    if (!this.state) return { ok: false, status: 'error' };
    this.state.status = 'stopped';
    this.state.safety.circuitBreaker.isTripped = true;
    this.state.safety.circuitBreaker.trippedAt = Date.now();
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.notifyStateChange();
    return { ok: true, status: 'stopped' };
  }

  private scheduleNextTick(): void {
    if (!this.state || this.state.status !== 'running' || this.tickTimer) return;
    this.tickTimer = setTimeout(() => {
      this.tickTimer = null;
      this.tick().catch((err) => console.error('tick error', err)).finally(() => {
        this.scheduleNextTick();
      });
    }, this.state.tickIntervalMs);
  }

  private syncMetricsFromEngineState(): void {
    if (!this.state || !this.state.engineState || typeof this.state.engineState !== 'object') return;
    const engineState = this.state.engineState as { totalPnl?: number };
    if (typeof engineState.totalPnl === 'number' && Number.isFinite(engineState.totalPnl)) {
      this.state.metrics.totalPnlUsd = engineState.totalPnl;
    }
  }

  // ─── Core Tick ────────────────────────────────

  async tick(): Promise<TickResult> {
    if (this.tickInFlight) {
      return {
        botId: this.state?.botId ?? 'unknown',
        timestamp: Date.now(),
        action: 'tick',
        result: 'skipped',
        details: { reason: 'tick_in_progress' },
        durationMs: 0,
      };
    }

    this.tickInFlight = true;
    this.lastHeartbeat = Date.now();

    try {
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

      if (this.state.safety.circuitBreaker.isTripped && this.state.safety.circuitBreaker.trippedAt) {
        const cooldownElapsed = Date.now() - this.state.safety.circuitBreaker.trippedAt >= this.state.safety.circuitBreaker.cooldownMs;
        if (cooldownElapsed) {
          this.state.safety = {
            ...this.state.safety,
            circuitBreaker: resetCircuitBreaker(this.state.safety.circuitBreaker),
          };
        }
      }

      // Circuit breaker check
      if (this.state.safety.circuitBreaker.isTripped) {
        this.state.status = 'error';
        if (this.tickTimer) {
          clearTimeout(this.tickTimer);
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

      if (this.usingStubAdapter && !isSimulationMode(this.state.config)) {
        this.state.status = 'error';
        return {
          botId: this.state.botId,
          timestamp: Date.now(),
          action: 'tick',
          result: 'error',
          details: { reason: 'live_credentials_missing' },
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
          engineResult = await executeTradingTick(this.state.engineState, this.adapter as TradingAdapter);
          break;
        case 'store':
          engineResult = await executeStoreTick(this.state.engineState, this.adapter as StoreAdapter);
          break;
        case 'social':
          engineResult = await executeSocialTick(this.state.engineState, this.adapter as SocialAdapter);
          break;
        case 'workforce':
          engineResult = await executeWorkforceTick(this.state.engineState, this.adapter as WorkforceAdapter);
          break;
      }

      if (engineResult) {
        this.state.engineState = engineResult.newState;
        this.syncMetricsFromEngineState();
        // update metrics based on result
        const r = engineResult.result;
        if (r.result === 'executed') this.state.metrics.successfulActions++;
        else if (r.result === 'denied') this.state.metrics.deniedActions++;
        else if (r.result === 'error') this.state.metrics.failedActions++;

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
    } finally {
      this.tickInFlight = false;
    }
<<<<<<< HEAD:packages/workers/src/durable-objects/TradingRuntimeDO.ts

    const startTime = Date.now();
    this.state.metrics.totalTicks++;
    this.state.lastTickAt = Date.now();
    this.state.metrics.uptimeMs = Date.now() - this.state.createdAt;
    // record initial balance on first tick (undefined or zero counts as uninitialized)
    if (!this.state.metrics.initialBalanceUsd && this.adapter && typeof (this.adapter as any).getBalance === 'function') {
      try {
        const bal = await (this.adapter as any).getBalance();
        if (bal?.totalUsd !== undefined) {
          this.state.metrics.initialBalanceUsd = bal.totalUsd;
        }
      } catch {
        // ignore failures
      }
    }

    // dispatch to the engine corresponding to the bot family
    let engineResult: { result: TickResult; newState: any } | null = null;
    switch (this.state.family) {
      case 'trading':
        engineResult = await executeTradingTick(this.state.engineState, this.adapter as TradingAdapter);
        break;
      case 'store':
        engineResult = await executeStoreTick(this.state.engineState, this.adapter as StoreAdapter);
        break;
      case 'social':
        engineResult = await executeSocialTick(this.state.engineState, this.adapter as SocialAdapter);
        break;
      case 'workforce':
        engineResult = await executeWorkforceTick(this.state.engineState, this.adapter as WorkforceAdapter);
        break;
    }

    if (engineResult) {
      this.state.engineState = engineResult.newState;
      // sync PnL from engine state
      if ((this.state.engineState as any).totalPnl !== undefined) {
        this.state.metrics.totalPnlUsd = (this.state.engineState as any).totalPnl;
      }
      // sync trade counts
      if ((this.state.engineState as any).totalTrades !== undefined) {
        this.state.metrics.totalTrades = (this.state.engineState as any).totalTrades;
      }
      if ((this.state.engineState as any).winningTrades !== undefined) {
        this.state.metrics.winningTrades = (this.state.engineState as any).winningTrades;
      }
      if ((this.state.engineState as any).consecutiveLosses !== undefined) {
        this.state.metrics.consecutiveLosses = (this.state.engineState as any).consecutiveLosses;
      }
      // copy any custom metrics provided by engine
      if ((this.state.engineState as any).customMetrics) {
        this.state.metrics.custom = { ...(this.state.engineState as any).customMetrics };
      }
      // update metrics based on result
      const r = engineResult.result;
      if (r.result === 'executed') this.state.metrics.successfulActions++;
      else if (r.result === 'denied') this.state.metrics.deniedActions++;
      else if (r.result === 'error') this.state.metrics.failedActions++;

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
=======
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662:packages/workers/src/durable-objects/BotRuntime.ts
  }

  // ─── Tick History ──────────────────────────────

  private recordTick(result: TickResult): void {
    this.tickHistory.push(result);
    if (this.tickHistory.length > MAX_TICK_HISTORY) {
      this.tickHistory.shift();
    }
    // Persist on critical actions (trades, price changes, inventory updates) immediately
    // Otherwise persist every 10 ticks for scans/skips to balance performance
    const isCritical = result.result === 'executed' || result.result === 'error';
    if (this.state && (isCritical || this.state.metrics.totalTicks % 10 === 0)) {
      this.notifyStateChange();
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

  setOnStateChange(cb: StateChangeCallback): void {
    this.onStateChange = cb;
  }

  private notifyStateChange(): void {
    if (this.onStateChange && this.state) {
      try { this.onStateChange(this.state); } catch { /* non-critical */ }
    }
  }

  /** Serialize state for persistence (excludes timers and adapters). */
  serializeState(): {
    engineState: string;
    safetyState: string;
    metrics: string;
    tickHistory: string;
    status: string;
    lastTickAt: number;
  } | null {
    if (!this.state) return null;
    // a few engineState fields are Maps; convert them to plain objects so JSON.stringify preserves their contents
    let engineCopy: any = this.state.engineState ?? {};
    if (this.state.family === 'trading' && engineCopy) {
      engineCopy = { ...engineCopy };
      if (engineCopy.priceHistories instanceof Map) {
        engineCopy.priceHistories = Object.fromEntries(engineCopy.priceHistories);
      }
      if (engineCopy.secondaryHistories instanceof Map) {
        engineCopy.secondaryHistories = Object.fromEntries(engineCopy.secondaryHistories);
      }
      if (engineCopy.lastDcaBuy instanceof Map) {
        engineCopy.lastDcaBuy = Object.fromEntries(engineCopy.lastDcaBuy);
      }
      if (engineCopy.highWater instanceof Map) {
        engineCopy.highWater = Object.fromEntries(engineCopy.highWater);
      }
    }
    return {
<<<<<<< HEAD:packages/workers/src/durable-objects/TradingRuntimeDO.ts
      engineState: JSON.stringify(engineCopy),
      safetyState: JSON.stringify(this.state.safety),
=======
      engineState: JSON.stringify(serializeComplexValue(this.state.engineState ?? {})),
      safetyState: JSON.stringify(serializeComplexValue(this.state.safety)),
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662:packages/workers/src/durable-objects/BotRuntime.ts
      metrics: JSON.stringify(this.state.metrics),
      tickHistory: JSON.stringify(this.tickHistory.slice(-50)),
      status: this.state.status,
      lastTickAt: this.state.lastTickAt,
    };
  }

  /** Restore persisted state into an already-initialized runtime. */
  restoreState(data: {
    engineState: string;
    safetyState: string;
    metrics: string;
    tickHistory: string;
    status: string;
    lastTickAt: number;
  }): void {
    if (!this.state) return;
    try {
<<<<<<< HEAD:packages/workers/src/durable-objects/TradingRuntimeDO.ts
      let parsed = JSON.parse(data.engineState);
      // repair trading engine maps lost during JSON serialization
      if (this.state.family === 'trading' && parsed) {
        if (!(parsed.priceHistories instanceof Map)) {
          parsed.priceHistories = new Map(Object.entries(parsed.priceHistories || {}));
        }
        if (!(parsed.secondaryHistories instanceof Map)) {
          parsed.secondaryHistories = new Map(Object.entries(parsed.secondaryHistories || {}));
        }
        if (!(parsed.lastDcaBuy instanceof Map)) {
          parsed.lastDcaBuy = new Map(Object.entries(parsed.lastDcaBuy || {}));
        }
        if (!(parsed.highWater instanceof Map)) {
          parsed.highWater = new Map(Object.entries(parsed.highWater || {}));
        }
      }
      this.state.engineState = parsed;
      this.state.safety = JSON.parse(data.safetyState);
      this.state.metrics = JSON.parse(data.metrics) as any;
      // fill in new fields if missing
      if (!this.state.metrics.initialBalanceUsd) {
        this.state.metrics.initialBalanceUsd = 0;
      }
      if (this.state.metrics.initialBalanceUsd && this.state.metrics.initialBalanceUsd !== 0) {
        this.state.metrics.roiPercent = (this.state.metrics.totalPnlUsd / this.state.metrics.initialBalanceUsd) * 100;
      }
=======
      this.state.engineState = deserializeComplexValue(JSON.parse(data.engineState));
      this.state.safety = deserializeComplexValue(JSON.parse(data.safetyState)) as SafetyContext;
      this.state.metrics = JSON.parse(data.metrics);
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662:packages/workers/src/durable-objects/BotRuntime.ts
      this.tickHistory = JSON.parse(data.tickHistory);
      this.state.status = data.status as BotStatus;
      this.state.lastTickAt = data.lastTickAt;
      this.syncMetricsFromEngineState();
    } catch {
      // If any parse fails, keep the freshly-initialized state
    }
  }

  getStatus(): BotStatus {
    return this.state?.status ?? 'idle';
  }

  getHeartbeat(): number {
    return this.lastHeartbeat;
  }
}

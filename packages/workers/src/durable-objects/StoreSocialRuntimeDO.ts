import type {
  BotRuntimeStatus,
  StoreBotPlatform,
  SocialBotPlatform,
  StoreStrategy,
  SocialStrategy,
  UserRiskProfile,
} from '@beastbots/shared';

const DEFAULT_STORE_LOOP_SECONDS = 600;   // 10 minutes
const DEFAULT_SOCIAL_LOOP_SECONDS = 900;  // 15 minutes
const DEFAULT_BUDGET_USD = 500;
const DEFAULT_DAILY_LOSS_LIMIT_USD = 100;
const CIRCUIT_OPEN_COOLDOWN_MS = 5 * 60 * 1000;

export type StoreSocialFamily = 'store' | 'social';

export interface StoreSocialConfig {
  botId: string;
  tenantId: string;
  family: StoreSocialFamily;
  /** The specific platform this bot is wired to. */
  platform: StoreBotPlatform | SocialBotPlatform;
  /** Active strategies for this platform. */
  strategies?: (StoreStrategy | SocialStrategy)[];
  /** User risk profile — the user is always in control. */
  riskProfile?: UserRiskProfile;
  /**
   * How many seconds between active work cycles.
   * Defaults to 600 s for store bots and 900 s for social bots.
   */
  loopSeconds?: number;
}

/**
 * Durable-Object-style runtime for store and social bots.
 *
 * Unlike `TradingRuntimeDO` (which ticks every second, 24/7), store and social
 * bots use configurable longer intervals to avoid hammering external APIs while
 * still remaining fully autonomous within the user's risk profile.
 */
export class StoreSocialRuntimeDO {
  private lastHeartbeat = Date.now();
  private lastCycleAt = 0;
  private running = false;
  private circuitOpen = false;
  private circuitOpenAt = 0;
  private cumulativeLossUsd = 0;
  private budgetUsd: number;
  private dailyLossLimitUsd: number;
  private readonly loopSeconds: number;
  private readonly config: StoreSocialConfig;

  constructor(config: StoreSocialConfig) {
    this.config = config;
    this.budgetUsd =
      config.riskProfile?.budgetUsd ?? DEFAULT_BUDGET_USD;
    this.dailyLossLimitUsd =
      config.riskProfile?.dailyLossLimitUsd ?? DEFAULT_DAILY_LOSS_LIMIT_USD;
    this.loopSeconds =
      config.loopSeconds ??
      (config.family === 'store' ? DEFAULT_STORE_LOOP_SECONDS : DEFAULT_SOCIAL_LOOP_SECONDS);
  }

  /**
   * Called on each heartbeat (can be called frequently — the DO will skip
   * work cycles that are within the configured loop interval).
   *
   * Returns `{ ok: true, acted: true }` when a full work cycle executed, or
   * `{ ok: true, acted: false }` when the interval hasn't elapsed yet.
   */
  tick(): { ok: boolean; acted: boolean; loopSeconds: number; message?: string } {
    // Auto-reset circuit breaker after cooldown
    if (this.circuitOpen && Date.now() - this.circuitOpenAt >= CIRCUIT_OPEN_COOLDOWN_MS) {
      this.circuitOpen = false;
    }

    if (this.circuitOpen) {
      return {
        ok: false,
        acted: false,
        loopSeconds: this.loopSeconds,
        message: 'Circuit breaker open — bot halted',
      };
    }

    if (this.budgetUsd <= 0) {
      return {
        ok: false,
        acted: false,
        loopSeconds: this.loopSeconds,
        message: 'Budget exhausted',
      };
    }

    this.lastHeartbeat = Date.now();
    this.running = true;

    const nowMs = Date.now();
    const elapsedMs = nowMs - this.lastCycleAt;
    if (elapsedMs < this.loopSeconds * 1000) {
      // Interval not yet elapsed — skip this cycle
      return { ok: true, acted: false, loopSeconds: this.loopSeconds };
    }

    // Cycle elapsed — record execution
    this.lastCycleAt = nowMs;
    return { ok: true, acted: true, loopSeconds: this.loopSeconds };
  }

  /**
   * Record a spend / loss against this bot's budget.
   * Trips the circuit breaker if the daily loss limit is breached.
   */
  recordLoss(usd: number): void {
    if (usd < 0) throw new Error('Loss amount cannot be negative');
    this.cumulativeLossUsd += usd;
    this.budgetUsd = Math.max(0, this.budgetUsd - usd);

    if (this.cumulativeLossUsd >= this.dailyLossLimitUsd) {
      this.tripCircuitBreaker(`Daily loss limit of $${this.dailyLossLimitUsd} reached`);
    }
  }

  /** Manually trip the circuit breaker (kill switch). */
  tripCircuitBreaker(reason?: string): void {
    this.circuitOpen = true;
    this.circuitOpenAt = Date.now();
    this.running = false;
    if (reason) {
      console.warn(`[StoreSocialRuntimeDO:${this.config.platform}] Circuit breaker tripped: ${reason}`);
    }
  }

  /** Reset the circuit breaker manually. */
  resetCircuitBreaker(): void {
    this.circuitOpen = false;
    this.circuitOpenAt = 0;
  }

  /** Snapshot of the current runtime status. */
  status(): BotRuntimeStatus {
    return {
      botId: this.config.botId,
      tenantId: this.config.tenantId,
      family: this.config.family,
      subtype: this.config.platform,
      running: this.running,
      loopSeconds: this.loopSeconds,
      circuitOpen: this.circuitOpen,
      budgetRemainingUsd: this.budgetUsd,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      strategies: this.config.strategies,
    };
  }
}

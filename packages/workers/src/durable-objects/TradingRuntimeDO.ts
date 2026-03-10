import type { BotRuntimeStatus, BotFamily, TradingBotType, TradingStrategy, UserRiskProfile } from '@beastbots/shared';

const DEFAULT_BUDGET_USD = 1000;
const DEFAULT_DAILY_LOSS_LIMIT_USD = 250;
/** Milliseconds the circuit breaker stays open before auto-resetting (5 minutes). */
const CIRCUIT_OPEN_COOLDOWN_MS = 5 * 60 * 1000;

export interface TradingConfig {
  botId: string;
  tenantId: string;
  family: BotFamily;
  /** Elite trading sub-type: crypto, stocks, or predictions. */
  tradingBotType?: TradingBotType;
  /** Active trading strategies (e.g. dca, momentum). */
  strategies?: TradingStrategy[];
  /** Full user risk profile — overrides legacy budget/loss limit fields when provided. */
  riskProfile?: UserRiskProfile;
  /** @deprecated Use riskProfile.budgetUsd instead. */
  budgetUsd?: number;
  /** @deprecated Use riskProfile.dailyLossLimitUsd instead. */
  dailyLossLimitUsd?: number;
}

export class TradingRuntimeDO {
  private lastHeartbeat = Date.now();
  private running = false;
  private circuitOpen = false;
  private circuitOpenAt = 0;
  private cumulativeLossUsd = 0;
  private budgetUsd: number;
  private dailyLossLimitUsd: number;
  private readonly config: TradingConfig;

  constructor(config?: TradingConfig) {
    this.config = config ?? {
      botId: 'default',
      tenantId: 'default',
      family: 'trading',
    };
    // riskProfile takes precedence over legacy scalar fields
    this.budgetUsd =
      config?.riskProfile?.budgetUsd ?? config?.budgetUsd ?? DEFAULT_BUDGET_USD;
    this.dailyLossLimitUsd =
      config?.riskProfile?.dailyLossLimitUsd ??
      config?.dailyLossLimitUsd ??
      DEFAULT_DAILY_LOSS_LIMIT_USD;
  }

  /** Advance the trading loop by one tick. Returns status or throws if halted.
   *  Trading bots run 24/7 via Cloudflare Durable Objects — this is called
   *  every second from the DO alarm loop. */
  tick(): { ok: boolean; loopSeconds: number; message?: string } {
    // Auto-reset circuit breaker after cooldown
    if (this.circuitOpen && Date.now() - this.circuitOpenAt >= CIRCUIT_OPEN_COOLDOWN_MS) {
      this.circuitOpen = false;
    }

    if (this.circuitOpen) {
      return { ok: false, loopSeconds: 1, message: 'Circuit breaker open — trading halted' };
    }

    if (this.budgetUsd <= 0) {
      return { ok: false, loopSeconds: 1, message: 'Budget exhausted' };
    }

    this.lastHeartbeat = Date.now();
    this.running = true;
    return { ok: true, loopSeconds: 1 };
  }

  /** Record a loss and trip the circuit breaker if the daily limit is breached. */
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
    if (reason) console.warn(`[TradingRuntimeDO] Circuit breaker tripped: ${reason}`);
  }

  /** Reset the circuit breaker manually. */
  resetCircuitBreaker(): void {
    this.circuitOpen = false;
    this.circuitOpenAt = 0;
  }

  /** Get a snapshot of the current runtime status. */
  status(): BotRuntimeStatus {
    return {
      botId: this.config.botId,
      tenantId: this.config.tenantId,
      family: this.config.family,
      subtype: this.config.tradingBotType,
      running: this.running,
      loopSeconds: 1,
      circuitOpen: this.circuitOpen,
      budgetRemainingUsd: this.budgetUsd,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      strategies: this.config.strategies,
    };
  }
}

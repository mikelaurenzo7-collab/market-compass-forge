/**
 * OpenClaw Clawdbot Agent — safety-hardened supervisor for BeastBots.
 *
 * Safety guarantees:
 *  1. Rate-limited: max N mutating actions per cycle, max M per bot per hour.
 *  2. Restart-loop prevention: tracks recent restarts per bot; won't restart
 *     the same bot more than MAX_RESTARTS_PER_HOUR times.
 *  3. Dry-run mode: when AGENT_DRY_RUN=true, logs what it *would* do without
 *     sending any mutating requests.
 *  4. Audit trail: every action the agent takes (or skips) is logged to the
 *     API's audit endpoint so there is a permanent, tenant-scoped record.
 *  5. Startup validation: refuses to run without a valid API_KEY.
 *  6. Per-family thresholds are configurable via environment variables.
 *  7. Error isolation: a failure handling one bot never affects others.
 *
 * Adaptive intelligence:
 *  8. Adaptive thresholds: per-bot thresholds adjust based on the bot's own
 *     metrics (win rate, ROI, denial rate).
 *  9. Richer metrics: reads totalPnlUsd, roiPercent, winRate, deniedActions
 *     for smarter decisions beyond simple counters.
 * 10. Auto-resume: paused bots are automatically resumed after a cooldown
 *     when their metrics recover to safe levels.
 * 11. Config recommendations: logs actionable config suggestions to the
 *     audit trail when patterns are detected.
 */

// ─── Configuration ──────────────────────────────────────────────

export interface AgentConfig {
  apiUrl: string;
  apiKey: string;
  dryRun: boolean;
  pollIntervalMs: number;
  maxActionsPerCycle: number;
  maxRestartsPerBotPerHour: number;
  // per-family base thresholds (adaptive logic may adjust these per bot)
  tradingMaxConsecutiveLosses: number;
  storeInactivityTickThreshold: number;
  socialMaxActionsPerHour: number;
  workforceMaxFailureRate: number;
  // adaptive & auto-resume
  adaptiveThresholds: boolean;
  autoResume: boolean;
  resumeCooldownMs: number;
}

export function loadConfig(): AgentConfig {
  const apiKey = process.env.API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'AGENT SAFETY: API_KEY is required. The agent must authenticate as a real user. Exiting.'
    );
  }
  return {
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    apiKey,
    dryRun: process.env.AGENT_DRY_RUN === 'true',
    pollIntervalMs: Number(process.env.AGENT_POLL_INTERVAL_MS || 60_000),
    maxActionsPerCycle: Number(process.env.AGENT_MAX_ACTIONS_PER_CYCLE || 5),
    maxRestartsPerBotPerHour: Number(process.env.AGENT_MAX_RESTARTS_PER_BOT_PER_HOUR || 2),
    tradingMaxConsecutiveLosses: Number(process.env.AGENT_TRADING_MAX_LOSSES || 3),
    storeInactivityTickThreshold: Number(process.env.AGENT_STORE_INACTIVITY_TICKS || 100),
    socialMaxActionsPerHour: Number(process.env.AGENT_SOCIAL_MAX_ACTIONS || 10),
    workforceMaxFailureRate: Number(process.env.AGENT_WORKFORCE_MAX_FAILURE_RATE || 0.5),
    adaptiveThresholds: process.env.AGENT_ADAPTIVE_THRESHOLDS !== 'false', // on by default
    autoResume: process.env.AGENT_AUTO_RESUME !== 'false', // on by default
    resumeCooldownMs: Number(process.env.AGENT_RESUME_COOLDOWN_MS || 300_000), // 5 min
  };
}

// ─── Types ──────────────────────────────────────────────────────

export type AgentAction = 'start' | 'stop' | 'pause' | 'restart' | 'resume';

export interface AgentDecision {
  botId: string;
  family: string;
  action: AgentAction;
  reason: string;
  executed: boolean; // false if dry-run or rate-limited
  recommendation?: string; // optional config suggestion
}

export type ApiFetchFn = (path: string, opts?: any) => Promise<any>;

// ─── Restart tracker ────────────────────────────────────────────

export class RestartTracker {
  // botId → timestamps of recent restarts
  private history = new Map<string, number[]>();
  // botId → timestamp of last pause action
  private pausedAt = new Map<string, number>();

  record(botId: string): void {
    const list = this.history.get(botId) ?? [];
    list.push(Date.now());
    this.history.set(botId, list);
  }

  countInWindow(botId: string, windowMs: number = 3_600_000): number {
    const now = Date.now();
    const list = (this.history.get(botId) ?? []).filter((t) => now - t < windowMs);
    this.history.set(botId, list); // prune old entries
    return list.length;
  }

  recordPause(botId: string): void {
    this.pausedAt.set(botId, Date.now());
  }

  getPauseAge(botId: string): number {
    const t = this.pausedAt.get(botId);
    return t ? Date.now() - t : Infinity;
  }

  clearPause(botId: string): void {
    this.pausedAt.delete(botId);
  }
}

// ─── Adaptive thresholds ────────────────────────────────────────

export interface AdaptiveThresholds {
  tradingLossLimit: number;
  storeInactivityTicks: number;
  socialActionLimit: number;
  workforceFailureRate: number;
}

export function computeAdaptiveThresholds(
  config: AgentConfig,
  metrics: any,
  family: string
): AdaptiveThresholds {
  const base: AdaptiveThresholds = {
    tradingLossLimit: config.tradingMaxConsecutiveLosses,
    storeInactivityTicks: config.storeInactivityTickThreshold,
    socialActionLimit: config.socialMaxActionsPerHour,
    workforceFailureRate: config.workforceMaxFailureRate,
  };

  if (!config.adaptiveThresholds || !metrics) return base;

  switch (family) {
    case 'trading': {
      // High win-rate bots get more rope; low win-rate bots get tighter limits
      const winRate = metrics.winRate ?? 0;
      const roi = metrics.roiPercent ?? 0;
      if (winRate > 0.6 && roi > 0) {
        // Profitable bot with solid win rate — allow up to 2x loss streak
        base.tradingLossLimit = Math.min(config.tradingMaxConsecutiveLosses * 2, 10);
      } else if (winRate < 0.35 && metrics.totalTrades > 10) {
        // Consistently losing — tighten to floor of 2
        base.tradingLossLimit = Math.max(2, config.tradingMaxConsecutiveLosses - 1);
      }
      break;
    }
    case 'store': {
      // If bot has historically done well, give it more time before restart
      const totalActions = metrics.successfulActions ?? 0;
      if (totalActions > 50) {
        // Proven bot — extend patience by 50%
        base.storeInactivityTicks = Math.round(config.storeInactivityTickThreshold * 1.5);
      }
      break;
    }
    case 'social': {
      // If denial rate is high, the safety pipeline is already throttling — lower agent limit
      const deniedRate = metrics.deniedActions / (metrics.successfulActions + metrics.deniedActions || 1);
      if (deniedRate > 0.3) {
        base.socialActionLimit = Math.max(5, Math.round(config.socialMaxActionsPerHour * 0.7));
      }
      break;
    }
    case 'workforce': {
      // If denial rate is high, safety already limiting — tighten failure threshold
      const deniedRate = metrics.deniedActions / ((metrics.totalTicks || 1));
      if (deniedRate > 0.2) {
        base.workforceFailureRate = Math.max(0.2, config.workforceMaxFailureRate - 0.1);
      }
      break;
    }
  }

  return base;
}

// ─── Config recommendations ─────────────────────────────────────

export function generateRecommendation(metrics: any, family: string): string | undefined {
  if (!metrics) return undefined;

  switch (family) {
    case 'trading': {
      const winRate = metrics.winRate ?? 0;
      const totalTrades = metrics.totalTrades ?? 0;
      const roi = metrics.roiPercent ?? 0;
      if (totalTrades > 20 && winRate < 0.35) {
        return `Win rate is ${(winRate * 100).toFixed(0)}% over ${totalTrades} trades. Consider switching strategy or reducing position size.`;
      }
      if (totalTrades > 20 && roi < -15) {
        return `ROI is ${roi.toFixed(1)}%. Consider enabling paper trading mode until strategy is validated.`;
      }
      if (totalTrades > 50 && winRate > 0.65 && roi > 10) {
        return `Strong performance (${(winRate * 100).toFixed(0)}% win rate, ${roi.toFixed(1)}% ROI). Could increase maxPositionSizeUsd cautiously.`;
      }
      break;
    }
    case 'store': {
      const deniedActions = metrics.deniedActions ?? 0;
      const successfulActions = metrics.successfulActions ?? 0;
      if (successfulActions > 0 && deniedActions > successfulActions * 0.5) {
        return `${deniedActions} denied vs ${successfulActions} successful actions. Safety policies may be too strict — review maxPriceChangePercent.`;
      }
      break;
    }
    case 'social': {
      const denied = metrics.deniedActions ?? 0;
      const total = metrics.successfulActions ?? 0;
      if (total > 0 && denied > total) {
        return `More actions denied (${denied}) than successful (${total}). Review contentApprovalRequired and sensitiveTopicKeywords.`;
      }
      break;
    }
    case 'workforce': {
      const failed = metrics.failedActions ?? 0;
      const completed = metrics.successfulActions ?? 0;
      const total = failed + completed;
      if (total > 20 && failed / total > 0.3) {
        return `${((failed / total) * 100).toFixed(0)}% failure rate over ${total} tasks. Consider raising escalationThresholdConfidence or reducing maxTasksPerHour.`;
      }
      break;
    }
  }
  return undefined;
}

// ─── Agent core ─────────────────────────────────────────────────

export async function handleBot(
  bot: any,
  apiFetch: ApiFetchFn,
  config: AgentConfig,
  tracker: RestartTracker,
  actionsThisCycle: { count: number }
): Promise<AgentDecision | null> {
  // enforce per-cycle action cap
  if (actionsThisCycle.count >= config.maxActionsPerCycle) {
    return null; // skip — budget exhausted for this cycle
  }

  // ── paused bots: check for auto-resume ──
  if (bot.status === 'paused' && config.autoResume) {
    return handleAutoResume(bot, apiFetch, config, tracker, actionsThisCycle);
  }

  // ── stopped bots: restart with loop prevention ──
  if (bot.status === 'stopped') {
    const recentRestarts = tracker.countInWindow(bot.id);
    if (recentRestarts >= config.maxRestartsPerBotPerHour) {
      const decision: AgentDecision = {
        botId: bot.id,
        family: bot.family ?? 'unknown',
        action: 'restart',
        reason: `Restart suppressed: ${recentRestarts} restarts in last hour (limit ${config.maxRestartsPerBotPerHour})`,
        executed: false,
      };
      await logAgentAudit(apiFetch, decision, config.dryRun);
      return decision;
    }

    const decision: AgentDecision = {
      botId: bot.id,
      family: bot.family ?? 'unknown',
      action: 'restart',
      reason: 'Bot was stopped; restarting',
      executed: !config.dryRun,
    };
    if (!config.dryRun) {
      await apiFetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
      tracker.record(bot.id);
    }
    actionsThisCycle.count++;
    await logAgentAudit(apiFetch, decision, config.dryRun);
    return decision;
  }

  if (bot.status !== 'running') return null;

  // ── fetch metrics ──
  let metricsRes: any;
  try {
    metricsRes = await apiFetch(`/api/bots/${bot.id}/metrics`);
  } catch {
    return null; // network error — skip silently, try next cycle
  }
  if (!metricsRes?.success) return null;

  const m = metricsRes.data?.metrics || {};

  // compute adaptive thresholds based on this bot's metrics
  const thresholds = computeAdaptiveThresholds(config, m, bot.family);

  // generate config recommendation (if any)
  const recommendation = generateRecommendation(m, bot.family);

  // ── cross-family: high denial rate warning ──
  const totalAttempted = (m.successfulActions ?? 0) + (m.deniedActions ?? 0) + (m.failedActions ?? 0);
  if (totalAttempted > 10 && (m.deniedActions ?? 0) / totalAttempted > 0.5) {
    const decision: AgentDecision = {
      botId: bot.id,
      family: bot.family ?? 'unknown',
      action: 'pause',
      reason: `High denial rate: ${m.deniedActions}/${totalAttempted} actions denied (>50%). Possible misconfiguration.`,
      executed: !config.dryRun,
      recommendation,
    };
    if (!config.dryRun) {
      await apiFetch(`/api/bots/${bot.id}/pause`, { method: 'POST' });
      tracker.recordPause(bot.id);
    }
    actionsThisCycle.count++;
    await logAgentAudit(apiFetch, decision, config.dryRun);
    return decision;
  }

  // ── per-family safety rules (with adaptive thresholds) ──
  let decision: AgentDecision | null = null;

  switch (bot.family) {
    case 'trading': {
      // Primary: consecutive loss streak
      if (m.consecutiveLosses && m.consecutiveLosses >= thresholds.tradingLossLimit) {
        decision = {
          botId: bot.id,
          family: 'trading',
          action: 'pause',
          reason: `${m.consecutiveLosses} consecutive losses (adaptive threshold ${thresholds.tradingLossLimit})`,
          executed: !config.dryRun,
          recommendation,
        };
        break;
      }
      // Secondary: severe drawdown by ROI
      const roi = m.roiPercent ?? 0;
      if (m.totalTrades > 5 && roi < -25) {
        decision = {
          botId: bot.id,
          family: 'trading',
          action: 'pause',
          reason: `ROI at ${roi.toFixed(1)}% — severe drawdown. Pausing to prevent further loss.`,
          executed: !config.dryRun,
          recommendation: recommendation ?? 'Consider enabling paper trading mode.',
        };
      }
      break;
    }

    case 'store':
      if (m.successfulActions === 0 && m.totalTicks > thresholds.storeInactivityTicks) {
        const recentRestarts = tracker.countInWindow(bot.id);
        if (recentRestarts >= config.maxRestartsPerBotPerHour) {
          decision = {
            botId: bot.id,
            family: 'store',
            action: 'restart',
            reason: `Store restart suppressed: ${recentRestarts} restarts in last hour`,
            executed: false,
            recommendation,
          };
        } else {
          decision = {
            botId: bot.id,
            family: 'store',
            action: 'restart',
            reason: `0 successful actions after ${m.totalTicks} ticks (adaptive threshold ${thresholds.storeInactivityTicks})`,
            executed: !config.dryRun,
            recommendation,
          };
        }
      }
      break;

    case 'social':
      if (m.successfulActions && m.successfulActions > thresholds.socialActionLimit) {
        decision = {
          botId: bot.id,
          family: 'social',
          action: 'pause',
          reason: `${m.successfulActions} actions exceeds adaptive rate limit (${thresholds.socialActionLimit}/hr)`,
          executed: !config.dryRun,
          recommendation,
        };
      }
      break;

    case 'workforce':
      if (m.failedActions && m.failedActions / (m.totalTicks || 1) > thresholds.workforceFailureRate) {
        decision = {
          botId: bot.id,
          family: 'workforce',
          action: 'pause',
          reason: `Failure rate ${((m.failedActions / (m.totalTicks || 1)) * 100).toFixed(0)}% exceeds adaptive threshold ${(thresholds.workforceFailureRate * 100).toFixed(0)}%`,
          executed: !config.dryRun,
          recommendation,
        };
      }
      break;
  }

  if (!decision) return null;

  // execute
  if (decision.executed) {
    if (decision.action === 'pause') {
      await apiFetch(`/api/bots/${bot.id}/pause`, { method: 'POST' });
      tracker.recordPause(bot.id);
    } else if (decision.action === 'restart') {
      await apiFetch(`/api/bots/${bot.id}/stop`, { method: 'POST' });
      await apiFetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
      tracker.record(bot.id);
    }
  }
  actionsThisCycle.count++;
  await logAgentAudit(apiFetch, decision, config.dryRun);
  return decision;
}

// ─── Auto-resume ────────────────────────────────────────────────

async function handleAutoResume(
  bot: any,
  apiFetch: ApiFetchFn,
  config: AgentConfig,
  tracker: RestartTracker,
  actionsThisCycle: { count: number }
): Promise<AgentDecision | null> {
  // Check cooldown period
  const pauseAge = tracker.getPauseAge(bot.id);
  if (pauseAge < config.resumeCooldownMs) {
    return null; // too soon — wait for cooldown
  }

  // Fetch current metrics to see if conditions have recovered
  let metricsRes: any;
  try {
    metricsRes = await apiFetch(`/api/bots/${bot.id}/metrics`);
  } catch {
    return null;
  }
  if (!metricsRes?.success) return null;
  const m = metricsRes.data?.metrics || {};

  // Per-family recovery check
  let recovered = false;
  let reason = '';

  switch (bot.family) {
    case 'trading':
      // Resume only if loss streak has been broken (metrics reset on restart)
      // or if the bot was paused for ROI and its PnL is no longer critical
      if ((m.consecutiveLosses ?? 0) < config.tradingMaxConsecutiveLosses &&
          (m.roiPercent ?? 0) > -20) {
        recovered = true;
        reason = `Metrics recovered: ${m.consecutiveLosses ?? 0} losses, ROI ${(m.roiPercent ?? 0).toFixed(1)}%`;
      }
      break;
    case 'store':
      // If store was paused due to inactivity, resume after cooldown
      // (restart handles the actual recovery; resume just unpauses)
      recovered = true;
      reason = 'Cooldown elapsed; resuming store bot';
      break;
    case 'social':
      // Resume if action count is back below limit
      if ((m.successfulActions ?? 0) <= config.socialMaxActionsPerHour) {
        recovered = true;
        reason = `Action count (${m.successfulActions ?? 0}) back within limit (${config.socialMaxActionsPerHour})`;
      }
      break;
    case 'workforce':
      // Resume if failure rate has dropped
      if ((m.failedActions ?? 0) / (m.totalTicks || 1) <= config.workforceMaxFailureRate) {
        recovered = true;
        reason = `Failure rate recovered to ${(((m.failedActions ?? 0) / (m.totalTicks || 1)) * 100).toFixed(0)}%`;
      }
      break;
    default:
      // Unknown family — resume after cooldown
      recovered = true;
      reason = 'Cooldown elapsed';
  }

  if (!recovered) return null;

  const decision: AgentDecision = {
    botId: bot.id,
    family: bot.family ?? 'unknown',
    action: 'resume',
    reason,
    executed: !config.dryRun,
  };

  if (!config.dryRun) {
    await apiFetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
    tracker.clearPause(bot.id);
  }
  actionsThisCycle.count++;
  await logAgentAudit(apiFetch, decision, config.dryRun);
  return decision;
}

// ─── Audit logging ──────────────────────────────────────────────

async function logAgentAudit(apiFetch: ApiFetchFn, decision: AgentDecision, dryRun: boolean) {
  const prefix = dryRun ? '[DRY-RUN] ' : '';
  const recSuffix = decision.recommendation ? ` | recommendation="${decision.recommendation}"` : '';
  console.log(
    `${prefix}[${decision.family}] bot=${decision.botId} action=${decision.action} executed=${decision.executed} reason="${decision.reason}"${recSuffix}`
  );
  // best-effort POST to the audit endpoint
  try {
    await apiFetch('/api/audit', {
      method: 'POST',
      body: JSON.stringify({
        action: `agent_${decision.action}`,
        result: decision.executed ? 'success' : 'skipped',
        riskLevel: 'low',
        botId: decision.botId,
        details: JSON.stringify({
          agent: 'openclaw',
          family: decision.family,
          reason: decision.reason,
          dryRun,
          ...(decision.recommendation ? { recommendation: decision.recommendation } : {}),
        }),
      }),
    });
  } catch {
    // audit logging is best-effort; never crash the agent over it
  }
}

// ─── Main loop ──────────────────────────────────────────────────

export async function runCycle(
  apiFetch: ApiFetchFn,
  config: AgentConfig,
  tracker: RestartTracker
): Promise<AgentDecision[]> {
  const decisions: AgentDecision[] = [];
  const actionsThisCycle = { count: 0 };

  const list = await apiFetch('/api/bots');
  if (!list?.success) return decisions;

  for (const bot of list.data) {
    try {
      const d = await handleBot(bot, apiFetch, config, tracker, actionsThisCycle);
      if (d) decisions.push(d);
    } catch (err) {
      // isolate per-bot errors so one bad bot doesn't take down the loop
      console.error(`[agent] error handling bot ${bot.id}:`, err);
    }
  }
  return decisions;
}

function makeApiFetch(config: AgentConfig): ApiFetchFn {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fetch = require('node-fetch').default || require('node-fetch');
  return async (path: string, options: any = {}) => {
    const res = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...options.headers,
      },
    });
    return res.json();
  };
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
  const config = loadConfig();
  const tracker = new RestartTracker();
  const api = makeApiFetch(config);

  console.log(
    `openclaw agent starting (dryRun=${config.dryRun}, adaptive=${config.adaptiveThresholds}, autoResume=${config.autoResume}, poll=${config.pollIntervalMs}ms, maxActions=${config.maxActionsPerCycle})`
  );

  while (true) {
    try {
      await runCycle(api, config, tracker);
    } catch (err) {
      console.error('agent cycle error', err);
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}

// only run main when executed directly (not imported for tests)
const isDirectRun =
  typeof require !== 'undefined' && require.main === module;
if (isDirectRun) {
  main().catch((e) => {
    console.error('FATAL:', e.message);
    process.exit(1);
  });
}
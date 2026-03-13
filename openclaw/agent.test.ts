import { describe, it, expect } from 'vitest';
import {
  handleBot,
  runCycle,
  RestartTracker,
  computeAdaptiveThresholds,
  generateRecommendation,
} from './agent';
import type { AgentConfig, ApiFetchFn, AgentDecision } from './agent';

// ─── Helpers ────────────────────────────────────────────────────

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    apiUrl: 'http://test',
    apiKey: 'test-key',
    dryRun: false,
    pollIntervalMs: 60_000,
    maxActionsPerCycle: 5,
    maxRestartsPerBotPerHour: 2,
    tradingMaxConsecutiveLosses: 3,
    storeInactivityTickThreshold: 100,
    socialMaxActionsPerHour: 10,
    workforceMaxFailureRate: 0.5,
    adaptiveThresholds: true,
    autoResume: true,
    resumeCooldownMs: 300_000,
    ...overrides,
  };
}

function makeMockApi() {
  const calls: Array<{ path: string; opts?: any }> = [];
  const resMap: Record<string, any> = {};
  const apiFetch: ApiFetchFn = async (path: string, opts?: any) => {
    calls.push({ path, opts });
    return resMap[path + (opts?.method || '')] ?? resMap[path] ?? { success: true };
  };
  return { apiFetch, calls, resMap };
}

// ─── RestartTracker ─────────────────────────────────────────────

describe('RestartTracker', () => {
  it('counts restarts within window', () => {
    const tracker = new RestartTracker();
    tracker.record('b1');
    tracker.record('b1');
    expect(tracker.countInWindow('b1')).toBe(2);
    expect(tracker.countInWindow('b2')).toBe(0);
  });

  it('tracks pause age and clear', () => {
    const tracker = new RestartTracker();
    tracker.recordPause('b1');
    expect(tracker.getPauseAge('b1')).toBeLessThan(100);
    tracker.clearPause('b1');
    expect(tracker.getPauseAge('b1')).toBe(Infinity);
  });
});

// ─── computeAdaptiveThresholds ──────────────────────────────────

describe('computeAdaptiveThresholds', () => {
  it('widens trading loss limit for high win rate + profitable bot', () => {
    const config = defaultConfig();
    const metrics = { winRate: 0.7, roiPercent: 15, totalTrades: 30 };
    const t = computeAdaptiveThresholds(config, metrics, 'trading');
    expect(t.tradingLossLimit).toBe(6); // 3 * 2
  });

  it('tightens trading loss limit for low win rate', () => {
    const config = defaultConfig();
    const metrics = { winRate: 0.25, roiPercent: -5, totalTrades: 20 };
    const t = computeAdaptiveThresholds(config, metrics, 'trading');
    expect(t.tradingLossLimit).toBe(2);
  });

  it('extends store inactivity threshold for proven bots', () => {
    const config = defaultConfig();
    const metrics = { successfulActions: 60 };
    const t = computeAdaptiveThresholds(config, metrics, 'store');
    expect(t.storeInactivityTicks).toBe(150); // 100 * 1.5
  });

  it('lowers social limit when denial rate is high', () => {
    const config = defaultConfig();
    const metrics = { deniedActions: 8, successfulActions: 10 };
    const t = computeAdaptiveThresholds(config, metrics, 'social');
    expect(t.socialActionLimit).toBe(7); // round(10 * 0.7)
  });

  it('returns base thresholds when adaptive is off', () => {
    const config = defaultConfig({ adaptiveThresholds: false });
    const metrics = { winRate: 0.9, roiPercent: 50, totalTrades: 100 };
    const t = computeAdaptiveThresholds(config, metrics, 'trading');
    expect(t.tradingLossLimit).toBe(3); // unchanged
  });

  it('returns base thresholds when metrics are null', () => {
    const config = defaultConfig();
    const t = computeAdaptiveThresholds(config, null, 'trading');
    expect(t.tradingLossLimit).toBe(3);
  });
});

// ─── generateRecommendation ─────────────────────────────────────

describe('generateRecommendation', () => {
  it('recommends strategy change for low win rate', () => {
    const r = generateRecommendation({ winRate: 0.3, totalTrades: 25, roiPercent: -5 }, 'trading');
    expect(r).toContain('Win rate');
    expect(r).toContain('switching strategy');
  });

  it('recommends paper mode for deep drawdown', () => {
    const r = generateRecommendation({ winRate: 0.45, totalTrades: 25, roiPercent: -20 }, 'trading');
    expect(r).toContain('paper trading');
  });

  it('suggests increasing position for strong bots', () => {
    const r = generateRecommendation({ winRate: 0.7, totalTrades: 60, roiPercent: 15 }, 'trading');
    expect(r).toContain('maxPositionSizeUsd');
  });

  it('flags store denial rate', () => {
    const r = generateRecommendation({ deniedActions: 20, successfulActions: 10 }, 'store');
    expect(r).toContain('denied');
  });

  it('returns undefined when no pattern detected', () => {
    const r = generateRecommendation({ winRate: 0.5, totalTrades: 5 }, 'trading');
    expect(r).toBeUndefined();
  });
});

// ─── handleBot ──────────────────────────────────────────────────

describe('handleBot', () => {
  it('restarts stopped bot', async () => {
    const { apiFetch, calls } = makeMockApi();
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b1', status: 'stopped', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d).not.toBeNull();
    expect(d!.action).toBe('restart');
    expect(d!.executed).toBe(true);
    expect(calls.some((c) => c.path === '/api/bots/b1/start')).toBe(true);
    expect(actions.count).toBe(1);
  });

  it('suppresses restart after too many restarts', async () => {
    const { apiFetch, calls } = makeMockApi();
    const config = defaultConfig({ maxRestartsPerBotPerHour: 2 });
    const tracker = new RestartTracker();
    tracker.record('b1');
    tracker.record('b1');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b1', status: 'stopped', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d).not.toBeNull();
    expect(d!.executed).toBe(false);
    expect(d!.reason).toContain('suppressed');
    expect(calls.some((c) => c.path === '/api/bots/b1/start')).toBe(false);
  });

  it('pauses trading bot on loss streak (adaptive)', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    // Low win rate → adaptive threshold tightens to 2
    resMap['/api/bots/b2/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 2, winRate: 0.25, totalTrades: 15, roiPercent: -5 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b2', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.reason).toContain('adaptive threshold 2');
    expect(calls.some((c) => c.path === '/api/bots/b2/pause')).toBe(true);
  });

  it('allows more losses for high win-rate bot', async () => {
    const { apiFetch, resMap } = makeMockApi();
    // High win rate → adaptive threshold widens to 6
    resMap['/api/bots/b2/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 4, winRate: 0.7, totalTrades: 50, roiPercent: 20 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b2', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);

    // 4 < 6, so should NOT pause
    expect(d).toBeNull();
  });

  it('pauses trading bot on severe drawdown', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b2/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 1, totalTrades: 10, roiPercent: -30, winRate: 0.4 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b2', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.reason).toContain('ROI');
    expect(d!.reason).toContain('-30');
  });

  it('pauses bot on high denial rate (cross-family)', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b9/metrics'] = {
      success: true,
      data: { metrics: { successfulActions: 3, deniedActions: 10, failedActions: 2 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b9', status: 'running', family: 'social' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.reason).toContain('denial rate');
  });

  it('includes recommendation in decision', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b2/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 4, winRate: 0.3, totalTrades: 25, roiPercent: -5 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b2', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.recommendation).toBeDefined();
    expect(d!.recommendation).toContain('Win rate');
  });

  it('does NOT pause trading bot below adaptive threshold', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b2/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 2, winRate: 0.5, totalTrades: 10 } },
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b2', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);
    expect(d).toBeNull();
  });

  it('restarts inactive store bot', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b3/metrics'] = { success: true, data: { metrics: { successfulActions: 0, totalTicks: 150 } } };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b3', status: 'running', family: 'store' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('restart');
    expect(d!.executed).toBe(true);
    expect(calls.some((c) => c.path === '/api/bots/b3/stop')).toBe(true);
    expect(calls.some((c) => c.path === '/api/bots/b3/start')).toBe(true);
  });

  it('suppresses store restart if loop limit reached', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b3/metrics'] = { success: true, data: { metrics: { successfulActions: 0, totalTicks: 150 } } };
    const config = defaultConfig({ maxRestartsPerBotPerHour: 1 });
    const tracker = new RestartTracker();
    tracker.record('b3');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b3', status: 'running', family: 'store' }, apiFetch, config, tracker, actions);

    expect(d!.executed).toBe(false);
    expect(d!.reason).toContain('suppressed');
  });

  it('pauses social bot after many actions', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b4/metrics'] = { success: true, data: { metrics: { successfulActions: 15, deniedActions: 0, failedActions: 0 } } };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b4', status: 'running', family: 'social' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.executed).toBe(true);
    expect(calls.some((c) => c.path === '/api/bots/b4/pause')).toBe(true);
  });

  it('pauses workforce bot on high failure rate', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b5/metrics'] = { success: true, data: { metrics: { failedActions: 6, totalTicks: 10, successfulActions: 4, deniedActions: 0 } } };
    const config = defaultConfig();
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b5', status: 'running', family: 'workforce' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.executed).toBe(true);
  });

  // ── dry run ──

  it('dry-run mode logs but does not execute', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b6/metrics'] = { success: true, data: { metrics: { consecutiveLosses: 5 } } };
    const config = defaultConfig({ dryRun: true });
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b6', status: 'running', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('pause');
    expect(d!.executed).toBe(false);
    expect(calls.some((c) => c.path === '/api/bots/b6/pause')).toBe(false);
    expect(calls.some((c) => c.path === '/api/audit')).toBe(true);
  });

  // ── action cap ──

  it('respects per-cycle action cap', async () => {
    const { apiFetch } = makeMockApi();
    const config = defaultConfig({ maxActionsPerCycle: 0 });
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b7', status: 'stopped', family: 'trading' }, apiFetch, config, tracker, actions);
    expect(d).toBeNull();
  });

  // ── paused bots with autoResume off ──

  it('skips paused bots when autoResume is off', async () => {
    const { apiFetch } = makeMockApi();
    const config = defaultConfig({ autoResume: false });
    const tracker = new RestartTracker();
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b8', status: 'paused', family: 'trading' }, apiFetch, config, tracker, actions);
    expect(d).toBeNull();
  });
});

// ─── Auto-resume ────────────────────────────────────────────────

describe('auto-resume', () => {
  it('resumes trading bot after cooldown when metrics recover', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b10/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 0, roiPercent: -5 } },
    };
    const config = defaultConfig({ resumeCooldownMs: 0 }); // no cooldown for test
    const tracker = new RestartTracker();
    tracker.recordPause('b10');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b10', status: 'paused', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('resume');
    expect(d!.executed).toBe(true);
    expect(calls.some((c) => c.path === '/api/bots/b10/start')).toBe(true);
  });

  it('does NOT resume trading bot still in drawdown', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b10/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 5, roiPercent: -25 } },
    };
    const config = defaultConfig({ resumeCooldownMs: 0 });
    const tracker = new RestartTracker();
    tracker.recordPause('b10');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b10', status: 'paused', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d).toBeNull();
  });

  it('does NOT resume during cooldown period', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b10/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 0 } },
    };
    const config = defaultConfig({ resumeCooldownMs: 999_999_999 }); // huge cooldown
    const tracker = new RestartTracker();
    tracker.recordPause('b10');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b10', status: 'paused', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d).toBeNull();
  });

  it('resumes social bot when actions drop below limit', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b11/metrics'] = {
      success: true,
      data: { metrics: { successfulActions: 5 } },
    };
    const config = defaultConfig({ resumeCooldownMs: 0 });
    const tracker = new RestartTracker();
    tracker.recordPause('b11');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b11', status: 'paused', family: 'social' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('resume');
    expect(d!.executed).toBe(true);
  });

  it('resumes workforce bot when failure rate drops', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots/b12/metrics'] = {
      success: true,
      data: { metrics: { failedActions: 2, totalTicks: 10 } },
    };
    const config = defaultConfig({ resumeCooldownMs: 0 });
    const tracker = new RestartTracker();
    tracker.recordPause('b12');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b12', status: 'paused', family: 'workforce' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('resume');
    expect(d!.executed).toBe(true);
  });

  it('dry-run does not actually resume', async () => {
    const { apiFetch, calls, resMap } = makeMockApi();
    resMap['/api/bots/b13/metrics'] = {
      success: true,
      data: { metrics: { consecutiveLosses: 0 } },
    };
    const config = defaultConfig({ dryRun: true, resumeCooldownMs: 0 });
    const tracker = new RestartTracker();
    tracker.recordPause('b13');
    const actions = { count: 0 };

    const d = await handleBot({ id: 'b13', status: 'paused', family: 'trading' }, apiFetch, config, tracker, actions);

    expect(d!.action).toBe('resume');
    expect(d!.executed).toBe(false);
    expect(calls.some((c) => c.path === '/api/bots/b13/start')).toBe(false);
  });
});

// ─── runCycle ───────────────────────────────────────────────────

describe('runCycle', () => {
  it('processes all bots and respects action cap', async () => {
    const { apiFetch, resMap } = makeMockApi();
    resMap['/api/bots'] = {
      success: true,
      data: [
        { id: 'a', status: 'stopped', family: 'trading' },
        { id: 'b', status: 'stopped', family: 'store' },
        { id: 'c', status: 'stopped', family: 'social' },
      ],
    };
    const config = defaultConfig({ maxActionsPerCycle: 2 });
    const tracker = new RestartTracker();

    const decisions = await runCycle(apiFetch, config, tracker);
    expect(decisions.filter((d) => d.executed).length).toBe(2);
  });

  it('isolates per-bot errors', async () => {
    const { apiFetch, resMap } = makeMockApi();
    const wrappedApi: ApiFetchFn = async (path, opts) => {
      if (path.includes('bad-bot')) throw new Error('boom');
      return apiFetch(path, opts);
    };
    resMap['/api/bots'] = {
      success: true,
      data: [
        { id: 'bad-bot', status: 'stopped', family: 'trading' },
        { id: 'good-bot', status: 'stopped', family: 'trading' },
      ],
    };
    const config = defaultConfig();
    const tracker = new RestartTracker();

    const decisions = await runCycle(wrappedApi, config, tracker);
    expect(decisions.some((d) => d.botId === 'good-bot')).toBe(true);
  });
});
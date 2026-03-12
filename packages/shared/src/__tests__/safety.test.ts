import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkPolicies,
  requestApproval,
  resolveApproval,
  consumeApprovalForAction,
  getPendingApprovals,
  checkBudget,
  recordSpend,
  checkCircuitBreaker,
  recordError,
  recordSuccess,
  resetCircuitBreaker,
  logAuditEntry,
  getAuditLog,
  runSafetyPipeline,
} from '../safety.js';
import type { SafetyContext, BudgetConfig, CircuitBreakerConfig } from '../index';
import { createDefaultBudget, createDefaultCircuitBreaker, createDefaultPolicies } from '../index';

function makeSafetyContext(overrides?: Partial<SafetyContext>): SafetyContext {
  return {
    tenantId: 'tenant-1',
    botId: 'bot-1',
    platform: 'coinbase',
    policies: createDefaultPolicies('trading'),
    budget: createDefaultBudget('trading'),
    circuitBreaker: createDefaultCircuitBreaker(),
    ...overrides,
  };
}

describe('Safety Model', () => {
  // ─── Layer 1: Policy Checks ──────────────────────────────

  describe('checkPolicies', () => {
    it('allows low-risk actions when no matching deny/approval policies', () => {
      const safety = makeSafetyContext({ policies: [] });
      const result = checkPolicies(safety, 'low');
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('denies when a deny policy matches', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'block-all', description: 'test', condition: 'true', action: 'deny', riskLevel: 'high' },
        ],
      });
      const result = checkPolicies(safety, 'high');
      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe('block-all');
    });

    it('requires approval when policy action is require_approval', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'need-approval', description: 'test', condition: 'true', action: 'require_approval', riskLevel: 'medium' },
        ],
      });
      const result = checkPolicies(safety, 'medium');
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it('evaluates policy conditions against runtime context', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'position-cap', description: 'test', condition: 'action.amountUsd > config.maxPositionSizeUsd', action: 'deny', riskLevel: 'high' },
        ],
      });
      const denied = checkPolicies(safety, 'high', {
        action: { amountUsd: 250 },
        config: { maxPositionSizeUsd: 100 },
      });
      const allowed = checkPolicies(safety, 'high', {
        action: { amountUsd: 50 },
        config: { maxPositionSizeUsd: 100 },
      });
      expect(denied.allowed).toBe(false);
      expect(allowed.allowed).toBe(true);
    });

    it('supports abs and includes condition operators', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'reprice-cap', description: 'test', condition: 'abs(priceChange) > config.maxPriceChangePercent', action: 'require_approval', riskLevel: 'medium' },
          { id: 'scope-guard', description: 'test', condition: '!config.dataAccessScopes.includes(scope)', action: 'deny', riskLevel: 'critical' },
        ],
      });
      const approval = checkPolicies(safety, 'medium', {
        priceChange: -12,
        config: { maxPriceChangePercent: 5, dataAccessScopes: ['tasks'] },
        scope: 'tasks',
      });
      const denial = checkPolicies(safety, 'critical', {
        priceChange: 0,
        config: { maxPriceChangePercent: 5, dataAccessScopes: ['tasks'] },
        scope: 'payroll',
      });
      expect(approval.requiresApproval).toBe(true);
      expect(denial.allowed).toBe(false);
    });
  });

  // ─── Layer 2: Approval Queue ─────────────────────────────

  describe('Approval Queue', () => {
    it('creates and retrieves approval requests', () => {
      const safety = makeSafetyContext({ tenantId: 'approval-test-tenant' });
      const req = requestApproval(safety, 'trade', 'high', 'policy-1');
      expect(req.status).toBe('pending');
      expect(req.tenantId).toBe('approval-test-tenant');

      const pending = getPendingApprovals('approval-test-tenant');
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.find((p) => p.id === req.id)).toBeDefined();
    });

    it('resolves approval requests', () => {
      const safety = makeSafetyContext();
      const req = requestApproval(safety, 'big-trade', 'critical', 'policy-2');
      const resolved = resolveApproval(req.id, true, 'admin@test.com');
      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolvedBy).toBe('admin@test.com');
    });

    it('consumes approved action grants exactly once', () => {
      const safety = makeSafetyContext();
      const req = requestApproval(safety, 'buy BTC-USD', 'high', 'policy-2');
      resolveApproval(req.id, true, 'admin@test.com');

      const consumed = consumeApprovalForAction(safety, 'buy BTC-USD');
      expect(consumed?.status).toBe('consumed');

      const missing = consumeApprovalForAction(safety, 'buy BTC-USD');
      expect(missing).toBeUndefined();
    });

    it('returns undefined for non-existent approval', () => {
      expect(resolveApproval('nonexistent-id', true, 'admin')).toBeUndefined();
    });
  });

  // ─── Layer 3: Budget Check ───────────────────────────────

  describe('checkBudget', () => {
    it('allows action within budget', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 1000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 0,
      };
      const result = checkBudget(budget, 100);
      expect(result.allowed).toBe(true);
      expect(result.remainingUsd).toBe(1000);
    });

    it('denies when daily spend would exceed limit', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 1000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 950,
      };
      const result = checkBudget(budget, 100);
      expect(result.allowed).toBe(false);
    });

    it('denies when per-action limit exceeded', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 10000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 0,
      };
      const result = checkBudget(budget, 600);
      expect(result.allowed).toBe(false);
    });

    it('triggers warning at threshold', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 1000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 750,
      };
      const result = checkBudget(budget, 100);
      expect(result.warningTriggered).toBe(true);
    });

    it('resets the hourly budget window after one hour', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 1000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 200,
        currentHourlySpentUsd: 260,
        currentHourlyWindowStartedAt: Date.now() - 3_700_000,
      };
      const result = checkBudget(budget, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordSpend', () => {
    it('increments current spent', () => {
      const budget: BudgetConfig = {
        maxDailySpendUsd: 1000,
        maxPerActionUsd: 500,
        warningThresholdPercent: 80,
        currentSpentUsd: 200,
      };
      const updated = recordSpend(budget, 150);
      expect(updated.currentSpentUsd).toBe(350);
    });
  });

  // ─── Layer 4: Circuit Breaker ────────────────────────────

  describe('Circuit Breaker', () => {
    it('allows when not tripped', () => {
      const cb = createDefaultCircuitBreaker();
      expect(checkCircuitBreaker(cb)).toBe(true);
    });

    it('trips after max consecutive errors', () => {
      let cb = createDefaultCircuitBreaker();
      for (let i = 0; i < cb.maxConsecutiveErrors; i++) {
        cb = recordError(cb);
      }
      expect(cb.isTripped).toBe(true);
      expect(checkCircuitBreaker(cb)).toBe(false);
    });

    it('resets error count on success', () => {
      let cb = createDefaultCircuitBreaker();
      cb = recordError(cb);
      cb = recordError(cb);
      cb = recordSuccess(cb);
      expect(cb.currentErrors).toBe(0);
    });

    it('resets a tripped breaker', () => {
      let cb: CircuitBreakerConfig = { ...createDefaultCircuitBreaker(), isTripped: true, currentErrors: 5 };
      cb = resetCircuitBreaker(cb);
      expect(cb.isTripped).toBe(false);
      expect(cb.currentErrors).toBe(0);
    });

    it('allows recovery after breaker cooldown elapses', () => {
      const cb: CircuitBreakerConfig = {
        ...createDefaultCircuitBreaker(),
        isTripped: true,
        trippedAt: Date.now() - 301_000,
      };
      expect(checkCircuitBreaker(cb)).toBe(true);
    });
  });

  // ─── Layer 5: Audit Trail ────────────────────────────────

  describe('Audit Trail', () => {
    it('logs and retrieves audit entries', () => {
      const entry = logAuditEntry({
        tenantId: 'audit-test-tenant',
        botId: 'bot-1',
        platform: 'coinbase',
        action: 'buy_btc',
        result: 'success',
        riskLevel: 'low',
        details: { amount: 100 },
      });
      expect(entry.id).toMatch(/^audit-/);
      expect(entry.timestamp).toBeGreaterThan(0);

      const log = getAuditLog('audit-test-tenant');
      expect(log.find((e) => e.id === entry.id)).toBeDefined();
    });
  });

  // ─── Full Pipeline ──────────────────────────────────────

  describe('runSafetyPipeline', () => {
    it('allows action when all checks pass', () => {
      const safety = makeSafetyContext({ policies: [] });
      const result = runSafetyPipeline(safety, 'buy', 50, 'low');
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('passed');
    });

    it('blocks when circuit breaker is tripped', () => {
      const safety = makeSafetyContext({
        policies: [],
        circuitBreaker: { ...createDefaultCircuitBreaker(), isTripped: true },
      });
      const result = runSafetyPipeline(safety, 'buy', 50, 'low');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Circuit breaker');
    });

    it('blocks when budget exceeded', () => {
      const safety = makeSafetyContext({
        policies: [],
        budget: { ...createDefaultBudget('trading'), currentSpentUsd: 999, maxDailySpendUsd: 1000 },
      });
      const result = runSafetyPipeline(safety, 'buy', 50, 'low');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Budget');
    });

    it('routes to approval when policy requires it', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'req-approval', description: 'test', condition: 'true', action: 'require_approval', riskLevel: 'medium' },
        ],
      });
      const result = runSafetyPipeline(safety, 'buy', 50, 'medium');
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRequest).toBeDefined();
    });

    it('executes once after a matching approval is resolved', () => {
      const safety = makeSafetyContext({
        policies: [
          { id: 'req-approval', description: 'test', condition: 'true', action: 'require_approval', riskLevel: 'medium' },
        ],
      });

      const first = runSafetyPipeline(safety, 'buy BTC-USD', 50, 'medium');
      expect(first.allowed).toBe(false);
      expect(first.approvalRequest?.id).toBeDefined();

      resolveApproval(first.approvalRequest!.id, true, 'admin@test.com');

      const second = runSafetyPipeline(safety, 'buy BTC-USD', 50, 'medium');
      expect(second.allowed).toBe(true);
      expect(second.requiresApproval).toBe(false);

      const third = runSafetyPipeline(safety, 'buy BTC-USD', 50, 'medium');
      expect(third.allowed).toBe(false);
      expect(third.requiresApproval).toBe(true);
    });
  });
});

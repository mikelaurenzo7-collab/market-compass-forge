import type {
  SafetyContext,
  AuditEntry,
  RiskLevel,
  Platform,
  BudgetConfig,
  CircuitBreakerConfig,
} from './index';

// ─── Layer 1: Policy Check ────────────────────────────────────

export interface PolicyCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  deniedBy?: string;
  riskLevel: RiskLevel;
}

export interface SafetyEvaluationContext {
  bot?: Record<string, unknown>;
  action?: Record<string, unknown>;
  config?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  budget?: BudgetConfig | Record<string, unknown>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

function resolvePath(scope: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, scope);
}

function parseLiteral(expression: string): unknown {
  const trimmed = expression.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) return numeric;
  return undefined;
}

function evaluateExpression(expression: string, scope: Record<string, unknown>): unknown {
  const trimmed = expression.trim();

  const literal = parseLiteral(trimmed);
  if (literal !== undefined) return literal;

  const absMatch = trimmed.match(/^abs\((.+)\)$/);
  if (absMatch) {
    const value = Number(evaluateExpression(absMatch[1], scope) ?? 0);
    return Math.abs(value);
  }

  const includesMatch = trimmed.match(/^(.+)\.includes\((.+)\)$/);
  if (includesMatch) {
    const collection = evaluateExpression(includesMatch[1], scope);
    const needle = evaluateExpression(includesMatch[2], scope);
    if (Array.isArray(collection)) return collection.includes(needle);
    if (typeof collection === 'string') return collection.includes(String(needle ?? ''));
    return false;
  }

  return resolvePath(scope, trimmed);
}

function compareValues(left: unknown, operator: string, right: unknown): boolean {
  switch (operator) {
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '>':
      return Number(left ?? 0) > Number(right ?? 0);
    case '<':
      return Number(left ?? 0) < Number(right ?? 0);
    case '>=':
      return Number(left ?? 0) >= Number(right ?? 0);
    case '<=':
      return Number(left ?? 0) <= Number(right ?? 0);
    default:
      return false;
  }
}

function evaluateCondition(condition: string, scope: Record<string, unknown>): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (trimmed.startsWith('!')) {
    return !evaluateCondition(trimmed.slice(1), scope);
  }

  const comparator = trimmed.match(/(.+?)(===|!==|>=|<=|>|<)(.+)/);
  if (comparator) {
    const [, leftExpr, operator, rightExpr] = comparator;
    return compareValues(
      evaluateExpression(leftExpr, scope),
      operator,
      evaluateExpression(rightExpr, scope),
    );
  }

  const value = evaluateExpression(trimmed, scope);
  return Boolean(value);
}

export function checkPolicies(
  safety: SafetyContext,
  actionRiskLevel: RiskLevel,
  evaluationContext?: SafetyEvaluationContext,
): PolicyCheckResult {
  const scope: Record<string, unknown> = {
    budget: safety.budget,
    ...evaluationContext,
  };

  for (const policy of safety.policies) {
    const conditionMatched = evaluateCondition(policy.condition, scope);
    if (!conditionMatched) continue;

    // Policy triggers when action risk meets or exceeds the policy's risk threshold
    if (isHigherRisk(actionRiskLevel, policy.riskLevel)) {
      if (policy.action === 'deny') {
        return { allowed: false, requiresApproval: false, deniedBy: policy.id, riskLevel: actionRiskLevel };
      }
      if (policy.action === 'require_approval') {
        return { allowed: false, requiresApproval: true, deniedBy: policy.id, riskLevel: actionRiskLevel };
      }
    }
  }
  return { allowed: true, requiresApproval: false, riskLevel: actionRiskLevel };
}

// ─── Layer 2: Approval Queue ──────────────────────────────────

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  botId: string;
  platform: Platform;
  action: string;
  riskLevel: RiskLevel;
  policyId: string;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  createdAt: number;
  expiresAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

// ─── Pluggable Safety Store ───────────────────────────────────

export interface SafetyStore {
  saveApproval(request: ApprovalRequest): void;
  getApproval(id: string): ApprovalRequest | undefined;
  listApprovals(tenantId: string, options?: { botId?: string; status?: ApprovalRequest['status']; limit?: number }): ApprovalRequest[];
  listPendingApprovals(tenantId: string): ApprovalRequest[];
  consumeApprovalForAction(tenantId: string, botId: string, action: string): ApprovalRequest | undefined;
  updateApproval(request: ApprovalRequest): void;
  appendAuditEntry(entry: AuditEntry): void;
  getAuditEntries(tenantId: string, limit: number): AuditEntry[];
}

class InMemorySafetyStore implements SafetyStore {
  private approvals = new Map<string, ApprovalRequest>();
  private auditEntries: AuditEntry[] = [];
  private static readonly MAX_AUDIT_ENTRIES = 100_000;

  private normalizeApproval(request: ApprovalRequest, now: number): ApprovalRequest {
    if (request.status === 'pending' && request.expiresAt && now > request.expiresAt) {
      request.status = 'rejected';
      request.resolvedAt = now;
      request.resolvedBy = 'system:expired';
      this.approvals.set(request.id, request);
    }
    return request;
  }

  saveApproval(request: ApprovalRequest): void { this.approvals.set(request.id, request); }
  getApproval(id: string): ApprovalRequest | undefined { return this.approvals.get(id); }
  listApprovals(
    tenantId: string,
    options?: { botId?: string; status?: ApprovalRequest['status']; limit?: number },
  ): ApprovalRequest[] {
    const now = Date.now();
    const normalized = Array.from(this.approvals.values())
      .map((request) => this.normalizeApproval(request, now))
      .filter((request) => request.tenantId === tenantId)
      .filter((request) => !options?.botId || request.botId === options.botId)
      .filter((request) => !options?.status || request.status === options.status)
      .sort((left, right) => {
        const leftTime = left.resolvedAt ?? left.createdAt;
        const rightTime = right.resolvedAt ?? right.createdAt;
        return rightTime - leftTime;
      });

    if (options?.limit && options.limit > 0) {
      return normalized.slice(0, options.limit);
    }

    return normalized;
  }
  listPendingApprovals(tenantId: string): ApprovalRequest[] {
    return this.listApprovals(tenantId, { status: 'pending' });
  }
  consumeApprovalForAction(tenantId: string, botId: string, action: string): ApprovalRequest | undefined {
    const now = Date.now();
    const approved = Array.from(this.approvals.values())
      .filter((request) => request.tenantId === tenantId && request.botId === botId && request.action === action && request.status === 'approved')
      .sort((left, right) => (left.resolvedAt ?? left.createdAt) - (right.resolvedAt ?? right.createdAt));
    const request = approved[0];
    if (!request) return undefined;
    request.status = 'consumed';
    request.resolvedAt = request.resolvedAt ?? now;
    request.resolvedBy = request.resolvedBy ?? 'system:consumed';
    this.approvals.set(request.id, request);
    return request;
  }
  updateApproval(request: ApprovalRequest): void { this.approvals.set(request.id, request); }
  appendAuditEntry(entry: AuditEntry): void {
    this.auditEntries.push(entry);
    // Circular buffer: evict oldest 10% when at capacity
    if (this.auditEntries.length > InMemorySafetyStore.MAX_AUDIT_ENTRIES) {
      this.auditEntries = this.auditEntries.slice(Math.floor(InMemorySafetyStore.MAX_AUDIT_ENTRIES * 0.1));
    }
  }
  getAuditEntries(tenantId: string, limit: number): AuditEntry[] {
    return this.auditEntries.filter(e => e.tenantId === tenantId).slice(-limit);
  }
}

let _store: SafetyStore = new InMemorySafetyStore();

export function setSafetyStore(store: SafetyStore): void {
  _store = store;
}

export function getSafetyStore(): SafetyStore {
  return _store;
}

export function requestApproval(
  safety: SafetyContext,
  action: string,
  riskLevel: RiskLevel,
  policyId: string
): ApprovalRequest {
  const request: ApprovalRequest = {
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: safety.tenantId,
    botId: safety.botId,
    platform: safety.platform,
    action,
    riskLevel,
    policyId,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h expiry
  };
  _store.saveApproval(request);
  return request;
}

export function resolveApproval(id: string, approved: boolean, resolvedBy: string): ApprovalRequest | undefined {
  const request = _store.getApproval(id);
  if (!request) return undefined;
  request.status = approved ? 'approved' : 'rejected';
  request.resolvedAt = Date.now();
  request.resolvedBy = resolvedBy;
  _store.updateApproval(request);
  return request;
}

export function getPendingApprovals(tenantId: string): ApprovalRequest[] {
  return _store.listPendingApprovals(tenantId);
}

export function getApprovals(
  tenantId: string,
  options?: { botId?: string; status?: ApprovalRequest['status']; limit?: number },
): ApprovalRequest[] {
  return _store.listApprovals(tenantId, options);
}

export function consumeApprovalForAction(
  safety: Pick<SafetyContext, 'tenantId' | 'botId'>,
  action: string,
): ApprovalRequest | undefined {
  return _store.consumeApprovalForAction(safety.tenantId, safety.botId, action);
}

// ─── Layer 3: Budget Check ────────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean;
  remainingUsd: number;
  warningTriggered: boolean;
}

function normalizeBudgetWindow(budget: BudgetConfig, now: number = Date.now()): BudgetConfig {
  const windowStartedAt = budget.currentHourlyWindowStartedAt ?? now;
  if (now - windowStartedAt < 3_600_000) {
    return {
      ...budget,
      currentHourlyWindowStartedAt: windowStartedAt,
      currentHourlySpentUsd: budget.currentHourlySpentUsd ?? 0,
    };
  }

  return {
    ...budget,
    currentHourlySpentUsd: 0,
    currentHourlyWindowStartedAt: now,
  };
}

export function checkBudget(budget: BudgetConfig, actionCostUsd: number): BudgetCheckResult {
  const normalizedBudget = normalizeBudgetWindow(budget);
  const remainingUsd = normalizedBudget.maxDailySpendUsd - normalizedBudget.currentSpentUsd;
  const wouldExceed = normalizedBudget.currentSpentUsd + actionCostUsd > normalizedBudget.maxDailySpendUsd;
  const exceedsPerAction = actionCostUsd > normalizedBudget.maxPerActionUsd;

  // Hourly velocity check: no more than 25% of daily budget in any rolling hour
  const hourlyLimit = normalizedBudget.maxDailySpendUsd * 0.25;
  const hourlySpent = normalizedBudget.currentHourlySpentUsd ?? 0;
  const exceedsHourly = hourlySpent + actionCostUsd > hourlyLimit;

  const warningThreshold = normalizedBudget.maxDailySpendUsd * (normalizedBudget.warningThresholdPercent / 100);
  const warningTriggered = normalizedBudget.currentSpentUsd + actionCostUsd >= warningThreshold;

  return {
    allowed: !wouldExceed && !exceedsPerAction && !exceedsHourly,
    remainingUsd: Math.max(0, remainingUsd),
    warningTriggered,
  };
}

export function recordSpend(budget: BudgetConfig, amountUsd: number): BudgetConfig {
  const normalizedBudget = normalizeBudgetWindow(budget);
  return {
    ...normalizedBudget,
    currentSpentUsd: normalizedBudget.currentSpentUsd + amountUsd,
    currentHourlySpentUsd: (normalizedBudget.currentHourlySpentUsd ?? 0) + amountUsd,
  };
}

function normalizeCircuitBreakerWindow(cb: CircuitBreakerConfig, now: number = Date.now()): CircuitBreakerConfig {
  const windowStartedAt = cb.currentWindowStartedAt ?? now;
  if (now - windowStartedAt < cb.windowSizeMs) {
    return {
      ...cb,
      currentWindowStartedAt: windowStartedAt,
      currentWindowRequests: cb.currentWindowRequests ?? 0,
      currentWindowErrors: cb.currentWindowErrors ?? 0,
    };
  }

  return {
    ...cb,
    currentErrors: 0,
    currentWindowStartedAt: now,
    currentWindowRequests: 0,
    currentWindowErrors: 0,
    isTripped: cb.trippedAt ? now - cb.trippedAt < cb.cooldownMs : false,
    trippedAt: cb.trippedAt && now - cb.trippedAt < cb.cooldownMs ? cb.trippedAt : undefined,
  };
}

// ─── Layer 4: Circuit Breaker ─────────────────────────────────

export function checkCircuitBreaker(cb: CircuitBreakerConfig): boolean {
  const normalized = normalizeCircuitBreakerWindow(cb);
  if (!normalized.isTripped) return true;
  if (!normalized.trippedAt) return false;
  return Date.now() - normalized.trippedAt >= normalized.cooldownMs;
}

export function recordError(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  const now = Date.now();
  const normalized = normalizeCircuitBreakerWindow(cb, now);
  const newErrors = normalized.currentErrors + 1;
  const currentWindowRequests = (normalized.currentWindowRequests ?? 0) + 1;
  const currentWindowErrors = (normalized.currentWindowErrors ?? 0) + 1;
  const errorRate = currentWindowRequests > 0 ? (currentWindowErrors / currentWindowRequests) * 100 : 0;
  const isTripped = newErrors >= normalized.maxConsecutiveErrors || errorRate >= normalized.maxErrorRatePercent;

  return {
    ...normalized,
    currentErrors: newErrors,
    currentWindowRequests,
    currentWindowErrors,
    isTripped,
    trippedAt: isTripped ? now : normalized.trippedAt,
  };
}

export function recordSuccess(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  const normalized = normalizeCircuitBreakerWindow(cb);
  return {
    ...normalized,
    currentErrors: 0,
    currentWindowRequests: (normalized.currentWindowRequests ?? 0) + 1,
  };
}

export function resetCircuitBreaker(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  return {
    ...cb,
    currentErrors: 0,
    currentWindowStartedAt: Date.now(),
    currentWindowRequests: 0,
    currentWindowErrors: 0,
    trippedAt: undefined,
    isTripped: false,
  };
}

// ─── Layer 5: Audit Trail ─────────────────────────────────────

export function logAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const fullEntry: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  _store.appendAuditEntry(fullEntry);
  return fullEntry;
}

export function getAuditLog(tenantId: string, limit: number = 100): AuditEntry[] {
  return _store.getAuditEntries(tenantId, limit);
}

// ─── Full Safety Pipeline ─────────────────────────────────────

export interface SafetyCheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  approvalRequest?: ApprovalRequest;
  budgetRemaining: number;
}

export function runSafetyPipeline(
  safety: SafetyContext,
  action: string,
  actionCostUsd: number,
  riskLevel: RiskLevel,
  evaluationContext?: SafetyEvaluationContext,
): SafetyCheckResult {
  // Layer 4: Circuit breaker (check first — if tripped, nothing runs)
  if (!checkCircuitBreaker(safety.circuitBreaker)) {
    logAuditEntry({
      tenantId: safety.tenantId,
      botId: safety.botId,
      platform: safety.platform,
      action,
      result: 'denied',
      riskLevel,
      details: { reason: 'circuit_breaker_tripped' },
    });
    return {
      allowed: false,
      reason: 'Circuit breaker is tripped — too many consecutive errors',
      requiresApproval: false,
      budgetRemaining: safety.budget.maxDailySpendUsd - safety.budget.currentSpentUsd,
    };
  }

  // Layer 3: Budget check
  const budgetResult = checkBudget(safety.budget, actionCostUsd);
  if (!budgetResult.allowed) {
    logAuditEntry({
      tenantId: safety.tenantId,
      botId: safety.botId,
      platform: safety.platform,
      action,
      result: 'denied',
      riskLevel,
      details: { reason: 'budget_exceeded', remaining: budgetResult.remainingUsd },
    });
    return {
      allowed: false,
      reason: `Budget exceeded — $${budgetResult.remainingUsd.toFixed(2)} remaining`,
      requiresApproval: false,
      budgetRemaining: budgetResult.remainingUsd,
    };
  }

  // Layer 1: Policy check
  const policyResult = checkPolicies(safety, riskLevel, {
    action: {
      amountUsd: actionCostUsd,
      raw: action,
      ...(evaluationContext?.action ?? {}),
    },
    budget: safety.budget,
    ...evaluationContext,
  });
  if (!policyResult.allowed) {
    if (policyResult.requiresApproval) {
      const consumedApproval = consumeApprovalForAction(safety, action);
      if (consumedApproval) {
        logAuditEntry({
          tenantId: safety.tenantId,
          botId: safety.botId,
          platform: safety.platform,
          action,
          result: 'success',
          riskLevel,
          details: { approvalId: consumedApproval.id, approvalConsumed: true, policyId: consumedApproval.policyId },
        });
        return {
          allowed: true,
          reason: `Approved action grant consumed: ${consumedApproval.id}`,
          requiresApproval: false,
          budgetRemaining: budgetResult.remainingUsd,
        };
      }

      // Layer 2: Create approval request
      const approval = requestApproval(safety, action, riskLevel, policyResult.deniedBy!);
      logAuditEntry({
        tenantId: safety.tenantId,
        botId: safety.botId,
        platform: safety.platform,
        action,
        result: 'pending_approval',
        riskLevel,
        details: { approvalId: approval.id, policyId: policyResult.deniedBy },
      });
      return {
        allowed: false,
        reason: `Requires approval — policy: ${policyResult.deniedBy}`,
        requiresApproval: true,
        approvalRequest: approval,
        budgetRemaining: budgetResult.remainingUsd,
      };
    }

    logAuditEntry({
      tenantId: safety.tenantId,
      botId: safety.botId,
      platform: safety.platform,
      action,
      result: 'denied',
      riskLevel,
      details: { reason: 'policy_denied', policyId: policyResult.deniedBy },
    });
    return {
      allowed: false,
      reason: `Denied by policy: ${policyResult.deniedBy}`,
      requiresApproval: false,
      budgetRemaining: budgetResult.remainingUsd,
    };
  }

  // All checks passed
  return {
    allowed: true,
    reason: 'All safety checks passed',
    requiresApproval: false,
    budgetRemaining: budgetResult.remainingUsd,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function isHigherRisk(a: RiskLevel, b: RiskLevel): boolean {
  return riskOrder[a] >= riskOrder[b];
}

// ─── Re-export types for convenience ──────────────────────────

export type { SafetyContext, AuditEntry, RiskLevel, Platform, BudgetConfig, CircuitBreakerConfig };

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

export function checkPolicies(
  safety: SafetyContext,
  actionRiskLevel: RiskLevel
): PolicyCheckResult {
  for (const policy of safety.policies) {
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

// ─── Pluggable Safety Store ───────────────────────────────────

export interface SafetyStore {
  saveApproval(request: ApprovalRequest): void;
  getApproval(id: string): ApprovalRequest | undefined;
  listPendingApprovals(tenantId: string): ApprovalRequest[];
  updateApproval(request: ApprovalRequest): void;
  appendAuditEntry(entry: AuditEntry): void;
  getAuditEntries(tenantId: string, limit: number): AuditEntry[];
}

class InMemorySafetyStore implements SafetyStore {
  private approvals = new Map<string, ApprovalRequest>();
  private auditEntries: AuditEntry[] = [];

  saveApproval(request: ApprovalRequest): void { this.approvals.set(request.id, request); }
  getApproval(id: string): ApprovalRequest | undefined { return this.approvals.get(id); }
  listPendingApprovals(tenantId: string): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(r => r.tenantId === tenantId && r.status === 'pending');
  }
  updateApproval(request: ApprovalRequest): void { this.approvals.set(request.id, request); }
  appendAuditEntry(entry: AuditEntry): void { this.auditEntries.push(entry); }
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

// ─── Layer 3: Budget Check ────────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean;
  remainingUsd: number;
  warningTriggered: boolean;
}

export function checkBudget(budget: BudgetConfig, actionCostUsd: number): BudgetCheckResult {
  const remainingUsd = budget.maxDailySpendUsd - budget.currentSpentUsd;
  const wouldExceed = budget.currentSpentUsd + actionCostUsd > budget.maxDailySpendUsd;
  const exceedsPerAction = actionCostUsd > budget.maxPerActionUsd;
  const warningThreshold = budget.maxDailySpendUsd * (budget.warningThresholdPercent / 100);
  const warningTriggered = budget.currentSpentUsd + actionCostUsd >= warningThreshold;

  return {
    allowed: !wouldExceed && !exceedsPerAction,
    remainingUsd: Math.max(0, remainingUsd),
    warningTriggered,
  };
}

export function recordSpend(budget: BudgetConfig, amountUsd: number): BudgetConfig {
  return { ...budget, currentSpentUsd: budget.currentSpentUsd + amountUsd };
}

// ─── Layer 4: Circuit Breaker ─────────────────────────────────

export function checkCircuitBreaker(cb: CircuitBreakerConfig): boolean {
  return !cb.isTripped;
}

export function recordError(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  const newErrors = cb.currentErrors + 1;
  const isTripped = newErrors >= cb.maxConsecutiveErrors;
  return { ...cb, currentErrors: newErrors, isTripped };
}

export function recordSuccess(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  return { ...cb, currentErrors: 0 };
}

export function resetCircuitBreaker(cb: CircuitBreakerConfig): CircuitBreakerConfig {
  return { ...cb, currentErrors: 0, isTripped: false };
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
  riskLevel: RiskLevel
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
  const policyResult = checkPolicies(safety, riskLevel);
  if (!policyResult.allowed) {
    if (policyResult.requiresApproval) {
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

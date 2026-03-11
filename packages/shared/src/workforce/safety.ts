/**
 * Workforce Safety Layer
 *
 * Provides rogue-behaviour detection, privacy boundary enforcement,
 * human checkpoint orchestration, and compliance reporting specifically
 * tailored to workforce automation.
 *
 * All functions are pure (no I/O). Callers are responsible for persisting
 * audit trails and emitting alerts to their chosen observability platform.
 */

import type {
  WorkforceCategory,
  WorkforceStrategy,
  WorkforceBotConfig,
  WorkforceTask,
  WorkforceTaskResult,
  TaskPriority,
  RiskLevel,
} from '../index';

// ─── Safety Config ─────────────────────────────────────────────────────────────

/**
 * Workforce-specific safety configuration, layered on top of the shared
 * SafetyContext / PolicyRule model in safety.ts.
 */
export interface WorkforceSafetyConfig {
  /** Tenant identifier (used for audit trail namespacing). */
  tenantId: string;
  /**
   * Hard maximum number of external API calls any single bot tick may make.
   * Trips the rogue detector if exceeded.
   */
  maxExternalCallsPerTick: number;
  /**
   * Maximum fraction (0–1) of tasks per hour that may be executed fully
   * autonomously without any human review across all categories.
   * e.g. 0.9 means at most 90 % of tasks can bypass human review.
   */
  maxAutonomousFractionPerHour: number;
  /**
   * Minimum confidence required before a task can be executed without
   * routing through a human checkpoint. Tasks below this threshold are
   * paused and surfaced to the human review queue.
   */
  minConfidenceForAutonomousExecution: number;
  /** Categories that require human sign-off for EVERY task, regardless of confidence. */
  mandatoryHumanReviewCategories: WorkforceCategory[];
  /** Strategies that require human sign-off regardless of confidence. */
  mandatoryHumanReviewStrategies: WorkforceStrategy[];
  /**
   * Maximum number of the same action type that may be performed successively
   * before the circuit breaker demands a human checkpoint.
   * Prevents runaway automation loops.
   */
  maxRepetitiveActionCount: number;
  /** Whether to hard-block any task that touches data flagged as PII/PHI. */
  blockOnPrivacyViolation: boolean;
  /** Privacy posture inherited from WorkforceTeamConfig. */
  privacyMode: 'standard' | 'strict' | 'hipaa_compliant' | 'sox_compliant';
  /** External domains the bot is permitted to contact (allowlist, empty = deny all external). */
  allowedExternalDomains: string[];
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export type WorkforceAuditEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_escalated'
  | 'task_blocked_safety'
  | 'privacy_violation_detected'
  | 'rogue_behaviour_detected'
  | 'human_checkpoint_requested'
  | 'human_checkpoint_approved'
  | 'human_checkpoint_rejected'
  | 'circuit_breaker_tripped'
  | 'external_call_made'
  | 'data_access_requested'
  | 'compliance_report_generated';

export interface WorkforceAuditEntry {
  /** Monotonically ordered identifier for this entry. */
  id: string;
  tenantId: string;
  botCategory: WorkforceCategory;
  botStrategy: WorkforceStrategy;
  taskId: string;
  eventType: WorkforceAuditEventType;
  riskLevel: RiskLevel;
  /** Sanitised details — must NOT contain raw PII/PHI. */
  details: Record<string, unknown>;
  timestamp: number;
  /** Whether a human has reviewed this entry (for SOX compliance). */
  humanReviewed: boolean;
}

/**
 * Creates a new audit entry. The caller is responsible for assigning a unique
 * incremental `id` and persisting the entry to their audit store.
 */
export function createAuditEntry(
  params: Omit<WorkforceAuditEntry, 'id' | 'timestamp' | 'humanReviewed'> & { idSeq: number },
): WorkforceAuditEntry {
  return {
    id: `wf-audit-${params.tenantId}-${params.idSeq}`,
    tenantId: params.tenantId,
    botCategory: params.botCategory,
    botStrategy: params.botStrategy,
    taskId: params.taskId,
    eventType: params.eventType,
    riskLevel: params.riskLevel,
    details: sanitiseAuditDetails(params.details, params.tenantId),
    timestamp: Date.now(),
    humanReviewed: false,
  };
}

// ─── Privacy Enforcement ──────────────────────────────────────────────────────

/** Keywords that indicate the presence of PII or PHI in task data. */
const PII_MARKERS = [
  'ssn', 'social_security', 'passport', 'date_of_birth', 'dob',
  'credit_card', 'card_number', 'cvv', 'bank_account', 'routing_number',
  'medical_record', 'patient_id', 'diagnosis', 'prescription',
  'biometric', 'facial_recognition', 'fingerprint',
];

const PHI_MARKERS = [
  'patient', 'diagnosis', 'medication', 'treatment', 'health_condition',
  'medical_history', 'lab_result', 'insurance_id', 'npi', 'icd_code',
];

export interface PrivacyCheckResult {
  passed: boolean;
  /** Detected violation types. Empty when passed. */
  violations: Array<{
    field: string;
    violationType: 'pii' | 'phi' | 'restricted_domain' | 'scope_exceeds_allowlist';
    severity: RiskLevel;
    description: string;
  }>;
}

/**
 * Checks task input data against privacy rules defined in the safety config.
 *
 * - In `strict` mode: any PII/PHI marker triggers a hard block.
 * - In `hipaa_compliant` mode: PHI markers trigger a hard block.
 * - In `standard`/`sox_compliant` modes: violations are flagged but not blocked
 *   unless `blockOnPrivacyViolation` is set.
 *
 * @param config  Workforce safety configuration.
 * @param task    The task to evaluate.
 * @returns PrivacyCheckResult with pass/fail and violation details.
 */
export function enforcePrivacyBoundaries(
  config: WorkforceSafetyConfig,
  task: WorkforceTask,
): PrivacyCheckResult {
  const violations: PrivacyCheckResult['violations'] = [];
  const inputJson = JSON.stringify(task.inputData ?? {}).toLowerCase();

  const isPiiStrict = config.privacyMode === 'strict';
  const isHipaa = config.privacyMode === 'hipaa_compliant';

  // PII scan
  for (const marker of PII_MARKERS) {
    if (inputJson.includes(marker)) {
      violations.push({
        field: marker,
        violationType: 'pii',
        severity: isPiiStrict ? 'critical' : 'high',
        description: `Task input contains a field matching PII marker "${marker}". Privacy mode: ${config.privacyMode}.`,
      });
    }
  }

  // PHI scan (healthcare-specific)
  if (isHipaa || config.privacyMode === 'strict') {
    for (const marker of PHI_MARKERS) {
      if (inputJson.includes(marker)) {
        violations.push({
          field: marker,
          violationType: 'phi',
          severity: 'critical',
          description: `Task input contains a field matching PHI marker "${marker}". HIPAA compliance requires blocking this task and routing through a BAA-covered system.`,
        });
      }
    }
  }

  // Data scope check
  if (config.allowedExternalDomains.length > 0 && task.category === 'it_ops') {
    const inputStr = JSON.stringify(task.inputData ?? {});
    const domainMatches = inputStr.match(/https?:\/\/([^/\s"']+)/g) ?? [];
    for (const urlMatch of domainMatches) {
      const domain = urlMatch.replace(/^https?:\/\//, '').split('/')[0];
      if (!config.allowedExternalDomains.some(allowed => domain.endsWith(allowed))) {
        violations.push({
          field: 'inputData.url',
          violationType: 'restricted_domain',
          severity: 'high',
          description: `Task references domain "${domain}" which is not in the allowed external domains list. Add it explicitly to allowedExternalDomains to permit.`,
        });
      }
    }
  }

  const hardBlock = violations.some(
    v => v.severity === 'critical' || (config.blockOnPrivacyViolation && violations.length > 0),
  );

  return { passed: !hardBlock, violations };
}

// ─── Rogue Behaviour Detection ────────────────────────────────────────────────

export interface RogueBehaviourCheck {
  isRogue: boolean;
  triggers: Array<{
    triggerType:
      | 'repetitive_action_loop'
      | 'excessive_external_calls'
      | 'config_mutation_attempt'
      | 'out_of_scope_data_access'
      | 'runaway_task_creation'
      | 'budget_circumvention_attempt'
      | 'autonomous_fraction_exceeded';
    severity: RiskLevel;
    description: string;
  }>;
}

/** Running counters used by the rogue detector within a single DO tick evaluation. */
export interface RogueDetectorState {
  /** Number of tasks produced by the last tick (to detect runaway task creation). */
  newTasksCreatedThisTick: number;
  /** Number of external calls made this tick. */
  externalCallsThisTick: number;
  /** Most recent action string produced by the bot. */
  lastAction: string;
  /** How many consecutive ticks produced the identical action. */
  consecutiveRepetitiveActions: number;
  /** Number of tasks processed autonomously (no human review) this hour. */
  autonomousTasksThisHour: number;
  /** Total tasks processed this hour. */
  totalTasksThisHour: number;
}

/**
 * Evaluates a recently completed task result against rogue-behaviour heuristics.
 *
 * Triggers:
 * - `repetitive_action_loop`       — same action repeated N times in a row
 * - `excessive_external_calls`     — external calls this tick > configured max
 * - `out_of_scope_data_access`     — task accessed data scopes not in bot config
 * - `runaway_task_creation`        — task spawned unexpectedly large next-task set
 * - `autonomous_fraction_exceeded` — too many tasks bypassed human review this hour
 *
 * @param config    Workforce safety configuration.
 * @param botConfig The bot's operative configuration (supplies dataAccessScopes).
 * @param result    The completed task result to evaluate.
 * @param detectorState  Rolling state (updated by the caller after each call).
 * @returns RogueBehaviourCheck with triggers and severity.
 */
export function detectRogueBehaviour(
  config: WorkforceSafetyConfig,
  botConfig: WorkforceBotConfig,
  result: WorkforceTaskResult,
  detectorState: RogueDetectorState,
): RogueBehaviourCheck {
  const triggers: RogueBehaviourCheck['triggers'] = [];

  // 1. Repetitive action loop
  const action = result.action ?? '';
  if (
    action.length > 0 &&
    action === detectorState.lastAction &&
    detectorState.consecutiveRepetitiveActions >= config.maxRepetitiveActionCount
  ) {
    triggers.push({
      triggerType: 'repetitive_action_loop',
      severity: 'high',
      description: `Bot has repeated the same action "${action}" ${detectorState.consecutiveRepetitiveActions + 1} consecutive times. This may indicate an automation loop. The circuit breaker should pause this bot.`,
    });
  }

  // 2. Excessive external calls
  if (detectorState.externalCallsThisTick > config.maxExternalCallsPerTick) {
    triggers.push({
      triggerType: 'excessive_external_calls',
      severity: 'critical',
      description: `Bot made ${detectorState.externalCallsThisTick} external calls this tick, exceeding the configured max of ${config.maxExternalCallsPerTick}. Possible exfiltration or runaway loop — immediate pausing required.`,
    });
  }

  // 3. Out-of-scope data access (check outputData for scope markers)
  const accessedScopes: string[] = (result.outputData?.['accessedScopes'] as string[] | undefined) ?? [];
  const unauthorisedScopes = accessedScopes.filter(
    scope => !botConfig.dataAccessScopes.includes(scope),
  );
  if (unauthorisedScopes.length > 0) {
    triggers.push({
      triggerType: 'out_of_scope_data_access',
      severity: 'critical',
      description: `Bot accessed data scopes not in its configuration: ${unauthorisedScopes.join(', ')}. This is a critical safety violation — task output must be discarded and the incident reviewed.`,
    });
  }

  // 4. Runaway task creation (nextTasks should be bounded)
  const nextTaskCount = result.nextTasks?.length ?? 0;
  if (nextTaskCount > 20) {
    triggers.push({
      triggerType: 'runaway_task_creation',
      severity: 'high',
      description: `Bot created ${nextTaskCount} follow-up tasks from a single result. Normal workflows should create ≤5. This pattern can cascade into exponential task volume — cap and review.`,
    });
  }

  // 5. Autonomous fraction
  if (detectorState.totalTasksThisHour > 0) {
    const autonomousFraction = detectorState.autonomousTasksThisHour / detectorState.totalTasksThisHour;
    if (autonomousFraction > config.maxAutonomousFractionPerHour) {
      triggers.push({
        triggerType: 'autonomous_fraction_exceeded',
        severity: 'medium',
        description: `${Math.round(autonomousFraction * 100)}% of tasks this hour bypassed human review, exceeding the configured maximum of ${Math.round(config.maxAutonomousFractionPerHour * 100)}%. Increase the escalation threshold or review human review routing configuration.`,
      });
    }
  }

  return {
    isRogue: triggers.some(t => t.severity === 'critical' || t.severity === 'high'),
    triggers,
  };
}

// ─── Human Checkpoints ────────────────────────────────────────────────────────

export interface WorkforceCheckpoint {
  id: string;
  tenantId: string;
  taskId: string;
  category: WorkforceCategory;
  strategy: WorkforceStrategy;
  priority: TaskPriority;
  /** Why this checkpoint was created (triggered by which safety rule). */
  triggerReason: string;
  /** The task input (sanitised) for the human reviewer to inspect. */
  taskSummary: string;
  /** Proposed action the bot would have taken — human approves or rejects. */
  proposedAction: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  /** When the checkpoint expires if no human responds. */
  expiresAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Determines whether a task must be routed through a human checkpoint
 * before execution, based on the safety configuration.
 *
 * A checkpoint is required when:
 * - The task's category is in `mandatoryHumanReviewCategories`.
 * - The task's strategy is in `mandatoryHumanReviewStrategies`.
 * - The task result's `requiresHumanReview` flag is set.
 * - The result's confidence is below `minConfidenceForAutonomousExecution`.
 * - A rogue behaviour check returned `isRogue = true`.
 *
 * @returns The trigger reason string if a checkpoint is needed, null otherwise.
 */
export function requiresHumanCheckpoint(
  config: WorkforceSafetyConfig,
  task: WorkforceTask,
  result: WorkforceTaskResult,
  rogueCheck: RogueBehaviourCheck,
): string | null {
  if (config.mandatoryHumanReviewCategories.includes(task.category)) {
    return `Category "${task.category}" is configured for mandatory human review on every task.`;
  }
  if (task.strategy && config.mandatoryHumanReviewStrategies.includes(task.strategy)) {
    return `Strategy "${task.strategy}" is configured for mandatory human review.`;
  }
  if (result.requiresHumanReview === true) {
    return `Task execution set requiresHumanReview=true. Escalation reason: ${result.escalationReason ?? 'unspecified'}.`;
  }
  const confidence = result.confidence ?? 1;
  if (confidence < config.minConfidenceForAutonomousExecution) {
    return `Result confidence (${(confidence * 100).toFixed(1)}%) is below the minimum threshold (${(config.minConfidenceForAutonomousExecution * 100).toFixed(0)}%) for autonomous execution.`;
  }
  if (rogueCheck.isRogue) {
    return `Rogue behaviour detected: ${rogueCheck.triggers.map(t => t.triggerType).join(', ')}. Task output held for human review.`;
  }
  return null;
}

/**
 * Creates a human checkpoint record for the review queue.
 *
 * @param tenantId          The tenant identifier.
 * @param task              The task to hold for review.
 * @param result            The proposed task result.
 * @param triggerReason     The string from `requiresHumanCheckpoint`.
 * @param expiryMs          How long until the checkpoint expires (default: 4 hours).
 * @param idSeq             Monotonic sequence for ID generation.
 */
export function createHumanCheckpoint(
  tenantId: string,
  task: WorkforceTask,
  result: WorkforceTaskResult,
  triggerReason: string,
  idSeq: number,
  expiryMs = 4 * 3_600_000,
): WorkforceCheckpoint {
  const now = Date.now();
  return {
    id: `wf-checkpoint-${tenantId}-${idSeq}`,
    tenantId,
    taskId: task.id,
    category: task.category,
    strategy: task.strategy,
    priority: task.priority,
    triggerReason,
    taskSummary: buildTaskSummary(task),
    proposedAction: result.action ?? 'No action proposed.',
    status: 'pending',
    createdAt: now,
    expiresAt: now + expiryMs,
  };
}

// ─── Compliance Reporting ─────────────────────────────────────────────────────

export interface ComplianceReport {
  tenantId: string;
  generatedAt: number;
  periodDays: number;
  privacyMode: WorkforceSafetyConfig['privacyMode'];
  /** Total tasks evaluated by the safety layer in this period. */
  totalTasksEvaluated: number;
  /** Tasks blocked by the safety layer. */
  tasksBlocked: number;
  /** Tasks routed to human checkpoints. */
  tasksEscalatedToHuman: number;
  /** Privacy violations detected. */
  privacyViolationsDetected: number;
  /** Rogue behaviour triggers fired. */
  rogueBehaviourTriggers: number;
  /** Human checkpoint resolution summary. */
  checkpointResolution: {
    approved: number;
    rejected: number;
    expired: number;
    pending: number;
  };
  /** Outstanding risk items requiring attention. */
  openRiskItems: string[];
  /** Plain-English compliance posture statement. */
  complianceStatement: string;
}

/**
 * Generates a compliance report from a set of audit entries and checkpoints
 * for the specified period.
 *
 * @param config        Safety configuration.
 * @param auditEntries  Audit entries from the specified period.
 * @param checkpoints   Checkpoints from the specified period.
 * @param periodDays    Number of days covered by this report.
 */
export function generateComplianceReport(
  config: WorkforceSafetyConfig,
  auditEntries: WorkforceAuditEntry[],
  checkpoints: WorkforceCheckpoint[],
  periodDays: number,
): ComplianceReport {
  const now = Date.now();
  const tasksBlocked = auditEntries.filter(e => e.eventType === 'task_blocked_safety').length;
  const privacyViolations = auditEntries.filter(e => e.eventType === 'privacy_violation_detected').length;
  const rogueTriggered = auditEntries.filter(e => e.eventType === 'rogue_behaviour_detected').length;
  const escalated = auditEntries.filter(e => e.eventType === 'human_checkpoint_requested').length;

  const resolution = {
    approved: checkpoints.filter(c => c.status === 'approved').length,
    rejected: checkpoints.filter(c => c.status === 'rejected').length,
    expired: checkpoints.filter(c => c.status === 'expired').length,
    pending: checkpoints.filter(c => c.status === 'pending').length,
  };

  const openRiskItems: string[] = [];
  if (resolution.pending > 0) {
    openRiskItems.push(`${resolution.pending} checkpoint(s) still awaiting human review — they will expire if not actioned.`);
  }
  if (resolution.expired > 0) {
    openRiskItems.push(`${resolution.expired} checkpoint(s) expired without human review — review and re-route those tasks.`);
  }
  if (rogueTriggered > 0) {
    openRiskItems.push(`${rogueTriggered} rogue behaviour trigger(s) fired — root-cause investigation recommended.`);
  }
  if (privacyViolations > 0) {
    openRiskItems.push(`${privacyViolations} privacy violation(s) detected — verify all were blocked and no data was exfiltrated.`);
  }

  const complianceStatement = buildComplianceStatement(config, {
    tasksBlocked,
    privacyViolations,
    rogueTriggered,
    openRiskItems,
    periodDays,
  });

  return {
    tenantId: config.tenantId,
    generatedAt: now,
    periodDays,
    privacyMode: config.privacyMode,
    totalTasksEvaluated: auditEntries.length,
    tasksBlocked,
    tasksEscalatedToHuman: escalated,
    privacyViolationsDetected: privacyViolations,
    rogueBehaviourTriggers: rogueTriggered,
    checkpointResolution: resolution,
    openRiskItems,
    complianceStatement,
  };
}

/**
 * Returns a default WorkforceSafetyConfig appropriate for the given privacy mode.
 */
export function createDefaultWorkforceSafetyConfig(
  tenantId: string,
  privacyMode: WorkforceSafetyConfig['privacyMode'] = 'standard',
): WorkforceSafetyConfig {
  const baseMandatoryReviewCategories: WorkforceCategory[] = privacyMode === 'hipaa_compliant'
    ? ['hr', 'compliance', 'document_processing']
    : privacyMode === 'sox_compliant'
    ? ['finance', 'compliance', 'reporting']
    : [];

  return {
    tenantId,
    maxExternalCallsPerTick: 10,
    maxAutonomousFractionPerHour: 0.9,
    minConfidenceForAutonomousExecution: 0.65,
    mandatoryHumanReviewCategories: baseMandatoryReviewCategories,
    mandatoryHumanReviewStrategies: ['contract_review', 'audit_preparation'],
    maxRepetitiveActionCount: 5,
    blockOnPrivacyViolation: privacyMode === 'strict' || privacyMode === 'hipaa_compliant',
    privacyMode,
    allowedExternalDomains: [],
  };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/** Strips any keys whose names match PII/PHI markers before storing in the audit log. */
function sanitiseAuditDetails(
  details: Record<string, unknown>,
  _tenantId: string,
): Record<string, unknown> {
  const allMarkers = [...PII_MARKERS, ...PHI_MARKERS];
  const sanitised: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const keyLower = key.toLowerCase();
    if (allMarkers.some(marker => keyLower.includes(marker))) {
      sanitised[key] = '[REDACTED]';
    } else {
      sanitised[key] = value;
    }
  }
  return sanitised;
}

/** Generates a short human-readable summary of a task for checkpoint review. */
function buildTaskSummary(task: WorkforceTask): string {
  const parts: string[] = [
    `Category: ${task.category}`,
    `Strategy: ${task.strategy}`,
    `Priority: ${task.priority}`,
    `Title: ${task.title}`,
  ];
  if (task.description) parts.push(`Description: ${task.description.slice(0, 200)}`);
  if (task.deadlineAt) parts.push(`Deadline: ${new Date(task.deadlineAt).toISOString()}`);
  return parts.join(' | ');
}

function buildComplianceStatement(
  config: WorkforceSafetyConfig,
  stats: {
    tasksBlocked: number;
    privacyViolations: number;
    rogueTriggered: number;
    openRiskItems: string[];
    periodDays: number;
  },
): string {
  const modeLabel: Record<WorkforceSafetyConfig['privacyMode'], string> = {
    standard: 'Standard (GDPR-compatible)',
    strict: 'Strict (no PII in learning state)',
    hipaa_compliant: 'HIPAA Compliant',
    sox_compliant: 'SOX Compliant',
  };

  const posture = stats.openRiskItems.length === 0
    ? 'COMPLIANT — no open risk items'
    : stats.openRiskItems.length <= 2
    ? 'ATTENTION REQUIRED — minor open items'
    : 'ESCALATION REQUIRED — multiple open risk items';

  return (
    `Tenant ${config.tenantId} — Privacy Mode: ${modeLabel[config.privacyMode]}. ` +
    `Period: ${stats.periodDays} day(s). ` +
    `Safety Summary: ${stats.tasksBlocked} task(s) blocked, ` +
    `${stats.privacyViolations} privacy violation(s), ` +
    `${stats.rogueTriggered} rogue behaviour trigger(s). ` +
    `Compliance posture: ${posture}.`
  );
}

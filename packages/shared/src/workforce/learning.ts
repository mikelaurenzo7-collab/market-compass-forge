// ─── FILE: packages/shared/src/workforce/learning.ts ───

import type {
  WorkforceCategory,
  WorkforceStrategy,
  WorkforceBotConfig,
  WorkforceTask,
  WorkforceTaskResult,
  RiskLevel,
} from '../index.js';

// ─── Interfaces ───────────────────────────────────────────────

/**
 * A single learned pattern entry tracking how often a particular
 * category+strategy combination is executed at a given hour and day of week,
 * and how successful those executions are.
 */
export interface TaskPatternEntry {
  category: WorkforceCategory;
  strategy: WorkforceStrategy;
  /** Hour of day (0–23) in UTC when the pattern was observed. */
  hour: number;
  /** Day of week (0 = Sunday … 6 = Saturday). */
  dayOfWeek: number;
  /** Total number of executions matching this pattern. */
  count: number;
  /** Number of those executions that ended in success. */
  successCount: number;
  /** Running sum of confidence scores (divide by count to get average). */
  avgConfidenceSum: number;
  /** Unix ms timestamp of the most recent observation. */
  lastSeen: number;
}

/**
 * A deduplication record mapping variations of an entity's identity
 * (names, email addresses, domains) to a single canonical identifier.
 * Used across categories to avoid re-learning the same entity.
 */
export interface EntityMapping {
  /** Stable identifier assigned by the learning layer. */
  canonicalId: string;
  /** All observed display names for this entity. */
  names: string[];
  /** All observed email addresses associated with this entity. */
  emails: string[];
  /** All observed internet domains associated with this entity. */
  domains: string[];
  /** Which workforce category first created this mapping. */
  category: WorkforceCategory;
  /** Unix ms timestamp of the most recent sighting. */
  lastSeen: number;
}

/**
 * Per-tenant learning state accumulated across task executions.
 * Designed to be serialisable and storable in a Durable Object or KV.
 *
 * Privacy note: this structure intentionally contains NO raw PII.
 * Entity names/emails are stored only when privacyMode !== 'strict';
 * callers are responsible for honouring the tenant's privacy setting
 * before passing task data to `updateLearningState`.
 */
export interface UserLearningState {
  tenantId: string;
  /** Optional industry hint to bias recommendations toward domain norms. */
  industryHint?: string;
  /** Time-of-day / day-of-week task execution patterns per category+strategy. */
  taskPatterns: TaskPatternEntry[];
  /** Canonical entity mappings built from task input/output data. */
  entityMappings: EntityMapping[];
  /**
   * Reliability scores for external vendors encountered in procurement
   * and finance tasks. Key is a vendor identifier; value is 0–1.
   */
  vendorReliabilityScores: Record<string, number>;
  /**
   * Partial WorkforceBotConfig snapshots that historically produced
   * the best outcomes. Key is WorkforceCategory; value is a partial config.
   */
  successfulStrategyConfigs: Record<string, Partial<WorkforceBotConfig>>;
  /**
   * Rolling baselines used for anomaly detection.
   * Key is WorkforceCategory.
   */
  anomalyBaselines: Record<
    string,
    {
      avgTasksPerHour: number;
      stdDevTasksPerHour: number;
      avgConfidence: number;
    }
  >;
  /** Total tasks ever processed for this tenant. */
  totalTasksProcessed: number;
  /** Unix ms timestamp of the last `updateLearningState` call. */
  lastUpdated: number;
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Creates a zeroed-out UserLearningState for a new tenant.
 *
 * @param tenantId     Unique tenant identifier.
 * @param industryHint Optional industry vertical to bias recommendations.
 */
export function createEmptyLearningState(
  tenantId: string,
  industryHint?: string,
): UserLearningState {
  return {
    tenantId,
    industryHint,
    taskPatterns: [],
    entityMappings: [],
    vendorReliabilityScores: {},
    successfulStrategyConfigs: {},
    anomalyBaselines: {},
    totalTasksProcessed: 0,
    lastUpdated: Date.now(),
  };
}

// ─── Private Helpers ──────────────────────────────────────────

/**
 * Exponential moving average helper.
 * α = 2/(n+1) where n is the number of periods (default 20).
 */
function ema(current: number, newValue: number, alpha = 0.095): number {
  return current + alpha * (newValue - current);
}

/** Extracts a stable vendor key from task input data, if present. */
function extractVendorKey(task: WorkforceTask): string | undefined {
  const input = task.inputData as Record<string, unknown>;
  const raw = input['vendorName'] ?? input['vendor'] ?? input['supplierName'];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().toLowerCase();
  }
  return undefined;
}

/**
 * Attempts to build an EntityMapping from task input/output data.
 * Returns undefined if there is insufficient identity information.
 */
function extractEntityMapping(
  task: WorkforceTask,
  result: WorkforceTaskResult,
): EntityMapping | undefined {
  const input = task.inputData as Record<string, unknown>;
  const output = (result.outputData ?? {}) as Record<string, unknown>;

  const names: string[] = [];
  const emails: string[] = [];
  const domains: string[] = [];

  for (const src of [input, output]) {
    const nameRaw = src['name'] ?? src['fullName'] ?? src['contactName'] ?? src['companyName'];
    if (typeof nameRaw === 'string' && nameRaw.trim()) names.push(nameRaw.trim());

    const emailRaw = src['email'] ?? src['contactEmail'];
    if (typeof emailRaw === 'string' && emailRaw.includes('@')) {
      emails.push(emailRaw.toLowerCase());
      const domainPart = emailRaw.split('@')[1];
      if (domainPart) domains.push(domainPart.toLowerCase());
    }

    const domainRaw = src['domain'] ?? src['website'];
    if (typeof domainRaw === 'string' && domainRaw.includes('.')) {
      domains.push(domainRaw.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]);
    }
  }

  if (names.length === 0 && emails.length === 0 && domains.length === 0) return undefined;

  return {
    canonicalId: [task.category, emails[0] ?? domains[0] ?? names[0]].join(':'),
    names: [...new Set(names)],
    emails: [...new Set(emails)],
    domains: [...new Set(domains)],
    category: task.category,
    lastSeen: Date.now(),
  };
}

/** Merges a new EntityMapping into the existing array, deduplicating by email/domain/name. */
function mergeEntityMapping(
  existing: EntityMapping[],
  incoming: EntityMapping,
): EntityMapping[] {
  const match = existing.find(
    (e) =>
      e.emails.some((em) => incoming.emails.includes(em)) ||
      e.domains.some((d) => incoming.domains.includes(d)) ||
      (e.names.length > 0 && incoming.names.length > 0 && e.names[0] === incoming.names[0]),
  );

  if (!match) return [...existing, incoming];

  // Merge into the matched entry
  return existing.map((e) => {
    if (e !== match) return e;
    return {
      ...e,
      names: [...new Set([...e.names, ...incoming.names])],
      emails: [...new Set([...e.emails, ...incoming.emails])],
      domains: [...new Set([...e.domains, ...incoming.domains])],
      lastSeen: Math.max(e.lastSeen, incoming.lastSeen),
    };
  });
}

// ─── Core Learning Functions ──────────────────────────────────

/**
 * Incorporates a completed WorkforceTaskResult into the tenant's learning state.
 *
 * Updates:
 * - Task pattern counts and success rates for the matching category+strategy+hour+day slot.
 * - Anomaly baselines via exponential moving average.
 * - Entity mappings extracted from task input/output data.
 * - Vendor reliability scores (for finance/procurement tasks).
 * - Successful strategy config snapshots when confidence is high.
 *
 * This function is pure — it returns a new state object and never mutates the input.
 *
 * @param state   Current learning state.
 * @param result  The task result to incorporate.
 * @param task    The original task (provides category, strategy, and input data).
 * @returns Updated UserLearningState.
 */
export function updateLearningState(
  state: UserLearningState,
  result: WorkforceTaskResult,
  task: WorkforceTask,
): UserLearningState {
  const now = Date.now();
  const date = new Date(now);
  const hour = date.getUTCHours() as TaskPatternEntry['hour'];
  const dayOfWeek = date.getUTCDay() as TaskPatternEntry['dayOfWeek'];
  const confidence = result.confidence ?? 0.7;
  const succeeded = result.success === true && result.status === 'completed';

  // ── 1. Update task patterns ─────────────────────────────────
  const patternKey = `${task.category}:${task.strategy}:${hour}:${dayOfWeek}`;
  let patternFound = false;
  const updatedPatterns = state.taskPatterns.map((p) => {
    const key = `${p.category}:${p.strategy}:${p.hour}:${p.dayOfWeek}`;
    if (key !== patternKey) return p;
    patternFound = true;
    return {
      ...p,
      count: p.count + 1,
      successCount: p.successCount + (succeeded ? 1 : 0),
      avgConfidenceSum: p.avgConfidenceSum + confidence,
      lastSeen: now,
    };
  });

  if (!patternFound) {
    updatedPatterns.push({
      category: task.category,
      strategy: task.strategy,
      hour,
      dayOfWeek,
      count: 1,
      successCount: succeeded ? 1 : 0,
      avgConfidenceSum: confidence,
      lastSeen: now,
    });
  }

  // ── 2. Update anomaly baselines (EMA) ───────────────────────
  const catKey = task.category as string;
  const existingBaseline = state.anomalyBaselines[catKey] ?? {
    avgTasksPerHour: 1,
    stdDevTasksPerHour: 0.5,
    avgConfidence: confidence,
  };

  // We model a single task arrival as 1 task this "sample".
  // avgTasksPerHour converges toward the true rate via EMA over time.
  const newAvgTasksPerHour = ema(existingBaseline.avgTasksPerHour, 1);
  // Update stdDev estimate as EMA of |sample - mean|
  const newStdDev = ema(
    existingBaseline.stdDevTasksPerHour,
    Math.abs(1 - existingBaseline.avgTasksPerHour),
  );
  const newAvgConfidence = ema(existingBaseline.avgConfidence, confidence);

  const updatedBaselines = {
    ...state.anomalyBaselines,
    [catKey]: {
      avgTasksPerHour: newAvgTasksPerHour,
      stdDevTasksPerHour: Math.max(newStdDev, 0.1), // floor to avoid division by zero
      avgConfidence: newAvgConfidence,
    },
  };

  // ── 3. Entity mappings ──────────────────────────────────────
  let updatedEntityMappings = state.entityMappings;
  const entityMapping = extractEntityMapping(task, result);
  if (entityMapping) {
    updatedEntityMappings = mergeEntityMapping(updatedEntityMappings, entityMapping);
  }

  // ── 4. Vendor reliability (finance / procurement) ────────────
  let updatedVendorScores = state.vendorReliabilityScores;
  if (task.category === 'finance' || task.category === 'procurement') {
    const vendorKey = extractVendorKey(task);
    if (vendorKey) {
      const existingScore = state.vendorReliabilityScores[vendorKey] ?? 0.7;
      updatedVendorScores = {
        ...state.vendorReliabilityScores,
        [vendorKey]: ema(existingScore, succeeded ? 1.0 : 0.0, 0.1),
      };
    }
  }

  // ── 5. Successful strategy configs ──────────────────────────
  let updatedSuccessfulConfigs = state.successfulStrategyConfigs;
  if (succeeded && confidence >= 0.85) {
    updatedSuccessfulConfigs = {
      ...state.successfulStrategyConfigs,
      // Record the category config that produced a high-confidence success
      [catKey]: {
        category: task.category,
        strategies: [task.strategy],
        escalationThresholdConfidence: confidence,
      } satisfies Partial<WorkforceBotConfig>,
    };
  }

  return {
    ...state,
    taskPatterns: updatedPatterns,
    anomalyBaselines: updatedBaselines,
    entityMappings: updatedEntityMappings,
    vendorReliabilityScores: updatedVendorScores,
    successfulStrategyConfigs: updatedSuccessfulConfigs,
    totalTasksProcessed: state.totalTasksProcessed + 1,
    lastUpdated: now,
  };
}

// ─── Strategy Adjustment Recommendations ─────────────────────

/**
 * A single recommended adjustment to a bot configuration field,
 * derived from accumulated learning patterns.
 */
export interface StrategyAdjustmentRecommendation {
  /** The WorkforceBotConfig field to adjust. */
  field: string;
  currentValue: unknown;
  recommendedValue: unknown;
  /** Plain-English reasoning for the recommendation. */
  reasoning: string;
  /** 0–1. Higher = more data supporting this recommendation. */
  confidence: number;
}

/**
 * Analyses accumulated task patterns and anomaly baselines to recommend
 * adjustments to a bot's configuration.
 *
 * Checks performed:
 * - Escalation threshold too low/high vs. empirical confidence distribution.
 * - Tasks-per-hour limit vs. observed peak volume.
 * - Strategy mix vs. success rates per strategy.
 * - Vendor reliability trends for finance/procurement categories.
 *
 * @param state         Current learning state (must have sufficient history).
 * @param currentConfig The bot's live configuration to evaluate against.
 * @returns Array of typed recommendations, ordered by confidence descending.
 */
export function recommendStrategyAdjustments(
  state: UserLearningState,
  currentConfig: WorkforceBotConfig,
): StrategyAdjustmentRecommendation[] {
  const recommendations: StrategyAdjustmentRecommendation[] = [];
  const catKey = currentConfig.category as string;

  // ── A. Escalation threshold calibration ─────────────────────
  const catPatterns = state.taskPatterns.filter((p) => p.category === currentConfig.category);
  if (catPatterns.length > 0) {
    const totalCount = catPatterns.reduce((s, p) => s + p.count, 0);
    const totalSuccessCount = catPatterns.reduce((s, p) => s + p.successCount, 0);
    const totalConfSum = catPatterns.reduce((s, p) => s + p.avgConfidenceSum, 0);

    const empiricalSuccessRate = totalCount > 0 ? totalSuccessCount / totalCount : 0;
    const empiricalAvgConf = totalCount > 0 ? totalConfSum / totalCount : 0.7;

    // If empirical average confidence is substantially above the escalation threshold,
    // the threshold is set too conservatively (too many unnecessary escalations).
    if (
      empiricalAvgConf - currentConfig.escalationThresholdConfidence > 0.15 &&
      totalCount >= 20
    ) {
      const recommended = Math.min(0.95, Math.round((empiricalAvgConf - 0.05) * 100) / 100);
      recommendations.push({
        field: 'escalationThresholdConfidence',
        currentValue: currentConfig.escalationThresholdConfidence,
        recommendedValue: recommended,
        reasoning: `Empirical average confidence is ${(empiricalAvgConf * 100).toFixed(1)} % across ${totalCount} tasks. Raising the escalation threshold to ${(recommended * 100).toFixed(0)} % would reduce unnecessary escalations while maintaining a 5-point safety margin.`,
        confidence: Math.min(0.95, 0.5 + totalCount / 200),
      });
    }

    // If success rate is low and threshold is already high, recommend lowering it
    // to allow more borderline tasks to be escalated for human review.
    if (
      empiricalSuccessRate < 0.65 &&
      currentConfig.escalationThresholdConfidence > 0.75 &&
      totalCount >= 20
    ) {
      const recommended = Math.max(0.5, currentConfig.escalationThresholdConfidence - 0.1);
      recommendations.push({
        field: 'escalationThresholdConfidence',
        currentValue: currentConfig.escalationThresholdConfidence,
        recommendedValue: recommended,
        reasoning: `Success rate is only ${(empiricalSuccessRate * 100).toFixed(1)} % across ${totalCount} tasks. Lowering the escalation threshold to ${(recommended * 100).toFixed(0)} % will route more uncertain tasks to human review and improve outcome quality.`,
        confidence: Math.min(0.9, 0.4 + totalCount / 200),
      });
    }
  }

  // ── B. maxTasksPerHour calibration ──────────────────────────
  const baseline = state.anomalyBaselines[catKey];
  if (baseline) {
    const peakEstimate = Math.ceil(baseline.avgTasksPerHour + 3 * baseline.stdDevTasksPerHour);
    if (peakEstimate > currentConfig.maxTasksPerHour * 1.2) {
      recommendations.push({
        field: 'maxTasksPerHour',
        currentValue: currentConfig.maxTasksPerHour,
        recommendedValue: Math.ceil(peakEstimate * 1.1), // 10 % headroom above 3-sigma peak
        reasoning: `Estimated peak volume (μ + 3σ = ${peakEstimate} tasks/hr) exceeds the current limit of ${currentConfig.maxTasksPerHour}. Tasks will be dropped during peak hours. Raising the limit to ${Math.ceil(peakEstimate * 1.1)} provides 10 % headroom.`,
        confidence: 0.75,
      });
    } else if (baseline.avgTasksPerHour < currentConfig.maxTasksPerHour * 0.3) {
      // Limit is far above typical volume — may lead to resource waste
      recommendations.push({
        field: 'maxTasksPerHour',
        currentValue: currentConfig.maxTasksPerHour,
        recommendedValue: Math.max(5, Math.ceil(baseline.avgTasksPerHour * 3)),
        reasoning: `Average volume is only ${baseline.avgTasksPerHour.toFixed(1)} tasks/hr — the current limit of ${currentConfig.maxTasksPerHour} over-provisions concurrency. Reducing to ${Math.max(5, Math.ceil(baseline.avgTasksPerHour * 3))} saves compute while leaving 3× headroom.`,
        confidence: 0.6,
      });
    }
  }

  // ── C. Strategy success rate analysis ───────────────────────
  for (const strategy of currentConfig.strategies) {
    const stratPatterns = catPatterns.filter((p) => p.strategy === strategy);
    const totalCount = stratPatterns.reduce((s, p) => s + p.count, 0);
    const totalSuccess = stratPatterns.reduce((s, p) => s + p.successCount, 0);
    if (totalCount < 10) continue; // not enough data

    const successRate = totalSuccess / totalCount;
    if (successRate < 0.5) {
      recommendations.push({
        field: 'strategies',
        currentValue: strategy,
        recommendedValue: `disable_or_review:${strategy}`,
        reasoning: `Strategy "${strategy}" has only a ${(successRate * 100).toFixed(1)} % success rate across ${totalCount} executions. Consider disabling it and investigating the root cause, or replacing it with an alternative strategy.`,
        confidence: Math.min(0.9, 0.4 + totalCount / 100),
      });
    }
  }

  // ── D. Vendor reliability (procurement / finance) ────────────
  if (
    currentConfig.category === 'procurement' ||
    currentConfig.category === 'finance'
  ) {
    const unreliable = Object.entries(state.vendorReliabilityScores).filter(
      ([, score]) => score < 0.5,
    );
    if (unreliable.length > 0) {
      recommendations.push({
        field: 'dataAccessScopes',
        currentValue: currentConfig.dataAccessScopes,
        recommendedValue: [
          ...currentConfig.dataAccessScopes,
          ...unreliable.map(([v]) => `vendor:flag:${v}`),
        ],
        reasoning: `The following vendors have reliability scores below 50 %: ${unreliable.map(([v, s]) => `${v} (${(s * 100).toFixed(0)} %)`).join(', ')}. Adding vendor-level flags to data access scopes will allow downstream systems to apply extra validation.`,
        confidence: 0.7,
      });
    }
  }

  // Sort by confidence descending
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

// ─── Anomaly Detection ────────────────────────────────────────

/**
 * A detected anomaly in current-hour task volume or confidence metrics.
 */
export interface WorkforceAnomaly {
  category: WorkforceCategory;
  anomalyType: 'volume_spike' | 'volume_drop' | 'confidence_degradation' | 'new_pattern';
  severity: RiskLevel;
  description: string;
}

/**
 * Performs Z-score based anomaly detection by comparing current-hour task
 * counts against per-category baselines accumulated in the learning state.
 *
 * Anomaly types:
 * - `volume_spike`            Z > +2.5 (excess volume above baseline)
 * - `volume_drop`             Z < -2.5 (volume well below baseline)
 * - `confidence_degradation`  Current confidence < (baseline - 0.15)
 * - `new_pattern`             No baseline exists yet (first observation)
 *
 * Severity mapping:
 * - |Z| >= 3.5 → critical
 * - |Z| >= 2.5 → high
 * - confidence_degradation >= 0.15 below baseline → high
 * - new_pattern → low
 *
 * @param state                Accumulated learning state with baselines.
 * @param currentHourMetrics   Map of category → task count in the current hour window.
 * @returns Array of WorkforceAnomaly alerts, ordered by most severe first.
 */
export function detectAnomalies(
  state: UserLearningState,
  currentHourMetrics: Record<WorkforceCategory, number>,
): WorkforceAnomaly[] {
  const anomalies: WorkforceAnomaly[] = [];

  const SEVERITY_RANK: Record<RiskLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  for (const [rawCat, currentCount] of Object.entries(currentHourMetrics) as [
    WorkforceCategory,
    number,
  ][]) {
    const baseline = state.anomalyBaselines[rawCat as string];

    if (!baseline) {
      // No historical data — flag as new pattern but non-urgent
      anomalies.push({
        category: rawCat,
        anomalyType: 'new_pattern',
        severity: 'low',
        description: `No historical baseline exists for category "${rawCat}". This is the first observed activity window. Confidence will improve as more data accumulates.`,
      });
      continue;
    }

    const { avgTasksPerHour, stdDevTasksPerHour, avgConfidence } = baseline;
    const safeStdDev = Math.max(stdDevTasksPerHour, 0.1);
    const zScore = (currentCount - avgTasksPerHour) / safeStdDev;

    if (zScore > 2.5) {
      const severity: RiskLevel = zScore >= 3.5 ? 'critical' : 'high';
      anomalies.push({
        category: rawCat,
        anomalyType: 'volume_spike',
        severity,
        description:
          `[${rawCat}] Volume spike detected: ${currentCount} tasks this hour vs. baseline μ=${avgTasksPerHour.toFixed(1)}, σ=${safeStdDev.toFixed(1)} (Z=${zScore.toFixed(2)}). ` +
          `Possible causes: upstream integration burst, runaway automation loop, or external event trigger. Verify integration health.`,
      });
    } else if (zScore < -2.5) {
      const severity: RiskLevel = zScore <= -3.5 ? 'high' : 'medium';
      anomalies.push({
        category: rawCat,
        anomalyType: 'volume_drop',
        severity,
        description:
          `[${rawCat}] Volume drop detected: ${currentCount} tasks this hour vs. baseline μ=${avgTasksPerHour.toFixed(1)}, σ=${safeStdDev.toFixed(1)} (Z=${zScore.toFixed(2)}). ` +
          `Possible causes: integration connectivity issue, credential expiry, or upstream service degradation. Check adapter health.`,
      });
    }

    // Confidence degradation check — use the current hour's task patterns
    const catPatterns = state.taskPatterns.filter((p) => p.category === rawCat);
    if (catPatterns.length > 0) {
      // Approximate current-hour confidence by the most recently observed patterns
      const recentPatterns = catPatterns
        .filter((p) => Date.now() - p.lastSeen < 3_600_000)
        .filter((p) => p.count > 0);

      if (recentPatterns.length > 0) {
        const recentAvgConf =
          recentPatterns.reduce((s, p) => s + p.avgConfidenceSum / p.count, 0) /
          recentPatterns.length;

        const confDrop = avgConfidence - recentAvgConf;
        if (confDrop >= 0.15) {
          const severity: RiskLevel = confDrop >= 0.3 ? 'critical' : 'high';
          anomalies.push({
            category: rawCat,
            anomalyType: 'confidence_degradation',
            severity,
            description:
              `[${rawCat}] Confidence degradation detected: current avg ${(recentAvgConf * 100).toFixed(1)} % vs. baseline ${(avgConfidence * 100).toFixed(1)} % (drop = ${(confDrop * 100).toFixed(1)} pp). ` +
              `Review recent task outputs for data quality issues, input drift, or prompt/model changes.`,
          });
        }
      }
    }
  }

  // Sort by severity descending (critical → high → medium → low)
  return anomalies.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

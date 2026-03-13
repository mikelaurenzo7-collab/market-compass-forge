/**
 * Workforce Domain Intelligence
 *
 * Provides elite, domain-specific decision intelligence for each of the 12
 * workforce categories. Each category module contains:
 * - Industry-aware evaluation logic
 * - Strategy selection heuristics
 * - Confidence scoring models
 * - Escalation decision logic
 *
 * All functions are pure (no I/O). They consume structured task data and
 * produce scored action recommendations that feed into the strategy engine.
 */

import type {
  WorkforceCategory,
  WorkforceStrategy,
  WorkforceTask,
  WorkforceTaskResult,
  WorkforceBotConfig,
  TaskPriority,
  RiskLevel,
} from '../index.js';
import type { WorkforceIndustry } from './team.js';

// ─── Shared Intelligence Types ─────────────────────────────────────────────────

/** A ranked action recommendation produced by a domain intelligence module. */
export interface IntelligenceRecommendation {
  /** The strategy that should handle this task. */
  strategy: WorkforceStrategy;
  /** Confidence score 0–1 that this is the right action. */
  confidence: number;
  /** Plain-English rationale for this recommendation. */
  rationale: string;
  /** Estimated business value/urgency score 0–100. */
  urgencyScore: number;
  /** Risk if this action is taken autonomously without human review. */
  autonomyRisk: RiskLevel;
  /** Optional additional context passed to the executor. */
  context?: Record<string, unknown>;
}

/** Summary of domain-specific signals extracted from task input data. */
export interface DomainSignals {
  category: WorkforceCategory;
  extractedEntities: Record<string, string>;
  detectedPriority: TaskPriority;
  keywordsMatched: string[];
  sentimentScore?: number; // -1 to +1
  industryContext?: string;
}

// ─── 1. Customer Support Intelligence ─────────────────────────────────────────

const SUPPORT_URGENCY_KEYWORDS: Record<TaskPriority, string[]> = {
  critical: ['down', 'outage', 'data loss', 'breach', 'unable to login', 'not working', 'critical', 'emergency', 'urgent', 'money lost', 'fraud'],
  high: ['slow', 'error', 'broken', 'failed', 'billing problem', 'charge', 'refund', 'cancel', 'frustrated', 'escalate'],
  medium: ['question', 'how to', 'help', 'need assistance', 'confused', 'clarification', 'update', 'change'],
  low: ['feedback', 'suggestion', 'nice to have', 'wondering', 'curious', 'thank you'],
};

const SUPPORT_CHANNEL_ESCALATION: Record<string, number> = {
  'phone': 0.90,
  'email': 0.70,
  'chat': 0.80,
  'social': 0.85, // social media = public = high urgency
  'portal': 0.60,
};

/**
 * Customer Support Intelligence — triage inbound tickets with elite accuracy.
 *
 * Evaluates: urgency keywords, customer tier, SLA remaining, channel type,
 * prior ticket history, and sentiment to produce a ranked strategy recommendation.
 */
export function evaluateCustomerSupportTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const description = String(input['description'] ?? input['message'] ?? task.description ?? '').toLowerCase();
  const channel = String(input['channel'] ?? 'portal').toLowerCase();
  const customerTier = String(input['customerTier'] ?? input['tier'] ?? 'standard').toLowerCase();
  const slaRemainingMs = Number(input['slaRemainingMs'] ?? 24 * 3_600_000);
  const priorTickets = Number(input['priorOpenTickets'] ?? 0);

  // Urgency detection
  let detectedPriority: TaskPriority = 'low';
  let matchedKeywords: string[] = [];
  for (const [priority, keywords] of Object.entries(SUPPORT_URGENCY_KEYWORDS) as [TaskPriority, string[]][]) {
    const matches = keywords.filter(kw => description.includes(kw));
    if (matches.length > 0) {
      detectedPriority = priority;
      matchedKeywords = matches;
      break;
    }
  }

  // Channel confidence modifier
  const channelConf = SUPPORT_CHANNEL_ESCALATION[channel] ?? 0.65;

  // SLA urgency modifier
  const slaUrgency = slaRemainingMs < 3_600_000 ? 0.95 : slaRemainingMs < 7_200_000 ? 0.80 : 0.60;

  // Customer tier modifier
  const tierBoost = customerTier.includes('enterprise') || customerTier.includes('vip') ? 0.15 : 0;

  // Repeated contact penalty (frustrated customer)
  const repeatPenalty = priorTickets > 2 ? 0.1 : 0;

  const baseConfidence = (channelConf + slaUrgency) / 2 + tierBoost + repeatPenalty;
  const confidence = Math.min(0.97, baseConfidence);

  // Strategy selection
  const strategy: WorkforceStrategy = detectedPriority === 'critical' || detectedPriority === 'high'
    ? 'ticket_triage'
    : description.length > 50
    ? 'auto_response'
    : 'knowledge_base_sync';

  // Industry-specific urgency adjustments
  const urgencyScore = computeUrgencyScore(detectedPriority, slaRemainingMs, industry);

  const autonomyRisk: RiskLevel = detectedPriority === 'critical' ? 'high'
    : detectedPriority === 'high' ? 'medium' : 'low';

  return {
    strategy,
    confidence,
    rationale: `Detected ${detectedPriority} priority ticket via keywords: [${matchedKeywords.join(', ')}]. Channel: ${channel} (confidence modifier: ${channelConf}). SLA remaining: ${Math.round(slaRemainingMs / 3_600_000)}h. Customer tier: ${customerTier}.`,
    urgencyScore,
    autonomyRisk,
    context: { detectedPriority, matchedKeywords, channel, customerTier },
  };
}

// ─── 2. Sales CRM Intelligence ────────────────────────────────────────────────

const LEAD_QUALITY_SIGNALS = {
  budgetIndicators: ['budget', 'spend', 'investment', 'allocated', 'approved', 'purchase order'],
  authorityIndicators: ['ceo', 'cto', 'vp', 'director', 'head of', 'decision maker', 'c-suite', 'founder'],
  needIndicators: ['looking for', 'evaluating', 'need', 'require', 'problem', 'challenge', 'pain point', 'struggling'],
  timelineIndicators: ['asap', 'q1', 'q2', 'this quarter', 'this month', 'urgent', 'immediately', 'soon'],
};

/**
 * Sales CRM Intelligence — lead scoring, CRM enrichment prioritisation, and pipeline health.
 *
 * Applies BANT (Budget, Authority, Need, Timeline) framework plus behavioral signals
 * to score leads and recommend the right CRM action.
 */
export function evaluateSalesCRMTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const notes = String(input['notes'] ?? input['description'] ?? task.description ?? '').toLowerCase();
  const jobTitle = String(input['jobTitle'] ?? input['title'] ?? '').toLowerCase();
  const companySize = Number(input['companySize'] ?? input['employees'] ?? 0);
  const dealValue = Number(input['dealValue'] ?? input['estimatedValue'] ?? 0);

  // BANT scoring
  const budgetScore = LEAD_QUALITY_SIGNALS.budgetIndicators.some(s => notes.includes(s)) ? 25 : 0;
  const authorityScore = LEAD_QUALITY_SIGNALS.authorityIndicators.some(s =>
    notes.includes(s) || jobTitle.includes(s),
  ) ? 25 : 0;
  const needScore = LEAD_QUALITY_SIGNALS.needIndicators.some(s => notes.includes(s)) ? 25 : 0;
  const timelineScore = LEAD_QUALITY_SIGNALS.timelineIndicators.some(s => notes.includes(s)) ? 25 : 0;

  const bantTotal = budgetScore + authorityScore + needScore + timelineScore;

  // Company size modifier (enterprise signals = higher priority)
  const sizeBoost = companySize > 1000 ? 0.1 : companySize > 200 ? 0.05 : 0;
  const dealBoost = dealValue > 50_000 ? 0.1 : dealValue > 10_000 ? 0.05 : 0;

  const confidence = Math.min(0.95, 0.4 + bantTotal / 200 + sizeBoost + dealBoost);

  const strategy: WorkforceStrategy = bantTotal >= 75 ? 'crm_enrichment'
    : bantTotal >= 50 ? 'lead_scoring'
    : 'knowledge_base_sync';

  const urgencyScore = bantTotal > 50 ? 80 : bantTotal > 25 ? 50 : 20;

  return {
    strategy,
    confidence,
    rationale: `BANT score: ${bantTotal}/100. Budget: ${budgetScore > 0 ? '✓' : '✗'}, Authority: ${authorityScore > 0 ? '✓' : '✗'}, Need: ${needScore > 0 ? '✓' : '✗'}, Timeline: ${timelineScore > 0 ? '✓' : '✗'}. Deal value: $${dealValue.toLocaleString()}, company size: ${companySize}.`,
    urgencyScore,
    autonomyRisk: bantTotal >= 75 ? 'low' : 'medium',
    context: { bantTotal, budgetScore, authorityScore, needScore, timelineScore, dealValue },
  };
}

// ─── 3. Finance Intelligence ──────────────────────────────────────────────────

const INVOICE_RISK_PATTERNS = {
  duplicate: /inv[-_]?\d+ already|duplicate invoice|already processed/i,
  highValue: (amount: number) => amount > 50_000,
  unusualVendor: (vendor: string, knownVendors: string[]) =>
    knownVendors.length > 0 && !knownVendors.some(v => vendor.toLowerCase().includes(v.toLowerCase())),
  missingPO: (data: Record<string, unknown>) => !data['purchaseOrderNumber'] && !data['poNumber'],
};

/**
 * Finance Intelligence — invoice processing, expense reconciliation, and risk detection.
 *
 * Evaluates: invoice amount, vendor reputation, PO matching, duplicate risk,
 * and payment terms compliance to recommend the appropriate finance strategy.
 */
export function evaluateFinanceTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const amount = Number(input['amount'] ?? input['invoiceAmount'] ?? input['total'] ?? 0);
  const vendor = String(input['vendorName'] ?? input['vendor'] ?? '');
  const description = String(input['description'] ?? task.description ?? '').toLowerCase();
  const knownVendors = (input['knownVendors'] as string[] | undefined) ?? [];

  let riskScore = 0;
  const riskFactors: string[] = [];

  if (INVOICE_RISK_PATTERNS.duplicate.test(description)) {
    riskScore += 40;
    riskFactors.push('potential duplicate invoice');
  }
  if (INVOICE_RISK_PATTERNS.highValue(amount)) {
    riskScore += 30;
    riskFactors.push(`high value ($${amount.toLocaleString()})`);
  }
  if (INVOICE_RISK_PATTERNS.unusualVendor(vendor, knownVendors)) {
    riskScore += 20;
    riskFactors.push('unrecognised vendor');
  }
  if (INVOICE_RISK_PATTERNS.missingPO(input)) {
    riskScore += 15;
    riskFactors.push('missing PO number');
  }

  const confidence = riskScore > 50 ? 0.5 : riskScore > 25 ? 0.70 : 0.88;
  const strategy: WorkforceStrategy = task.strategy === 'expense_reconciliation'
    ? 'expense_reconciliation'
    : 'invoice_processing';

  const autonomyRisk: RiskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  return {
    strategy,
    confidence,
    rationale: `Invoice risk score: ${riskScore}/100. Risk factors: ${riskFactors.length > 0 ? riskFactors.join(', ') : 'none detected'}. Amount: $${amount.toLocaleString()}, vendor: "${vendor}".`,
    urgencyScore: riskScore > 50 ? 90 : amount > 10_000 ? 70 : 40,
    autonomyRisk,
    context: { riskScore, riskFactors, amount, vendor },
  };
}

// ─── 4. HR Intelligence ───────────────────────────────────────────────────────

const ONBOARDING_PRIORITY_INDICATORS = ['start date', 'day 1', 'starting monday', 'new hire', 'first day', 'equipment needed'];
const OFFBOARDING_RED_FLAGS = ['termination', 'resigned', 'last day', 'access revoked', 'IT offboarding'];
const COMPLIANCE_SENSITIVE_ROLES = ['cfo', 'ceo', 'hr director', 'legal counsel', 'finance manager', 'payroll', 'admin'];

/**
 * HR Intelligence — onboarding acceleration, shift scheduling optimisation,
 * and compliance-sensitive role detection.
 */
export function evaluateHRTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const description = String(input['description'] ?? task.description ?? '').toLowerCase();
  const role = String(input['role'] ?? input['jobTitle'] ?? '').toLowerCase();
  const isOffboarding = OFFBOARDING_RED_FLAGS.some(f => description.toLowerCase().includes(f.toLowerCase()));
  const isComplianceSensitive = COMPLIANCE_SENSITIVE_ROLES.some(r => role.includes(r));
  const hasOnboardingUrgency = ONBOARDING_PRIORITY_INDICATORS.some(i => description.toLowerCase().includes(i.toLowerCase()));

  // Offboarding is always high-risk because it involves access revocation
  const autonomyRisk: RiskLevel = isOffboarding || isComplianceSensitive ? 'high' : hasOnboardingUrgency ? 'medium' : 'low';

  // Strategy selection
  const strategy: WorkforceStrategy = isOffboarding
    ? 'employee_onboarding' // reuses the same workflow structure for off-boarding
    : description.includes('shift') || description.includes('schedule')
    ? 'shift_scheduling'
    : 'employee_onboarding';

  const confidence = isComplianceSensitive ? 0.55 : isOffboarding ? 0.65 : 0.80;

  return {
    strategy,
    confidence,
    rationale: buildHRRationale(isOffboarding, isComplianceSensitive, hasOnboardingUrgency, role),
    urgencyScore: isOffboarding ? 85 : hasOnboardingUrgency ? 75 : 40,
    autonomyRisk,
    context: { isOffboarding, isComplianceSensitive, role },
  };
}

// ─── 5. Document Processing Intelligence ──────────────────────────────────────

const DOCUMENT_TYPE_SIGNALS: Record<string, { strategy: WorkforceStrategy; risk: RiskLevel }> = {
  'contract': { strategy: 'contract_review', risk: 'high' },
  'nda': { strategy: 'contract_review', risk: 'high' },
  'invoice': { strategy: 'invoice_processing', risk: 'low' },
  'receipt': { strategy: 'data_extraction', risk: 'low' },
  'report': { strategy: 'document_classification', risk: 'low' },
  'legal': { strategy: 'contract_review', risk: 'high' },
  'medical': { strategy: 'document_classification', risk: 'critical' },
  'financial statement': { strategy: 'data_extraction', risk: 'medium' },
  'compliance': { strategy: 'document_classification', risk: 'high' },
  'audit': { strategy: 'audit_preparation', risk: 'high' },
  'policy': { strategy: 'knowledge_base_sync', risk: 'medium' },
  'purchase order': { strategy: 'invoice_processing', risk: 'low' },
};

/**
 * Document Processing Intelligence — classifies incoming documents and routes
 * to the correct extraction or review strategy with appropriate risk flagging.
 */
export function evaluateDocumentTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const fileName = String(input['fileName'] ?? input['filename'] ?? '').toLowerCase();
  const documentType = String(input['documentType'] ?? input['type'] ?? '').toLowerCase();
  const content = String(input['content'] ?? task.description ?? '').toLowerCase();
  const pageCount = Number(input['pageCount'] ?? input['pages'] ?? 1);

  // Detect document type
  const combined = `${fileName} ${documentType} ${content}`;
  let matched = Object.entries(DOCUMENT_TYPE_SIGNALS).find(([key]) => combined.includes(key));
  const signal = matched?.[1] ?? { strategy: 'document_classification' as WorkforceStrategy, risk: 'medium' as RiskLevel };

  // Complexity modifier: longer documents need more scrutiny
  const complexityPenalty = pageCount > 50 ? 0.15 : pageCount > 20 ? 0.08 : 0;
  const confidence = Math.max(0.45, 0.85 - complexityPenalty);

  return {
    strategy: signal.strategy,
    confidence,
    rationale: `Document type detected as "${matched?.[0] ?? 'unknown'}". Pages: ${pageCount}. Complexity penalty: ${(complexityPenalty * 100).toFixed(0)}pp. Industry context: ${industry ?? 'general'}.`,
    urgencyScore: signal.risk === 'critical' ? 95 : signal.risk === 'high' ? 75 : signal.risk === 'medium' ? 45 : 25,
    autonomyRisk: signal.risk,
    context: { detectedType: matched?.[0], pageCount, signal },
  };
}

// ─── 6. Email Management Intelligence ────────────────────────────────────────

const EMAIL_INTENT_PATTERNS: Record<string, WorkforceStrategy> = {
  'schedule|meeting|call|available': 'meeting_scheduler',
  'invoice|payment|billing|charge|receipt': 'invoice_processing',
  'ticket|support|issue|broken|error|help': 'ticket_triage',
  'contract|agreement|nda|terms|sign': 'contract_review',
  'report|analytics|dashboard|metrics|kpi': 'report_generation',
};

/**
 * Email Management Intelligence — intent detection and smart routing for
 * high-volume shared inbox management.
 *
 * Analyses subject, sender domain, and body to determine routing strategy,
 * draft response recommendation, and escalation need.
 */
export function evaluateEmailTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const subject = String(input['subject'] ?? '').toLowerCase();
  const body = String(input['body'] ?? input['content'] ?? task.description ?? '').toLowerCase();
  const sender = String(input['senderEmail'] ?? input['from'] ?? '').toLowerCase();
  const combined = `${subject} ${body}`;

  // Intent detection
  let detectedStrategy: WorkforceStrategy = 'email_triage';
  let intentConfidence = 0.60;

  for (const [pattern, strategy] of Object.entries(EMAIL_INTENT_PATTERNS)) {
    if (new RegExp(pattern).test(combined)) {
      detectedStrategy = strategy;
      intentConfidence = 0.82;
      break;
    }
  }

  // Sender tier
  const isExternalDomain = sender.includes('@') && !sender.includes('internal') && !sender.includes('noreply');
  const isVIP = (input['isVIP'] as boolean | undefined) === true;

  const confidence = Math.min(0.95, intentConfidence + (isVIP ? 0.1 : 0));
  const urgencyScore = isVIP ? 85 : isExternalDomain ? 60 : 40;

  return {
    strategy: detectedStrategy,
    confidence,
    rationale: `Email intent: "${detectedStrategy}". Sender: ${sender.split('@')[1] ?? 'unknown'}. VIP: ${isVIP}. Subject keywords matched routing pattern.`,
    urgencyScore,
    autonomyRisk: isVIP ? 'medium' : 'low',
    context: { detectedIntent: detectedStrategy, isVIP, isExternalDomain },
  };
}

// ─── 7. Scheduling Intelligence ───────────────────────────────────────────────

/**
 * Scheduling Intelligence — meeting conflict detection, optimal slot recommendation,
 * and timezone-aware scheduling optimisation.
 */
export function evaluateSchedulingTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const attendeeCount = Number(input['attendeeCount'] ?? input['attendees'] ?? 1);
  const timezones = (input['timezones'] as string[] | undefined) ?? ['UTC'];
  const meetingType = String(input['meetingType'] ?? 'general').toLowerCase();
  const durationMinutes = Number(input['durationMinutes'] ?? 30);
  const hasDeadline = !!task.deadlineAt;

  // Complex multi-timezone or large meetings need human review
  const isComplex = timezones.length > 3 || attendeeCount > 8 || durationMinutes > 120;

  const confidence = isComplex ? 0.68 : hasDeadline ? 0.85 : 0.78;
  const urgencyScore = hasDeadline && task.deadlineAt
    ? task.deadlineAt - Date.now() < 86_400_000 ? 90 : 60
    : 35;

  return {
    strategy: 'meeting_scheduler',
    confidence,
    rationale: `Meeting: ${meetingType}, ${attendeeCount} attendees, ${timezones.length} timezone(s), ${durationMinutes} min duration. Complexity: ${isComplex ? 'high' : 'normal'}. Deadline: ${hasDeadline ? new Date(task.deadlineAt!).toISOString() : 'none'}.`,
    urgencyScore,
    autonomyRisk: isComplex ? 'medium' : 'low',
    context: { attendeeCount, timezones, meetingType, durationMinutes, isComplex },
  };
}

// ─── 8. Compliance Intelligence ───────────────────────────────────────────────

const COMPLIANCE_FRAMEWORKS: Record<string, { risk: RiskLevel; requiresHuman: boolean }> = {
  'gdpr': { risk: 'high', requiresHuman: true },
  'hipaa': { risk: 'critical', requiresHuman: true },
  'sox': { risk: 'high', requiresHuman: true },
  'pci': { risk: 'high', requiresHuman: true },
  'iso 27001': { risk: 'medium', requiresHuman: false },
  'aml': { risk: 'critical', requiresHuman: true },
  'kyc': { risk: 'high', requiresHuman: true },
  'finra': { risk: 'high', requiresHuman: true },
  'osha': { risk: 'medium', requiresHuman: false },
  'iso 9001': { risk: 'low', requiresHuman: false },
};

/**
 * Compliance Intelligence — regulatory framework detection, risk classification,
 * and mandatory human escalation determination for compliance monitoring tasks.
 */
export function evaluateComplianceTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const text = `${task.title} ${task.description}`.toLowerCase();
  const input = task.inputData as Record<string, unknown>;
  const isDeadlineDriven = !!task.deadlineAt;

  let highestRisk: RiskLevel = 'low';
  let requiresHuman = false;
  const detectedFrameworks: string[] = [];

  for (const [framework, meta] of Object.entries(COMPLIANCE_FRAMEWORKS)) {
    if (text.includes(framework)) {
      detectedFrameworks.push(framework.toUpperCase());
      if (meta.requiresHuman) requiresHuman = true;
      if (riskRank(meta.risk) > riskRank(highestRisk)) highestRisk = meta.risk;
    }
  }

  const strategy: WorkforceStrategy = isDeadlineDriven ? 'audit_preparation' : 'compliance_monitoring';
  const confidence = requiresHuman ? 0.55 : 0.80;

  const urgencyScore = isDeadlineDriven
    ? task.deadlineAt! - Date.now() < 7 * 86_400_000 ? 95 : 75
    : 50;

  return {
    strategy,
    confidence,
    rationale: `Compliance frameworks detected: ${detectedFrameworks.length > 0 ? detectedFrameworks.join(', ') : 'none'}. Risk level: ${highestRisk}. Human review ${requiresHuman ? 'REQUIRED' : 'optional'}. Industry: ${industry ?? 'general'}.`,
    urgencyScore,
    autonomyRisk: highestRisk,
    context: { detectedFrameworks, requiresHuman, highestRisk },
  };
}

// ─── 9. IT Operations Intelligence ────────────────────────────────────────────

const INCIDENT_SEVERITY_PATTERNS: Record<RiskLevel, RegExp> = {
  critical: /prod.*down|production outage|all users|complete failure|data loss|security breach|p0|sev0|sev1/i,
  high: /degraded|intermittent|slow|elevated error rate|p1|sev2|majority of users/i,
  medium: /intermittent|partial|some users|minor|p2|sev3/i,
  low: /informational|cosmetic|p3|sev4|low priority/i,
};

/**
 * IT Operations Intelligence — incident severity classification, runbook lookups,
 * and automated remediation recommendation with blast radius assessment.
 */
export function evaluateITOpsTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const text = `${task.title} ${task.description}`;
  const input = task.inputData as Record<string, unknown>;
  const affectedUsers = Number(input['affectedUsers'] ?? 0);
  const hasRunbook = Boolean(input['runbookUrl'] ?? input['runbook']);

  let severity: RiskLevel = 'low';
  for (const [level, pattern] of Object.entries(INCIDENT_SEVERITY_PATTERNS) as [RiskLevel, RegExp][]) {
    if (pattern.test(text)) {
      severity = level;
      break;
    }
  }

  // User impact modifier
  if (affectedUsers > 1000 && riskRank(severity) < riskRank('high')) severity = 'high';
  if (affectedUsers > 10000 && riskRank(severity) < riskRank('critical')) severity = 'critical';

  const confidence = hasRunbook ? 0.88 : severity === 'critical' ? 0.55 : 0.72;
  const strategy: WorkforceStrategy = 'system_health_check';

  return {
    strategy,
    confidence,
    rationale: `Incident severity: ${severity}. Affected users: ${affectedUsers}. Runbook available: ${hasRunbook}. Pattern matched: ${Object.entries(INCIDENT_SEVERITY_PATTERNS).find(([, p]) => p.test(text))?.[0] ?? 'none'}.`,
    urgencyScore: severity === 'critical' ? 100 : severity === 'high' ? 80 : severity === 'medium' ? 50 : 20,
    autonomyRisk: severity,
    context: { severity, affectedUsers, hasRunbook },
  };
}

// ─── 10. Reporting Intelligence ───────────────────────────────────────────────

/**
 * Reporting Intelligence — determines report complexity, data freshness requirements,
 * stakeholder audience, and distribution urgency.
 */
export function evaluateReportingTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const audience = String(input['audience'] ?? 'team').toLowerCase();
  const periodType = String(input['period'] ?? 'weekly').toLowerCase();
  const dataSources = (input['dataSources'] as string[] | undefined) ?? [];
  const isRegulatory = Boolean(input['isRegulatory'] ?? false);
  const isScheduled = Boolean(input['isScheduled'] ?? false);

  const isCLevelAudience = /board|ceo|cfo|cto|executive|c-suite|investor/i.test(audience);
  const complexityScore = dataSources.length * 10 + (isRegulatory ? 30 : 0) + (isCLevelAudience ? 20 : 0);

  const confidence = complexityScore > 60 ? 0.65 : isScheduled ? 0.90 : 0.75;

  return {
    strategy: 'report_generation',
    confidence,
    rationale: `Audience: ${audience}. Period: ${periodType}. Data sources: ${dataSources.length}. Regulatory: ${isRegulatory}. C-level audience: ${isCLevelAudience}. Complexity score: ${complexityScore}.`,
    urgencyScore: isRegulatory ? 85 : isCLevelAudience ? 70 : isScheduled ? 60 : 30,
    autonomyRisk: isRegulatory || isCLevelAudience ? 'medium' : 'low',
    context: { isCLevelAudience, complexityScore, isRegulatory, dataSources },
  };
}

// ─── 11. Project Management Intelligence ──────────────────────────────────────

/**
 * Project Management Intelligence — sprint velocity analysis, task orchestration,
 * and cross-team dependency resolution.
 */
export function evaluateProjectManagementTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const blockerCount = Number(input['blockerCount'] ?? input['blockers'] ?? 0);
  const daysUntilDeadline = task.deadlineAt
    ? (task.deadlineAt - Date.now()) / 86_400_000
    : 30;
  const teamCount = Number(input['teamCount'] ?? input['teams'] ?? 1);
  const isAtRisk = Boolean(input['isAtRisk'] ?? false);
  const velocityDrop = Number(input['velocityDropPercent'] ?? 0);

  let urgencyScore = 40;
  const riskFactors: string[] = [];

  if (daysUntilDeadline < 7) { urgencyScore += 30; riskFactors.push(`${Math.round(daysUntilDeadline)}d to deadline`); }
  if (blockerCount > 0) { urgencyScore += blockerCount * 10; riskFactors.push(`${blockerCount} blocker(s)`); }
  if (velocityDrop > 20) { urgencyScore += 20; riskFactors.push(`${velocityDrop}% velocity drop`); }
  if (isAtRisk) { urgencyScore += 15; riskFactors.push('marked at-risk'); }

  urgencyScore = Math.min(100, urgencyScore);

  const confidence = urgencyScore > 70 ? 0.72 : 0.85;

  return {
    strategy: 'task_orchestration',
    confidence,
    rationale: `Project risk: ${riskFactors.length > 0 ? riskFactors.join(', ') : 'none'}. Teams: ${teamCount}. Days to deadline: ${Math.round(daysUntilDeadline)}. Urgency: ${urgencyScore}.`,
    urgencyScore,
    autonomyRisk: urgencyScore > 70 ? 'high' : urgencyScore > 40 ? 'medium' : 'low',
    context: { blockerCount, daysUntilDeadline, teamCount, riskFactors },
  };
}

// ─── 12. Procurement Intelligence ────────────────────────────────────────────

/**
 * Procurement Intelligence — vendor evaluation, contract review prioritisation,
 * and purchase order risk scoring.
 */
export function evaluateProcurementTask(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const input = task.inputData as Record<string, unknown>;
  const amount = Number(input['amount'] ?? input['value'] ?? 0);
  const isNewVendor = Boolean(input['isNewVendor'] ?? false);
  const isSingleSource = Boolean(input['isSingleSource'] ?? false);
  const isContractRenewal = Boolean(input['isContractRenewal'] ?? false);
  const daysToExpiry = Number(input['daysToExpiry'] ?? 999);

  let riskScore = 0;
  const riskFactors: string[] = [];

  if (amount > 100_000) { riskScore += 30; riskFactors.push(`high value ($${amount.toLocaleString()})`); }
  else if (amount > 25_000) { riskScore += 15; riskFactors.push(`significant value ($${amount.toLocaleString()})`); }

  if (isNewVendor) { riskScore += 25; riskFactors.push('new/unvetted vendor'); }
  if (isSingleSource) { riskScore += 20; riskFactors.push('single-source risk'); }
  if (daysToExpiry < 30) { riskScore += 20; riskFactors.push(`contract expires in ${daysToExpiry}d`); }

  const strategy: WorkforceStrategy = isContractRenewal || riskScore > 40
    ? 'vendor_evaluation'
    : 'contract_review';

  const confidence = riskScore > 50 ? 0.60 : riskScore > 25 ? 0.75 : 0.88;
  const autonomyRisk: RiskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  return {
    strategy,
    confidence,
    rationale: `Procurement risk: ${riskScore}/100. Factors: ${riskFactors.length > 0 ? riskFactors.join(', ') : 'none'}. Amount: $${amount.toLocaleString()}.`,
    urgencyScore: daysToExpiry < 30 ? 90 : riskScore > 50 ? 75 : 40,
    autonomyRisk,
    context: { riskScore, riskFactors, amount, isNewVendor, isSingleSource },
  };
}

// ─── Master Router ─────────────────────────────────────────────────────────────

/**
 * Routes a task to the correct domain intelligence evaluator and returns a ranked
 * IntelligenceRecommendation.
 *
 * This is the single entry point that the strategy engine should call before
 * executing any workforce task. The returned recommendation enriches the executor's
 * confidence score and strategy selection.
 *
 * @param task      The task to evaluate.
 * @param config    The bot's current operative configuration.
 * @param industry  Optional industry context for playbook-aligned recommendations.
 */
export function evaluateTaskIntelligence(
  task: WorkforceTask,
  config: WorkforceBotConfig,
  industry?: WorkforceIndustry,
): IntelligenceRecommendation {
  const evaluators: Record<WorkforceCategory, (t: WorkforceTask, c: WorkforceBotConfig, i?: WorkforceIndustry) => IntelligenceRecommendation> = {
    customer_support: evaluateCustomerSupportTask,
    sales_crm: evaluateSalesCRMTask,
    finance: evaluateFinanceTask,
    hr: evaluateHRTask,
    document_processing: evaluateDocumentTask,
    email_management: evaluateEmailTask,
    scheduling: evaluateSchedulingTask,
    compliance: evaluateComplianceTask,
    it_ops: evaluateITOpsTask,
    reporting: evaluateReportingTask,
    project_management: evaluateProjectManagementTask,
    procurement: evaluateProcurementTask,
  };

  const evaluator = evaluators[task.category];
  return evaluator(task, config, industry);
}

/**
 * Extracts domain signals from a task for use in logging and learning systems.
 */
export function extractDomainSignals(
  task: WorkforceTask,
  recommendation: IntelligenceRecommendation,
): DomainSignals {
  return {
    category: task.category,
    extractedEntities: flattenToStringRecord(recommendation.context ?? {}),
    detectedPriority: task.priority,
    keywordsMatched: (recommendation.context?.['matchedKeywords'] as string[] | undefined) ?? [],
    industryContext: recommendation.context?.['industry'] as string | undefined,
  };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function riskRank(risk: RiskLevel): number {
  const ranks: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return ranks[risk];
}

function computeUrgencyScore(
  priority: TaskPriority,
  slaRemainingMs: number,
  industry?: WorkforceIndustry,
): number {
  const base = priority === 'critical' ? 95 : priority === 'high' ? 75 : priority === 'medium' ? 45 : 20;
  const slaBoost = slaRemainingMs < 1_800_000 ? 10 : slaRemainingMs < 7_200_000 ? 5 : 0;
  // Healthcare and finance_services treat customer concerns with higher urgency
  const industryBoost = industry === 'healthcare' || industry === 'finance_services' ? 5 : 0;
  return Math.min(100, base + slaBoost + industryBoost);
}

function buildHRRationale(
  isOffboarding: boolean,
  isComplianceSensitive: boolean,
  hasOnboardingUrgency: boolean,
  role: string,
): string {
  const parts: string[] = [];
  if (isOffboarding) parts.push('Task involves offboarding — access revocation is time-critical and high-risk.');
  if (isComplianceSensitive) parts.push(`Role "${role}" is compliance-sensitive — human sign-off required.`);
  if (hasOnboardingUrgency) parts.push('Onboarding urgency signals detected — prioritise provisioning within hours.');
  if (parts.length === 0) parts.push('Routine HR task — standard automation confidence applies.');
  return parts.join(' ');
}

function flattenToStringRecord(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      result[k] = String(v);
    }
  }
  return result;
}

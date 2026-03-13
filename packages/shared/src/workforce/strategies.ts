import type {
  WorkforceCategory,
  WorkforceTask,
  TaskPriority,
  RiskLevel,
} from '../index.js';

// ─── Category Configuration ──────────────────────────────────

export interface WorkforceCategoryConfig {
  category: WorkforceCategory;
  displayName: string;
  description: string;
  availableStrategies: string[];
  defaultMaxTasksPerHour: number;
  defaultMaxConcurrentTasks: number;
  defaultEscalationConfidence: number;
  riskProfile: RiskLevel;
  requiresLLM: boolean;
  exampleIntegrations: string[];
}

export const WORKFORCE_CATEGORY_CONFIGS: WorkforceCategoryConfig[] = [
  {
    category: 'customer_support',
    displayName: 'Customer Support',
    description: 'Automate ticket triage, auto-responses, and knowledge base maintenance for helpdesk operations',
    availableStrategies: ['ticket_triage', 'auto_response', 'knowledge_base_sync'],
    defaultMaxTasksPerHour: 120,
    defaultMaxConcurrentTasks: 10,
    defaultEscalationConfidence: 0.7,
    riskProfile: 'medium',
    requiresLLM: true,
    exampleIntegrations: ['Zendesk', 'Freshdesk', 'Intercom', 'HubSpot Service Hub'],
  },
  {
    category: 'sales_crm',
    displayName: 'Sales & CRM',
    description: 'Score inbound leads, enrich CRM records from public data, and automate pipeline hygiene',
    availableStrategies: ['lead_scoring', 'crm_enrichment'],
    defaultMaxTasksPerHour: 60,
    defaultMaxConcurrentTasks: 5,
    defaultEscalationConfidence: 0.65,
    riskProfile: 'medium',
    requiresLLM: true,
    exampleIntegrations: ['Salesforce', 'HubSpot CRM', 'Pipedrive', 'Close'],
  },
  {
    category: 'finance',
    displayName: 'Finance & Accounting',
    description: 'Process invoices, reconcile expenses, and automate bookkeeping workflows',
    availableStrategies: ['invoice_processing', 'expense_reconciliation'],
    defaultMaxTasksPerHour: 40,
    defaultMaxConcurrentTasks: 3,
    defaultEscalationConfidence: 0.85,
    riskProfile: 'high',
    requiresLLM: false,
    exampleIntegrations: ['QuickBooks', 'Xero', 'FreshBooks', 'Bill.com', 'Stripe'],
  },
  {
    category: 'hr',
    displayName: 'Human Resources',
    description: 'Automate employee onboarding checklists, offboarding, and shift schedule optimization',
    availableStrategies: ['employee_onboarding', 'shift_scheduling'],
    defaultMaxTasksPerHour: 30,
    defaultMaxConcurrentTasks: 5,
    defaultEscalationConfidence: 0.75,
    riskProfile: 'medium',
    requiresLLM: false,
    exampleIntegrations: ['BambooHR', 'Gusto', 'Rippling', 'Deputy', 'When I Work'],
  },
  {
    category: 'document_processing',
    displayName: 'Document Processing',
    description: 'Classify incoming documents, extract structured data from PDFs/images, and route to workflows',
    availableStrategies: ['document_classification', 'data_extraction'],
    defaultMaxTasksPerHour: 200,
    defaultMaxConcurrentTasks: 15,
    defaultEscalationConfidence: 0.8,
    riskProfile: 'low',
    requiresLLM: true,
    exampleIntegrations: ['Google Drive', 'Dropbox', 'Box', 'DocuSign', 'Adobe Acrobat'],
  },
  {
    category: 'email_management',
    displayName: 'Email Management',
    description: 'Triage inbound email by urgency and topic, draft contextual responses, flag action items',
    availableStrategies: ['email_triage', 'auto_response'],
    defaultMaxTasksPerHour: 100,
    defaultMaxConcurrentTasks: 8,
    defaultEscalationConfidence: 0.7,
    riskProfile: 'medium',
    requiresLLM: true,
    exampleIntegrations: ['Gmail', 'Outlook', 'Front', 'Mailchimp'],
  },
  {
    category: 'scheduling',
    displayName: 'Scheduling & Calendar',
    description: 'Find optimal meeting times across participants, send invites, manage booking links and reminders',
    availableStrategies: ['meeting_scheduler'],
    defaultMaxTasksPerHour: 50,
    defaultMaxConcurrentTasks: 5,
    defaultEscalationConfidence: 0.6,
    riskProfile: 'low',
    requiresLLM: false,
    exampleIntegrations: ['Google Calendar', 'Outlook Calendar', 'Calendly', 'Cal.com'],
  },
  {
    category: 'compliance',
    displayName: 'Compliance & Regulatory',
    description: 'Track regulatory deadlines, monitor policy adherence, and compile audit-ready documentation',
    availableStrategies: ['compliance_monitoring', 'audit_preparation'],
    defaultMaxTasksPerHour: 20,
    defaultMaxConcurrentTasks: 3,
    defaultEscalationConfidence: 0.9,
    riskProfile: 'critical',
    requiresLLM: true,
    exampleIntegrations: ['Vanta', 'Drata', 'OneTrust', 'LogicGate'],
  },
  {
    category: 'it_ops',
    displayName: 'IT Operations',
    description: 'Monitor system health, triage IT helpdesk tickets, alert on anomalies and outages',
    availableStrategies: ['system_health_check'],
    defaultMaxTasksPerHour: 300,
    defaultMaxConcurrentTasks: 20,
    defaultEscalationConfidence: 0.6,
    riskProfile: 'medium',
    requiresLLM: false,
    exampleIntegrations: ['Datadog', 'PagerDuty', 'Jira Service Management', 'ServiceNow'],
  },
  {
    category: 'reporting',
    displayName: 'Reporting & BI',
    description: 'Auto-generate business reports from connected data sources on schedules or triggers',
    availableStrategies: ['report_generation'],
    defaultMaxTasksPerHour: 15,
    defaultMaxConcurrentTasks: 3,
    defaultEscalationConfidence: 0.7,
    riskProfile: 'low',
    requiresLLM: true,
    exampleIntegrations: ['Google Sheets', 'Airtable', 'Notion', 'Metabase', 'Looker'],
  },
  {
    category: 'project_management',
    displayName: 'Project Management',
    description: 'Orchestrate multi-step workflows, track task completion, and automate status updates',
    availableStrategies: ['task_orchestration'],
    defaultMaxTasksPerHour: 60,
    defaultMaxConcurrentTasks: 10,
    defaultEscalationConfidence: 0.65,
    riskProfile: 'low',
    requiresLLM: false,
    exampleIntegrations: ['Asana', 'Jira', 'Linear', 'Monday.com', 'ClickUp'],
  },
  {
    category: 'procurement',
    displayName: 'Procurement & Vendor Management',
    description: 'Evaluate vendor proposals, flag contract renewal dates, and track purchase orders',
    availableStrategies: ['vendor_evaluation', 'contract_review'],
    defaultMaxTasksPerHour: 20,
    defaultMaxConcurrentTasks: 3,
    defaultEscalationConfidence: 0.8,
    riskProfile: 'high',
    requiresLLM: true,
    exampleIntegrations: ['SAP Ariba', 'Coupa', 'PandaDoc', 'Ironclad'],
  },
];

// ─── Ticket Priority Scoring ──────────────────────────────────

export interface TicketPriorityScore {
  taskId: string;
  priority: TaskPriority;
  urgencyScore: number;
  impactScore: number;
  overallScore: number;
  reasons: string[];
  suggestedAssignee?: string;
}

const URGENCY_KEYWORDS: Record<TaskPriority, string[]> = {
  critical: ['outage', 'down', 'breach', 'data loss', 'security incident', 'cannot access', 'production'],
  high: ['urgent', 'broken', 'blocker', 'deadline', 'escalation', 'asap', 'immediately'],
  medium: ['issue', 'problem', 'bug', 'not working', 'help', 'question'],
  low: ['feature request', 'suggestion', 'enhancement', 'nice to have', 'when possible'],
};

export function scoreTicketPriority(task: WorkforceTask): TicketPriorityScore {
  const text = `${task.title} ${task.description}`.toLowerCase();
  const reasons: string[] = [];
  let urgencyScore = 25;
  let impactScore = 25;

  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS) as [TaskPriority, string[]][]) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        const boosts: Record<TaskPriority, number> = { critical: 50, high: 35, medium: 15, low: 0 };
        urgencyScore = Math.max(urgencyScore, 25 + boosts[level]);
        reasons.push(`Keyword "${kw}" → ${level} urgency`);
        break;
      }
    }
  }

  if (task.deadlineAt) {
    const hoursUntilDeadline = (task.deadlineAt - Date.now()) / 3_600_000;
    if (hoursUntilDeadline < 1) {
      impactScore += 50;
      reasons.push('Deadline <1 hour away');
    } else if (hoursUntilDeadline < 4) {
      impactScore += 35;
      reasons.push('Deadline <4 hours away');
    } else if (hoursUntilDeadline < 24) {
      impactScore += 15;
      reasons.push('Deadline <24 hours away');
    }
  }

  if (task.retryCount > 0) {
    impactScore += Math.min(task.retryCount * 10, 30);
    reasons.push(`${task.retryCount} previous retries`);
  }

  const overallScore = clampScore(Math.round((urgencyScore + impactScore) / 2));

  let priority: TaskPriority = 'low';
  if (overallScore >= 70) priority = 'critical';
  else if (overallScore >= 50) priority = 'high';
  else if (overallScore >= 30) priority = 'medium';

  return {
    taskId: task.id,
    priority,
    urgencyScore: clampScore(urgencyScore),
    impactScore: clampScore(impactScore),
    overallScore,
    reasons,
  };
}

// ─── Lead Quality Scoring ─────────────────────────────────────

export interface LeadScore {
  taskId: string;
  qualityScore: number;
  signals: string[];
  tier: 'hot' | 'warm' | 'cold';
  recommendedAction: string;
}

export function scoreLeadQuality(task: WorkforceTask): LeadScore {
  const input = task.inputData as Record<string, any>;
  let score = 30;
  const signals: string[] = [];

  const employees = input.companySize ?? input.employees ?? 0;
  if (employees > 500) {
    score += 25;
    signals.push(`Enterprise (${employees} employees)`);
  } else if (employees > 50) {
    score += 15;
    signals.push(`Mid-market (${employees} employees)`);
  } else if (employees > 10) {
    score += 5;
    signals.push(`SMB (${employees} employees)`);
  }

  const budget = input.budget ?? input.estimatedBudget ?? 0;
  if (budget > 10_000) {
    score += 20;
    signals.push(`High budget ($${budget.toLocaleString()})`);
  } else if (budget > 1_000) {
    score += 10;
    signals.push(`Moderate budget ($${budget.toLocaleString()})`);
  }

  const touchpoints = input.touchpoints ?? input.interactions ?? 0;
  if (touchpoints > 5) {
    score += 15;
    signals.push(`High engagement (${touchpoints} touchpoints)`);
  } else if (touchpoints > 2) {
    score += 8;
    signals.push(`Moderate engagement (${touchpoints} touchpoints)`);
  }

  const source = String(input.source ?? '').toLowerCase();
  const highValueSources = ['referral', 'demo_request', 'inbound_call', 'partner'];
  if (highValueSources.includes(source)) {
    score += 15;
    signals.push(`High-value source: ${source}`);
  }

  score = clampScore(score);

  let tier: 'hot' | 'warm' | 'cold' = 'cold';
  if (score >= 70) tier = 'hot';
  else if (score >= 45) tier = 'warm';

  const actions: Record<'hot' | 'warm' | 'cold', string> = {
    hot: 'Assign to senior AE for immediate outreach',
    warm: 'Add to nurture sequence and schedule follow-up',
    cold: 'Add to marketing drip campaign',
  };

  return {
    taskId: task.id,
    qualityScore: score,
    signals,
    tier,
    recommendedAction: actions[tier],
  };
}

// ─── Document Classification ──────────────────────────────────

export type DocumentClass =
  | 'invoice'
  | 'contract'
  | 'receipt'
  | 'report'
  | 'correspondence'
  | 'form'
  | 'policy'
  | 'unknown';

export interface DocumentClassification {
  taskId: string;
  documentClass: DocumentClass;
  confidence: number;
  suggestedCategory: WorkforceCategory;
  suggestedStrategy: string;
  keywords: string[];
}

const DOCUMENT_PATTERNS: { cls: DocumentClass; keywords: string[]; category: WorkforceCategory; strategy: string }[] = [
  { cls: 'invoice', keywords: ['invoice', 'bill', 'amount due', 'payment terms', 'net 30', 'remit to', 'purchase order'], category: 'finance', strategy: 'invoice_processing' },
  { cls: 'contract', keywords: ['agreement', 'terms and conditions', 'hereby', 'whereas', 'party', 'effective date', 'termination'], category: 'procurement', strategy: 'contract_review' },
  { cls: 'receipt', keywords: ['receipt', 'total', 'paid', 'transaction', 'subtotal', 'tax'], category: 'finance', strategy: 'expense_reconciliation' },
  { cls: 'report', keywords: ['summary', 'findings', 'analysis', 'quarterly', 'annual', 'metrics', 'performance'], category: 'reporting', strategy: 'report_generation' },
  { cls: 'correspondence', keywords: ['dear', 'regards', 'sincerely', 'follow up', 'attached', 'response'], category: 'email_management', strategy: 'email_triage' },
  { cls: 'form', keywords: ['form', 'please fill', 'applicant', 'signature', 'date of birth'], category: 'hr', strategy: 'employee_onboarding' },
  { cls: 'policy', keywords: ['policy', 'regulation', 'compliance', 'standard', 'requirement', 'must comply'], category: 'compliance', strategy: 'compliance_monitoring' },
];

export function classifyDocument(task: WorkforceTask): DocumentClassification {
  const text = `${task.title} ${task.description} ${JSON.stringify(task.inputData)}`.toLowerCase();

  let bestMatch: (typeof DOCUMENT_PATTERNS)[0] | undefined;
  let bestHits = 0;
  const matchedKeywords: string[] = [];

  for (const pattern of DOCUMENT_PATTERNS) {
    let hits = 0;
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) {
        hits++;
        matchedKeywords.push(kw);
      }
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestMatch = pattern;
    }
  }

  const confidence = bestMatch
    ? clampScore(Math.round((bestHits / bestMatch.keywords.length) * 100)) / 100
    : 0;

  return {
    taskId: task.id,
    documentClass: bestMatch?.cls ?? 'unknown',
    confidence,
    suggestedCategory: bestMatch?.category ?? 'document_processing',
    suggestedStrategy: bestMatch?.strategy ?? 'document_classification',
    keywords: [...new Set(matchedKeywords)],
  };
}

// ─── Compliance Risk Assessment ───────────────────────────────

export interface ComplianceAssessment {
  taskId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: string[];
  deadlineDays?: number;
  requiresImmediateAction: boolean;
}

const COMPLIANCE_RED_FLAGS = [
  { pattern: 'gdpr', weight: 30, finding: 'GDPR-related compliance item' },
  { pattern: 'hipaa', weight: 35, finding: 'HIPAA-related compliance item' },
  { pattern: 'sox', weight: 30, finding: 'SOX-related compliance item' },
  { pattern: 'pci', weight: 25, finding: 'PCI-DSS-related compliance item' },
  { pattern: 'data breach', weight: 50, finding: 'Potential data breach detected' },
  { pattern: 'audit', weight: 20, finding: 'Audit action required' },
  { pattern: 'expired', weight: 25, finding: 'Expired certification or policy' },
  { pattern: 'overdue', weight: 30, finding: 'Overdue compliance deadline' },
  { pattern: 'violation', weight: 40, finding: 'Policy violation flagged' },
  { pattern: 'penalty', weight: 35, finding: 'Penalty risk identified' },
];

export function assessComplianceRisk(task: WorkforceTask): ComplianceAssessment {
  const text = `${task.title} ${task.description} ${JSON.stringify(task.inputData)}`.toLowerCase();
  let riskScore = 0;
  const findings: string[] = [];

  for (const flag of COMPLIANCE_RED_FLAGS) {
    if (text.includes(flag.pattern)) {
      riskScore += flag.weight;
      findings.push(flag.finding);
    }
  }

  let deadlineDays: number | undefined;
  if (task.deadlineAt) {
    deadlineDays = Math.ceil((task.deadlineAt - Date.now()) / 86_400_000);
    if (deadlineDays < 0) {
      riskScore += 40;
      findings.push(`Deadline passed ${Math.abs(deadlineDays)} days ago`);
    } else if (deadlineDays < 3) {
      riskScore += 25;
      findings.push(`Deadline in ${deadlineDays} days`);
    } else if (deadlineDays < 14) {
      riskScore += 10;
      findings.push(`Deadline in ${deadlineDays} days`);
    }
  }

  riskScore = clampScore(riskScore);

  let riskLevel: RiskLevel = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';

  return {
    taskId: task.id,
    riskScore,
    riskLevel,
    findings,
    deadlineDays,
    requiresImmediateAction: riskLevel === 'critical' || (deadlineDays !== undefined && deadlineDays < 1),
  };
}

// ─── Schedule Optimization ────────────────────────────────────

export interface ShiftSlot {
  day: number;
  startHour: number;
  endHour: number;
  requiredStaff: number;
  assignedStaff: string[];
}

export interface ScheduleGap {
  day: number;
  startHour: number;
  endHour: number;
  shortfall: number;
}

export function findScheduleGaps(slots: ShiftSlot[]): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];
  for (const slot of slots) {
    const shortfall = slot.requiredStaff - slot.assignedStaff.length;
    if (shortfall > 0) {
      gaps.push({
        day: slot.day,
        startHour: slot.startHour,
        endHour: slot.endHour,
        shortfall,
      });
    }
  }
  return gaps.sort((a, b) => b.shortfall - a.shortfall);
}

// ─── Invoice Line Extraction ──────────────────────────────────

export interface ExtractedInvoice {
  vendorName: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate?: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  confidence: number;
}

export function parseInvoiceText(rawText: string): ExtractedInvoice {
  const text = rawText.trim();
  let confidence = 0.3;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const vendorName = lines[0] ?? 'Unknown Vendor';

  const invoiceMatch = text.match(/invoice\s*#?\s*[:.]?\s*([A-Z0-9-]+)/i);
  const invoiceNumber = invoiceMatch?.[1] ?? 'UNKNOWN';
  if (invoiceMatch) confidence += 0.15;

  const totalMatch = text.match(/total\s*[:.]?\s*\$?([\d,]+\.?\d*)/i);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;
  if (totalMatch) confidence += 0.2;

  const dueDateMatch = text.match(/due\s*(?:date)?\s*[:.]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/i);
  const dueDate = dueDateMatch?.[1];
  if (dueDate) confidence += 0.1;

  const hasDollar = text.includes('$') || text.toLowerCase().includes('usd');
  const hasEuro = text.includes('€') || text.toLowerCase().includes('eur');
  const currency = hasEuro ? 'EUR' : 'USD';
  if (hasDollar || hasEuro) confidence += 0.05;

  return {
    vendorName,
    invoiceNumber,
    totalAmount,
    currency,
    dueDate,
    lineItems: [],
    confidence: Math.min(confidence, 1),
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

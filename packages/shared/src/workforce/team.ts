// ─── FILE: packages/shared/src/workforce/team.ts ───

import type { WorkforceCategory } from '../index.js';

// ─── Industry Type ────────────────────────────────────────────

/** The business vertical this workforce team operates in. Drives playbook selection and coaching tips. */
export type WorkforceIndustry =
  | 'saas'
  | 'ecommerce'
  | 'healthcare'
  | 'legal'
  | 'real_estate'
  | 'manufacturing'
  | 'retail'
  | 'finance_services'
  | 'marketing_agency'
  | 'general';

// ─── Interfaces ───────────────────────────────────────────────

/**
 * Top-level configuration for a multi-category workforce team.
 * Drives briefing cadence, report scheduling, and privacy posture.
 */
export interface WorkforceTeamConfig {
  /** Human-readable name for this team (e.g. "Acme Ops Team"). */
  teamName: string;
  /** Industry vertical — selects the coaching playbook. */
  industry: WorkforceIndustry;
  /** Which workforce categories are active on this team. */
  activeBotCategories: WorkforceCategory[];
  /** The category that acts as coordinator / lead for cross-category escalations. */
  teamLeaderCategory: WorkforceCategory;
  /** How often briefings are generated, in hours. Default 24. */
  coachingIntervalHours: number;
  /** Granularity of periodic reports. */
  reportingSchedule: 'daily' | 'weekly' | 'monthly';
  /**
   * When true, anonymised outcome statistics can be contributed to
   * cross-tenant federated learning (opt-in).
   */
  federatedLearningEnabled: boolean;
  /**
   * Data-handling posture.
   * - `standard`       – GDPR-compatible defaults
   * - `strict`         – PII is never stored in learning state
   * - `hipaa_compliant`– PHI controls; healthcare tenants must use this
   * - `sox_compliant`  – Financial audit trails; finance tenants must use this
   */
  privacyMode: 'standard' | 'strict' | 'hipaa_compliant' | 'sox_compliant';
}

/**
 * Performance snapshot for a single category within a team briefing.
 */
export interface TeamBriefingItem {
  /** The workforce category this item describes. */
  category: WorkforceCategory;
  /** Plain-English summary of what the category accomplished this interval. */
  summary: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksEscalated: number;
  /** Mean confidence score across all tasks processed (0–1). */
  avgConfidence: number;
  /** Most frequently recurring issue type this interval, if any. */
  topIssue?: string;
  /** Actionable coaching recommendation drawn from the industry playbook. */
  recommendation: string;
}

/**
 * A point-in-time briefing across all active categories in a team.
 */
export interface TeamBriefing {
  /** Unix ms timestamp when this briefing was generated. */
  timestamp: number;
  industry: WorkforceIndustry;
  /** One item per active bot category. */
  briefingItems: TeamBriefingItem[];
  /** Insights that span multiple categories (e.g. "finance backlog is causing procurement delays"). */
  crossCategoryInsights: string[];
  /** Items requiring immediate human attention before the next briefing. */
  urgentActionItems: string[];
  /**
   * Composite team health score 0–100.
   * Weighted average of category success rates adjusted for escalation rate and avg confidence.
   */
  teamHealthScore: number;
  /** Timestamp of the next scheduled briefing (ms). */
  nextBriefingAt: number;
}

/**
 * Aggregated report produced from multiple TeamBriefings for a given period.
 */
export interface TeamReport {
  period: 'daily' | 'weekly' | 'monthly';
  /** Unix ms timestamp when this report was generated. */
  generatedAt: number;
  /**
   * Narrative summary suitable for a C-suite email or Slack digest.
   * Describes throughput, highlights, and headline recommendations.
   */
  executiveSummary: string;
  totalTasksProcessed: number;
  /**
   * Natural-language description of value delivered
   * (e.g. "Saved ~14 hours of manual triage across support and finance").
   */
  totalValueDelivered: string;
  /** Per-category breakdown of key metrics. */
  categoryBreakdown: Record<
    string,
    {
      tasksCompleted: number;
      tasksFailed: number;
      tasksEscalated: number;
      avgConfidence: number;
      successRate: number;
    }
  >;
  /** Top actionable recommendations (max 5), ranked by potential impact. */
  topRecommendations: string[];
  /** Risk flags that should be reviewed by team leadership. */
  riskFlags: string[];
}

// ─── Industry Playbooks ───────────────────────────────────────

/**
 * Domain-specific coaching tips indexed by [industry][category].
 * Each tip is injected into TeamBriefingItem.recommendation to give
 * operators context-aware guidance rather than generic advice.
 */
export const INDUSTRY_PLAYBOOKS: Record<WorkforceIndustry, Record<WorkforceCategory, string>> = {
  saas: {
    customer_support:
      'Route churn-risk tickets (users on trial or past due) to a senior rep within 15 min; attach NPS scores to context.',
    sales_crm:
      'Weight product-qualified leads (PQLs) — users who triggered key in-app events — above form-fill leads; enrich with usage data.',
    finance:
      'Automate MRR/ARR recognition entries; flag any invoice where contract term does not match recognised period.',
    hr:
      'Automate equipment provisioning and role-based access requests on day-0 onboarding to eliminate activation lag.',
    document_processing:
      'Extract SLA clauses from customer contracts and sync expiry dates to the compliance calendar automatically.',
    email_management:
      'Tag inbound email by product area (billing, technical, account) to route directly to the right squad inbox.',
    scheduling:
      'Block focus time for engineering squads automatically; treat calendar fragmentation as a productivity metric.',
    compliance:
      'Track SOC 2 evidence collection deadlines; auto-generate control test reminders 30 and 7 days in advance.',
    it_ops:
      'Monitor deploy pipelines and feature-flag overrides; alert when error rate exceeds 0.5 % in the 5-min window post-deploy.',
    reporting:
      'Deliver a weekly self-serve metrics digest per squad (feature adoption, ticket volume, churn signals) on Monday AM.',
    project_management:
      'Flag sprint scope creep when ticket count grows >20 % after planning; surface blockers to the PM daily.',
    procurement:
      'Centralise SaaS subscriptions; flag duplicate tools across departments and surface cost-consolidation opportunities.',
  },
  ecommerce: {
    customer_support:
      'Prioritise "where is my order" tickets by days-since-ship; auto-close resolved shipment queries after 48 h.',
    sales_crm:
      'Score returning customers by lifetime value and purchase frequency; target win-back campaigns to 90-day-lapsed buyers.',
    finance:
      'Reconcile daily settlement reports from payment gateways against order management system totals before close.',
    hr:
      'Scale warehouse shift schedules automatically based on pick-rate forecasts and seasonal demand curves.',
    document_processing:
      'Process carrier invoices and proof-of-delivery scans automatically; flag any discrepancy >$50 for human review.',
    email_management:
      'Route post-purchase emails (delivery confirmations, review requests, refund queries) to purpose-built templates.',
    scheduling:
      'Coordinate supplier delivery windows with warehouse team capacity; surface conflicts 72 h in advance.',
    compliance:
      'Monitor product listings for prohibited items, country-of-origin labelling requirements, and GDPR data requests.',
    it_ops:
      'Alert on cart-abandonment rate spikes or checkout error rate above 1 % — these are revenue leaks in real time.',
    reporting:
      'Produce daily GMV, AOV, and returns dashboards segmented by channel (organic, paid, marketplace) before 8 AM.',
    project_management:
      'Track seasonal campaign milestones with hard deadlines; escalate any task slipping within 5 days of go-live.',
    procurement:
      'Monitor key supplier lead times; trigger safety-stock reorder alerts before stockout probability exceeds 15 %.',
  },
  healthcare: {
    customer_support:
      'Route clinical queries to licensed staff only; flag any message containing symptom descriptions for mandatory human review.',
    sales_crm:
      'Segment outreach by provider type (GP, specialist, hospital system); track formulary decision timelines per account.',
    finance:
      'Automate prior-authorisation tracking and denial management; reconcile EOB documents against expected reimbursements.',
    hr:
      'Enforce licence expiry tracking for all clinical staff; surface renewal reminders 90, 60, and 30 days out.',
    document_processing:
      'Apply HIPAA-compliant OCR pipelines for intake forms; de-identify PHI before passing to any non-clinical system.',
    email_management:
      'Separate patient communications from internal clinical communications and apply secure-messaging compliance controls.',
    scheduling:
      'Optimise appointment slot utilisation based on provider availability and patient appointment-type duration averages.',
    compliance:
      'Execute daily HIPAA risk assessment checks; log all PHI access events and surface anomalies within 15 min.',
    it_ops:
      'Monitor EHR system uptime and HL7/FHIR API latency; clinical workflows depend on <2 s response times.',
    reporting:
      'Generate daily patient-flow and bed-utilisation reports; distribute to department heads before morning huddle.',
    project_management:
      'Manage clinical trial milestones against protocol timelines; flag any deviation for IRB notification assessment.',
    procurement:
      'Track medical supply par levels and expiry dates; flag critical consumables with <7-day supply automatically.',
  },
  legal: {
    customer_support:
      'Triage client enquiries by matter type and urgency; never auto-respond to anything that could be construed as legal advice.',
    sales_crm:
      'Score inbound leads by practice-area fit and case value estimate; track referral source attribution for business development.',
    finance:
      'Automate time-entry reminders for unbilled matters; alert when WIP age exceeds billing cycle thresholds by fee earner.',
    hr:
      'Track CPD/CLE hours per qualified professional; automate recertification reminders well in advance of bar deadlines.',
    document_processing:
      'Extract key dates (hearing, filing, expiry) from court documents and sync to matter calendars without human re-entry.',
    email_management:
      'Tag client email by matter number; apply legal hold flags automatically when matters move to litigation status.',
    scheduling:
      'Coordinate court dates, deposition schedules, and internal prep sessions; surface conflicts across all timekeepers.',
    compliance:
      'Monitor conflicts-of-interest database on new matter intake; flag any potential conflict for partner-level sign-off.',
    it_ops:
      'Monitor case management system and e-discovery platform SLAs; high-stakes deadlines have zero tolerance for outages.',
    reporting:
      'Generate weekly aged WIP, realization rate, and utilization reports per practice group for management review.',
    project_management:
      'Track each matter as a project with milestones; surface fee-cap burn rate to the responsible partner weekly.',
    procurement:
      'Review external counsel spend against agreed AFAs; flag any overage for billing partner review before invoice approval.',
  },
  real_estate: {
    customer_support:
      'Respond to property enquiries within 5 min during business hours; include next-available showing slot in the first reply.',
    sales_crm:
      'Score buyer leads by financial pre-qualification status, search criteria match rate, and days-on-market urgency signal.',
    finance:
      'Track commission pipelines by deal stage; reconcile escrow account balances and flag any discrepancy same-day.',
    hr:
      'Manage agent licence renewal dates and continuing education requirements; automate reminders 60 days before expiry.',
    document_processing:
      'Extract key terms (price, contingencies, closing date, earnest money) from purchase agreements for CRM auto-population.',
    email_management:
      'Route listing enquiries by property and assign to the listing agent; ensure no lead goes uncontacted for >30 min.',
    scheduling:
      'Automate showing appointment booking with confirmation and reminder sequences 24 h and 1 h before each showing.',
    compliance:
      'Monitor fair housing compliance in all listing descriptions and marketing copy; flag prohibited phrasing automatically.',
    it_ops:
      'Monitor MLS feed sync health; stale listings (>30 min behind MLS) directly cost agent credibility and leads.',
    reporting:
      'Produce weekly pipeline velocity reports (days-to-offer, days-to-close) and market-share dashboards per territory.',
    project_management:
      'Track each transaction as a project with closing-date milestone; escalate any contingency deadline within 48 h of expiry.',
    procurement:
      'Manage preferred-vendor lists (inspectors, title companies, contractors); track NPS scores per vendor engagement.',
  },
  manufacturing: {
    customer_support:
      'Prioritise tickets related to machine downtime or safety issues as critical; route to field-service dispatch immediately.',
    sales_crm:
      'Score OEM and distributor accounts by reorder frequency and contract size; flag accounts with declining order velocity.',
    finance:
      'Automate job-cost variance reporting; flag any production order where actual cost exceeds estimate by >5 %.',
    hr:
      'Optimise shift patterns against production schedules and skills matrices; surface overtime risk before it occurs.',
    document_processing:
      'Extract BOM changes, ECO approvals, and inspection reports from ERP uploads; route deviations to quality control.',
    email_management:
      'Triage supplier emails by urgency: expedite requests and shipment delays are high-priority and route to procurement.',
    scheduling:
      'Align maintenance windows with production downtime plans; surface scheduling conflicts with shift rosters in advance.',
    compliance:
      'Track ISO 9001 / ISO 14001 audit schedules and CAPA deadlines; never allow a corrective action to go past due.',
    it_ops:
      'Monitor SCADA and MES connectivity; alert on OEE drops >5 % below baseline within the current shift window.',
    reporting:
      'Deliver shift-end OEE, scrap rate, and throughput dashboards to plant management before the next shift begins.',
    project_management:
      'Track NPI (new product introduction) milestones against tooling and qualification timelines; surface critical-path risks.',
    procurement:
      'Monitor supplier on-time delivery rates and quality rejection rates; auto-qualify alternatives when KPIs fall below threshold.',
  },
  retail: {
    customer_support:
      'Tag tickets by store location to surface regional patterns; route loyalty-programme issues to a dedicated resolution queue.',
    sales_crm:
      'Score loyalty members by recency, frequency, and monetary value (RFM); trigger win-back flows at 60-day lapse.',
    finance:
      'Reconcile daily POS totals against bank deposits by store; auto-flag cash-handling discrepancies for loss-prevention review.',
    hr:
      'Build compliant schedules that match foot-traffic forecasts to staffing levels; surface predictive scheduling law conflicts.',
    document_processing:
      'Process supplier invoices and goods-received notes automatically; match to purchase orders and flag three-way mismatches.',
    email_management:
      'Route customer emails to store-level inboxes based on location keyword detection; ensure sub-4-hour response SLA.',
    scheduling:
      'Schedule promotional floor resets and stockroom counts outside peak trading hours based on traffic-density data.',
    compliance:
      'Monitor price-accuracy programme compliance across store locations; auto-generate corrective-action tickets on failures.',
    it_ops:
      'Monitor POS terminal health in real time; a downed terminal during peak hours has direct, measurable revenue impact.',
    reporting:
      'Produce daily sales-vs-plan reports at store and department level; flag any store tracking >5 % below plan.',
    project_management:
      'Track seasonal resets and planogram rollouts against target-completion dates; escalate delays to district managers.',
    procurement:
      'Monitor markdowns on slow-moving SKUs; trigger clearance pricing workflows when weeks-of-supply exceed threshold.',
  },
  finance_services: {
    customer_support:
      'Route high-net-worth client enquiries to relationship managers instantly; apply 15-min SLA for any transaction dispute.',
    sales_crm:
      'Score prospects by AUM potential, product fit, and referral source; apply Reg BI suitability flags before any outreach.',
    finance:
      'Automate daily NAV reconciliation, fee accruals, and management-fee invoice generation; escalate any discrepancy >$0.',
    hr:
      'Track FINRA licence registrations and Series exam renewals; add mandatory compliance training completions to onboarding.',
    document_processing:
      'Extract and classify KYC/AML documentation; flag expiring ID documents for renewal 90 days before deadline.',
    email_management:
      'Apply SEC/FINRA email archiving rules to all client communications; flag any non-compliant phrasing for review.',
    scheduling:
      'Coordinate earnings call participation, client annual reviews, and regulatory exam prep slots across the advisory team.',
    compliance:
      'Run continuous transaction monitoring for AML red flags; escalate suspicious activity reports (SARs) within mandated timelines.',
    it_ops:
      'Monitor trading system latency and market-data feed quality; alert when any feed is >500 ms behind benchmark.',
    reporting:
      'Deliver daily P&L attribution, risk-factor exposure, and regulatory capital reports before market open.',
    project_management:
      'Track regulatory change implementations (e.g. new Reg updates) with legal-deadline milestones and accountability owners.',
    procurement:
      'Manage data-vendor contracts (Bloomberg, Refinitiv); benchmark pricing at renewal and track data-quality SLAs.',
  },
  marketing_agency: {
    customer_support:
      'Triage client portal requests by campaign-flight urgency; client-facing deliverables trump internal process tickets.',
    sales_crm:
      'Score inbound RFPs by vertical fit, retainer potential, and projected margin; flag low-margin engagements before proposal.',
    finance:
      'Automate media-spend reconciliation against insertion orders; flag any line item >5 % over authorised budget same-day.',
    hr:
      'Match freelance creative capacity to campaign calendars; surface resource-gap alerts 2 weeks before deliverable due dates.',
    document_processing:
      'Extract deliverable specs and deadlines from signed SOWs; auto-populate project briefs and creative-asset checklists.',
    email_management:
      'Parse client feedback emails to extract revision requests; tag by campaign, assign to account manager, log version number.',
    scheduling:
      'Coordinate content production calendars across creative, media, and analytics; build in approval buffers for each milestone.',
    compliance:
      'Scan ad copy for platform policy violations, claim substantiation requirements, and regulatory copy rules (pharma, finance).',
    it_ops:
      'Monitor ad-serving platforms for delivery pacing anomalies; under-pacing on paid campaigns has direct client impact.',
    reporting:
      'Auto-generate weekly campaign performance reports (CTR, CPC, ROAS, conversions) by client before Monday briefings.',
    project_management:
      'Track campaign launch dependencies (assets, approvals, tags, budgets) with go-live gate-check automation.',
    procurement:
      'Manage media vendor relationships and insertion order commitments; track make-good credits from under-delivering publishers.',
  },
  general: {
    customer_support:
      'Establish response SLAs by priority tier (critical <1 h, high <4 h, medium <24 h); track adherence weekly.',
    sales_crm:
      'Ensure all inbound leads are contacted within 1 hour; implement a structured follow-up cadence for unresponsive prospects.',
    finance:
      'Automate recurring AP/AR entries and flag any invoice outstanding >30 days for collections escalation.',
    hr:
      'Standardise onboarding and offboarding checklists; automate access provisioning and deprovisioning to improve security.',
    document_processing:
      'Centralise all inbound documents into a single intake queue; eliminate email-based document routing.',
    email_management:
      'Implement inbox-zero triage: tag, route, and draft replies for all actionable emails within one business day.',
    scheduling:
      'Audit meeting load per team member weekly; surface scheduling inefficiencies and recommend async alternatives.',
    compliance:
      'Maintain a living compliance calendar covering all regulatory deadlines; never allow a filing date to go unmonitored.',
    it_ops:
      'Define uptime and latency SLAs for all critical business systems; alert immediately on any SLA breach.',
    reporting:
      'Produce a consistent weekly operations dashboard covering throughput, quality, and cost KPIs for leadership review.',
    project_management:
      'Ensure every project has an owner, a deadline, and a defined escalation path; review open items weekly.',
    procurement:
      'Centralise vendor contacts and contract renewal dates; review all renewals 90 days in advance to retain negotiating leverage.',
  },
};

// ─── Helper Functions (private) ──────────────────────────────

/** Clamps a number to [0, 100]. */
function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Converts raw category metrics into a 0–100 performance score.
 *
 * Formula:
 *   successRate   = completed / (completed + failed), clamped [0,1]
 *   escalateRate  = escalated / (completed + failed + escalated), clamped [0,1]
 *   avgConf       = avgConfidence clamped [0,1]
 *   score = (successRate * 50) + (avgConf * 30) + ((1 - escalateRate) * 20)
 */
function categoryScore(metrics: {
  tasksCompleted: number;
  tasksFailed: number;
  tasksEscalated: number;
  avgConfidence: number;
}): number {
  const total = metrics.tasksCompleted + metrics.tasksFailed + metrics.tasksEscalated;
  if (total === 0) return 100; // no tasks = no failures

  const successRate = metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed || 1);
  const escalateRate = metrics.tasksEscalated / total;
  const conf = Math.min(1, Math.max(0, metrics.avgConfidence));

  return clamp100(
    Math.round(successRate * 50 + conf * 30 + (1 - escalateRate) * 20),
  );
}

/** Identifies cross-category bottleneck insights based on metric patterns. */
function deriveCrossCategoryInsights(
  items: TeamBriefingItem[],
  config: WorkforceTeamConfig,
): string[] {
  const insights: string[] = [];

  const failing = items.filter(
    (i) => i.tasksFailed > 0 && i.tasksFailed / Math.max(i.tasksCompleted + i.tasksFailed, 1) > 0.2,
  );

  if (failing.length > 1) {
    insights.push(
      `Multiple categories (${failing.map((i) => i.category).join(', ')}) have >20 % failure rates — consider reviewing shared data dependencies or integration health.`,
    );
  }

  const escalated = items.filter((i) => i.tasksEscalated > 5);
  if (escalated.length > 0 && config.teamLeaderCategory) {
    insights.push(
      `High escalation volume in ${escalated.map((i) => i.category).join(', ')} is likely routing to ${config.teamLeaderCategory} — verify the team leader category has adequate capacity.`,
    );
  }

  const lowConf = items.filter((i) => i.avgConfidence < 0.6 && i.tasksCompleted + i.tasksFailed > 0);
  if (lowConf.length > 0) {
    insights.push(
      `Low average confidence in ${lowConf.map((i) => i.category).join(', ')} — consider enabling LLM augmentation or reducing task scope per bot.`,
    );
  }

  return insights;
}

/** Returns urgent action items that need human attention before the next briefing. */
function deriveUrgentActions(items: TeamBriefingItem[]): string[] {
  const actions: string[] = [];

  for (const item of items) {
    const total = item.tasksCompleted + item.tasksFailed;
    if (total > 0 && item.tasksFailed / total > 0.4) {
      actions.push(
        `[${item.category}] Failure rate is ${Math.round((item.tasksFailed / total) * 100)} % — investigate and pause automation if root cause is unknown.`,
      );
    }
    if (item.avgConfidence < 0.5 && total > 0) {
      actions.push(
        `[${item.category}] Average confidence critically low (${(item.avgConfidence * 100).toFixed(0)} %) — review model inputs and escalation thresholds.`,
      );
    }
    if (item.tasksEscalated > 10) {
      actions.push(
        `[${item.category}] ${item.tasksEscalated} tasks escalated this interval — check escalation queue for unresolved items.`,
      );
    }
  }

  return actions;
}

// ─── Public Functions ─────────────────────────────────────────

/**
 * Generates a team briefing snapshot for all active bot categories.
 *
 * - Computes per-category performance scores.
 * - Derives a weighted team health score (0–100).
 * - Applies industry playbook coaching recommendations.
 * - Identifies cross-category bottlenecks and urgent action items.
 * - Schedules the next briefing timestamp.
 *
 * @param config         Team configuration (industry, categories, coaching interval, etc.)
 * @param categoryMetrics  Latest task metrics keyed by WorkforceCategory.
 * @returns A complete TeamBriefing snapshot.
 */
export function generateTeamBriefing(
  config: WorkforceTeamConfig,
  categoryMetrics: Record<
    WorkforceCategory,
    {
      tasksCompleted: number;
      tasksFailed: number;
      tasksEscalated: number;
      avgConfidence: number;
      topIssue?: string;
    }
  >,
): TeamBriefing {
  const now = Date.now();
  const playbook = INDUSTRY_PLAYBOOKS[config.industry];

  const briefingItems: TeamBriefingItem[] = config.activeBotCategories.map((category) => {
    const m = categoryMetrics[category] ?? {
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksEscalated: 0,
      avgConfidence: 1,
    };

    const total = m.tasksCompleted + m.tasksFailed + m.tasksEscalated;
    const summaryParts: string[] = [];
    if (total === 0) {
      summaryParts.push('No tasks processed this interval.');
    } else {
      summaryParts.push(`Processed ${total} task${total !== 1 ? 's' : ''}.`);
      if (m.tasksCompleted > 0) summaryParts.push(`${m.tasksCompleted} completed.`);
      if (m.tasksFailed > 0) summaryParts.push(`${m.tasksFailed} failed.`);
      if (m.tasksEscalated > 0) summaryParts.push(`${m.tasksEscalated} escalated.`);
      summaryParts.push(`Avg confidence: ${(m.avgConfidence * 100).toFixed(1)} %.`);
    }

    return {
      category,
      summary: summaryParts.join(' '),
      tasksCompleted: m.tasksCompleted,
      tasksFailed: m.tasksFailed,
      tasksEscalated: m.tasksEscalated,
      avgConfidence: m.avgConfidence,
      topIssue: m.topIssue,
      recommendation: playbook[category],
    };
  });

  // Team health = weighted average category score (weight by task volume)
  let totalWeight = 0;
  let weightedScoreSum = 0;
  for (const item of briefingItems) {
    const volume = item.tasksCompleted + item.tasksFailed + item.tasksEscalated;
    const weight = Math.max(volume, 1); // ensure inactive categories have weight 1
    const score = categoryScore(item);
    weightedScoreSum += score * weight;
    totalWeight += weight;
  }
  const teamHealthScore = clamp100(Math.round(weightedScoreSum / Math.max(totalWeight, 1)));

  const crossCategoryInsights = deriveCrossCategoryInsights(briefingItems, config);
  const urgentActionItems = deriveUrgentActions(briefingItems);

  return {
    timestamp: now,
    industry: config.industry,
    briefingItems,
    crossCategoryInsights,
    urgentActionItems,
    teamHealthScore,
    nextBriefingAt: now + config.coachingIntervalHours * 3_600_000,
  };
}

/**
 * Aggregates multiple TeamBriefings into a structured period report.
 *
 * - Sums task counts across all briefings.
 * - Computes per-category aggregate success rates.
 * - Surfaces the top 5 unique recommendations by frequency.
 * - Flags categories with sustained high failure or escalation rates.
 * - Produces an executive summary suitable for a leadership Slack digest.
 *
 * @param config      Team configuration (provides industry and team metadata).
 * @param briefings   Array of TeamBriefing objects covering the period.
 * @param periodDays  Calendar days covered (used for value estimation language).
 * @returns A TeamReport covering the supplied briefings.
 */
export function generateTeamReport(
  config: WorkforceTeamConfig,
  briefings: TeamBriefing[],
  periodDays: number,
): TeamReport {
  const now = Date.now();

  // Aggregate per-category totals across all briefings
  const catTotals: Record<
    string,
    { tasksCompleted: number; tasksFailed: number; tasksEscalated: number; confSum: number; confCount: number }
  > = {};

  for (const briefing of briefings) {
    for (const item of briefing.briefingItems) {
      if (!catTotals[item.category]) {
        catTotals[item.category] = {
          tasksCompleted: 0,
          tasksFailed: 0,
          tasksEscalated: 0,
          confSum: 0,
          confCount: 0,
        };
      }
      const t = catTotals[item.category];
      t.tasksCompleted += item.tasksCompleted;
      t.tasksFailed += item.tasksFailed;
      t.tasksEscalated += item.tasksEscalated;
      t.confSum += item.avgConfidence;
      t.confCount += 1;
    }
  }

  const categoryBreakdown: TeamReport['categoryBreakdown'] = {};
  let grandTotal = 0;

  for (const [cat, t] of Object.entries(catTotals)) {
    const totalDone = t.tasksCompleted + t.tasksFailed;
    const successRate = totalDone > 0 ? t.tasksCompleted / totalDone : 1;
    const avgConfidence = t.confCount > 0 ? t.confSum / t.confCount : 1;
    categoryBreakdown[cat] = {
      tasksCompleted: t.tasksCompleted,
      tasksFailed: t.tasksFailed,
      tasksEscalated: t.tasksEscalated,
      avgConfidence: Math.round(avgConfidence * 1000) / 1000,
      successRate: Math.round(successRate * 1000) / 1000,
    };
    grandTotal += t.tasksCompleted + t.tasksFailed + t.tasksEscalated;
  }

  // Collect and rank recommendations by frequency across all briefing items
  const recFreq = new Map<string, number>();
  for (const briefing of briefings) {
    for (const item of briefing.briefingItems) {
      recFreq.set(item.recommendation, (recFreq.get(item.recommendation) ?? 0) + 1);
    }
    for (const insight of briefing.crossCategoryInsights) {
      recFreq.set(insight, (recFreq.get(insight) ?? 0) + 1);
    }
  }
  const topRecommendations = Array.from(recFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rec]) => rec);

  // Risk flags: categories with sustained failure or escalation issues
  const riskFlags: string[] = [];
  for (const [cat, t] of Object.entries(catTotals)) {
    const totalDone = t.tasksCompleted + t.tasksFailed;
    if (totalDone > 0 && t.tasksFailed / totalDone > 0.3) {
      riskFlags.push(
        `[${cat}] Sustained failure rate of ${Math.round((t.tasksFailed / totalDone) * 100)} % over the ${periodDays}-day period — requires root-cause investigation.`,
      );
    }
    if (t.tasksEscalated > 0 && t.tasksEscalated / (totalDone + t.tasksEscalated) > 0.25) {
      riskFlags.push(
        `[${cat}] ${t.tasksEscalated} escalations (${Math.round((t.tasksEscalated / (totalDone + t.tasksEscalated)) * 100)} % of volume) — automation confidence may be miscalibrated.`,
      );
    }
    if (t.confCount > 0 && t.confSum / t.confCount < 0.55) {
      riskFlags.push(
        `[${cat}] Average model confidence below 55 % across the period — review training data or escalation thresholds.`,
      );
    }
  }

  // Estimate hours saved (rough heuristic: ~3 min of manual work per completed task)
  const estimatedHoursSaved = Math.round((grandTotal * 3) / 60);
  const totalValueDelivered =
    estimatedHoursSaved > 0
      ? `Saved an estimated ${estimatedHoursSaved} hours of manual work across ${config.activeBotCategories.length} category${config.activeBotCategories.length !== 1 ? 'ies' : 'y'} over the ${periodDays}-day period.`
      : 'No completed tasks recorded for this period.';

  // Determine period label
  const periodLabel = config.reportingSchedule;

  // Compute average team health across all briefings
  const avgHealth =
    briefings.length > 0
      ? Math.round(briefings.reduce((sum, b) => sum + b.teamHealthScore, 0) / briefings.length)
      : 100;

  const executiveSummary =
    `${config.teamName} processed ${grandTotal.toLocaleString()} tasks across ` +
    `${Object.keys(categoryBreakdown).length} active categories during this ${periodLabel} period. ` +
    `Team health averaged ${avgHealth}/100. ` +
    totalValueDelivered +
    (riskFlags.length > 0 ? ` ${riskFlags.length} risk flag${riskFlags.length !== 1 ? 's' : ''} identified — see risk flags section.` : ' No critical risk flags.');

  return {
    period: config.reportingSchedule,
    generatedAt: now,
    executiveSummary,
    totalTasksProcessed: grandTotal,
    totalValueDelivered,
    categoryBreakdown,
    topRecommendations,
    riskFlags,
  };
}

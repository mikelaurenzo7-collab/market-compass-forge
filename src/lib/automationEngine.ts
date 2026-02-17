// ── Workflow Automation Engine ─────────────────────────────────────────
// The feature DealCloud charges $50k/yr for. We're building it as a moat.

export type TriggerType =
  | "deal_stage_change"
  | "document_uploaded"
  | "task_completed"
  | "deal_added"
  | "comment_posted"
  | "vote_submitted"
  | "alert_triggered"
  | "intro_requested"
  | "meeting_scheduled";

export type ActionType =
  | "send_slack"
  | "create_task"
  | "send_email"
  | "update_deal_field"
  | "move_stage"
  | "add_to_watchlist"
  | "generate_memo"
  | "notify_team"
  | "log_decision"
  | "sync_crm";

export interface TriggerCondition {
  field: string;       // e.g. "new_stage", "document_type", "sector"
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";
  value: string | number | string[];
}

export interface AutomationTrigger {
  type: TriggerType;
  conditions: TriggerCondition[];
}

export interface AutomationAction {
  type: ActionType;
  config: Record<string, any>;
  delay_minutes?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
  created_at: string;
  run_count: number;
  last_run: string | null;
  template_id?: string;
}

// ── Trigger definitions for the UI ─────────────────────────────────────
export const TRIGGER_DEFINITIONS: Record<TriggerType, { label: string; description: string; icon: string; fields: string[] }> = {
  deal_stage_change: {
    label: "Deal Stage Change",
    description: "Fires when a deal moves to a new stage",
    icon: "ArrowRightCircle",
    fields: ["new_stage", "previous_stage", "company_name", "sector"],
  },
  document_uploaded: {
    label: "Document Uploaded",
    description: "Fires when a document is added to a deal room",
    icon: "Upload",
    fields: ["document_type", "company_name", "file_name"],
  },
  task_completed: {
    label: "Task Completed",
    description: "Fires when a pipeline task is marked done",
    icon: "CheckCircle",
    fields: ["task_title", "deal_id", "assignee"],
  },
  deal_added: {
    label: "New Deal Added",
    description: "Fires when a new deal enters the pipeline",
    icon: "PlusCircle",
    fields: ["company_name", "sector", "stage", "source"],
  },
  comment_posted: {
    label: "Comment Posted",
    description: "Fires when someone comments on a deal",
    icon: "MessageSquare",
    fields: ["deal_id", "author", "content"],
  },
  vote_submitted: {
    label: "Vote Submitted",
    description: "Fires when an IC vote is cast",
    icon: "Vote",
    fields: ["deal_id", "vote", "voter"],
  },
  alert_triggered: {
    label: "Alert Triggered",
    description: "Fires when a market or deal alert fires",
    icon: "Bell",
    fields: ["alert_name", "severity", "title"],
  },
  intro_requested: {
    label: "Intro Requested",
    description: "Fires when a warm intro is requested",
    icon: "UserPlus",
    fields: ["entity_name", "entity_type", "message"],
  },
  meeting_scheduled: {
    label: "Meeting Scheduled",
    description: "Fires when a deal-related meeting is booked",
    icon: "Calendar",
    fields: ["deal_id", "meeting_type", "attendees"],
  },
};

// ── Action definitions for the UI ──────────────────────────────────────
export const ACTION_DEFINITIONS: Record<ActionType, { label: string; description: string; icon: string; configFields: { key: string; label: string; type: "text" | "select" | "boolean" }[] }> = {
  send_slack: {
    label: "Send Slack Message",
    description: "Post a notification to your Slack channel",
    icon: "MessageSquare",
    configFields: [
      { key: "message", label: "Message Template", type: "text" },
    ],
  },
  create_task: {
    label: "Create Task",
    description: "Add a task to the deal's pipeline",
    icon: "ListTodo",
    configFields: [
      { key: "title", label: "Task Title", type: "text" },
      { key: "assignee", label: "Assign To", type: "text" },
      { key: "due_days", label: "Due In (days)", type: "text" },
    ],
  },
  send_email: {
    label: "Send Email",
    description: "Send an email notification to team members",
    icon: "Mail",
    configFields: [
      { key: "to", label: "Recipients", type: "text" },
      { key: "subject", label: "Subject", type: "text" },
    ],
  },
  update_deal_field: {
    label: "Update Deal Field",
    description: "Modify a field on the deal record",
    icon: "Edit",
    configFields: [
      { key: "field", label: "Field Name", type: "text" },
      { key: "value", label: "New Value", type: "text" },
    ],
  },
  move_stage: {
    label: "Move to Stage",
    description: "Automatically advance the deal to a new stage",
    icon: "ArrowRight",
    configFields: [
      { key: "target_stage", label: "Target Stage", type: "select" },
    ],
  },
  add_to_watchlist: {
    label: "Add to Watchlist",
    description: "Add the company to a user's watchlist",
    icon: "Eye",
    configFields: [],
  },
  generate_memo: {
    label: "Generate Memo",
    description: "Auto-generate an investment memo draft",
    icon: "FileText",
    configFields: [],
  },
  notify_team: {
    label: "Notify Team",
    description: "Send in-app notification to all team members",
    icon: "Users",
    configFields: [
      { key: "message", label: "Notification Text", type: "text" },
    ],
  },
  log_decision: {
    label: "Log Decision",
    description: "Record a decision in the audit trail",
    icon: "BookOpen",
    configFields: [
      { key: "decision_type", label: "Decision Type", type: "text" },
      { key: "rationale", label: "Rationale", type: "text" },
    ],
  },
  sync_crm: {
    label: "Sync to CRM",
    description: "Push deal updates to connected CRM",
    icon: "RefreshCw",
    configFields: [],
  },
};

// ── Pre-built Templates ────────────────────────────────────────────────
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "deal_workflow" | "notifications" | "diligence" | "portfolio";
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  popularity: number; // 1-5
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "series-a-playbook",
    name: "Series A Playbook",
    description: "When a deal enters Due Diligence, auto-create the standard diligence task checklist",
    category: "deal_workflow",
    popularity: 5,
    trigger: {
      type: "deal_stage_change",
      conditions: [{ field: "new_stage", operator: "equals", value: "due_diligence" }],
    },
    actions: [
      { type: "create_task", config: { title: "Financial model review", due_days: 7 } },
      { type: "create_task", config: { title: "Management reference calls (3+)", due_days: 14 } },
      { type: "create_task", config: { title: "Customer reference calls (5+)", due_days: 14 } },
      { type: "create_task", config: { title: "Technical architecture review", due_days: 10 } },
      { type: "create_task", config: { title: "Legal review of docs", due_days: 21 } },
      { type: "send_slack", config: { message: "Deal moved to Due Diligence — diligence tasks auto-created" } },
    ],
  },
  {
    id: "stage-change-alert",
    name: "Stage Change Alert",
    description: "Notify Slack and team whenever any deal changes stage",
    category: "notifications",
    popularity: 5,
    trigger: {
      type: "deal_stage_change",
      conditions: [],
    },
    actions: [
      { type: "send_slack", config: { message: "{{company_name}} moved from {{previous_stage}} to {{new_stage}}" } },
      { type: "notify_team", config: { message: "Deal stage updated: {{company_name}} → {{new_stage}}" } },
    ],
  },
  {
    id: "ic-review-prep",
    name: "IC Review Prep",
    description: "When a deal enters IC Review, auto-generate memo and notify all partners",
    category: "deal_workflow",
    popularity: 4,
    trigger: {
      type: "deal_stage_change",
      conditions: [{ field: "new_stage", operator: "equals", value: "ic_review" }],
    },
    actions: [
      { type: "generate_memo", config: {} },
      { type: "notify_team", config: { message: "IC Review: {{company_name}} is ready for committee review" } },
      { type: "send_slack", config: { message: "IC REVIEW: {{company_name}} memo generated. Please review and vote." } },
      { type: "create_task", config: { title: "Schedule IC meeting", due_days: 3 } },
    ],
  },
  {
    id: "post-close-setup",
    name: "Post-Close Setup",
    description: "When a deal is committed, set up portfolio monitoring tasks",
    category: "portfolio",
    popularity: 4,
    trigger: {
      type: "deal_stage_change",
      conditions: [{ field: "new_stage", operator: "equals", value: "committed" }],
    },
    actions: [
      { type: "create_task", config: { title: "Board seat / observer rights confirmed", due_days: 7 } },
      { type: "create_task", config: { title: "Set up quarterly reporting cadence", due_days: 14 } },
      { type: "create_task", config: { title: "Add to portfolio monitoring dashboard", due_days: 3 } },
      { type: "sync_crm", config: {} },
      { type: "log_decision", config: { decision_type: "commitment", rationale: "Deal committed — post-close workflow initiated" } },
    ],
  },
  {
    id: "doc-review-trigger",
    name: "Document Review Trigger",
    description: "When a document is uploaded, create a review task for the deal team",
    category: "diligence",
    popularity: 3,
    trigger: {
      type: "document_uploaded",
      conditions: [],
    },
    actions: [
      { type: "create_task", config: { title: "Review uploaded document: {{file_name}}", due_days: 3 } },
      { type: "notify_team", config: { message: "New document uploaded for {{company_name}}: {{file_name}}" } },
    ],
  },
  {
    id: "new-deal-intake",
    name: "New Deal Intake",
    description: "When a new deal is added, auto-enrich and assign initial screening tasks",
    category: "deal_workflow",
    popularity: 4,
    trigger: {
      type: "deal_added",
      conditions: [],
    },
    actions: [
      { type: "create_task", config: { title: "Initial screening call", due_days: 5 } },
      { type: "create_task", config: { title: "Competitive landscape analysis", due_days: 7 } },
      { type: "send_slack", config: { message: "New deal: {{company_name}} ({{sector}}) added to pipeline" } },
    ],
  },
  {
    id: "deal-passed-cleanup",
    name: "Deal Passed — Cleanup",
    description: "When a deal is passed, log the decision and archive tasks",
    category: "deal_workflow",
    popularity: 3,
    trigger: {
      type: "deal_stage_change",
      conditions: [{ field: "new_stage", operator: "equals", value: "passed" }],
    },
    actions: [
      { type: "log_decision", config: { decision_type: "pass", rationale: "Deal passed — auto-logged" } },
      { type: "send_slack", config: { message: "Deal passed: {{company_name}}" } },
      { type: "sync_crm", config: {} },
    ],
  },
  {
    id: "healthcare-compliance",
    name: "Healthcare Compliance Gate",
    description: "For healthcare deals entering diligence, add regulatory compliance tasks",
    category: "diligence",
    popularity: 3,
    trigger: {
      type: "deal_stage_change",
      conditions: [
        { field: "new_stage", operator: "equals", value: "due_diligence" },
        { field: "sector", operator: "contains", value: "health" },
      ],
    },
    actions: [
      { type: "create_task", config: { title: "HIPAA compliance review", due_days: 14 } },
      { type: "create_task", config: { title: "FDA clearance verification", due_days: 14 } },
      { type: "create_task", config: { title: "Regulatory landscape memo", due_days: 10 } },
      { type: "notify_team", config: { message: "Healthcare deal entering diligence — compliance tasks added" } },
    ],
  },
];

// ── Rule Evaluation Engine ─────────────────────────────────────────────
export function evaluateCondition(condition: TriggerCondition, eventData: Record<string, any>): boolean {
  const fieldValue = eventData[condition.field];
  if (fieldValue === undefined || fieldValue === null) return false;

  switch (condition.operator) {
    case "equals":
      return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
    case "not_equals":
      return String(fieldValue).toLowerCase() !== String(condition.value).toLowerCase();
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(condition.value);
    case "less_than":
      return Number(fieldValue) < Number(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(fieldValue));
    default:
      return false;
  }
}

export function evaluateRule(rule: AutomationRule, triggerType: TriggerType, eventData: Record<string, any>): boolean {
  if (!rule.enabled) return false;
  if (rule.trigger.type !== triggerType) return false;

  // All conditions must match (AND logic)
  return rule.trigger.conditions.every((condition) => evaluateCondition(condition, eventData));
}

// ── Template interpolation ─────────────────────────────────────────────
export function interpolateTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? key);
}

// ── Generate unique ID ─────────────────────────────────────────────────
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

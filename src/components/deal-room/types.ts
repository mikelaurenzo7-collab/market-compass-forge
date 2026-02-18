export const STAGES = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"] as const;

export const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence",
  ic_review: "IC Review", committed: "Committed", passed: "Passed",
};

export const STAGE_COLORS: Record<string, string> = {
  sourced: "border-muted-foreground/30", screening: "border-primary/40",
  due_diligence: "border-warning/40", ic_review: "border-chart-4/40",
  committed: "border-success/40", passed: "border-destructive/40",
};

export const STAGE_BORDER_TOP_COLORS: Record<string, string> = {
  sourced: "border-t-muted-foreground", screening: "border-t-primary",
  due_diligence: "border-t-warning", ic_review: "border-t-chart-4",
  committed: "border-t-success", passed: "border-t-destructive",
};

export const TABS = [
  { id: "summary", label: "Summary", icon: "LayoutDashboard" },
  { id: "diligence", label: "Diligence", icon: "FileText" },
  { id: "valuation", label: "Valuation", icon: "Scale" },
  { id: "discussion", label: "Discussion", icon: "MessageSquare" },
  { id: "timeline", label: "Timeline", icon: "Clock" },
  { id: "allocation", label: "Allocation", icon: "PieChart" },
  { id: "updates", label: "Updates", icon: "Bell" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

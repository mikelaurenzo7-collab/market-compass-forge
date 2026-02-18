export const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence",
  ic_review: "IC Review", committed: "Committed", passed: "Passed",
};

export const STAGE_COLORS: Record<string, string> = {
  sourced: "border-muted-foreground/30", screening: "border-primary/40",
  due_diligence: "border-warning/40", ic_review: "border-chart-4/40",
  committed: "border-success/40", passed: "border-destructive/40",
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

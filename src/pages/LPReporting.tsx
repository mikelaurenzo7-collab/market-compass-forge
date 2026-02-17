import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  Send,
  Copy,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Edit3,
  Check,
  Archive,
  Loader2,
  Search,
  Filter,
  Calendar,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import {
  useReports,
  type Report,
  type ReportType,
  type ReportStatus,
  type FundMetrics,
  type ReportSection,
  REPORT_TEMPLATES,
} from "@/hooks/useReports";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatPercent(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

function formatMultiple(val: number): string {
  return `${val.toFixed(2)}x`;
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  quarterly_update: "Quarterly Update",
  annual_review: "Annual Review",
  capital_call: "Capital Call",
  distribution_notice: "Distribution Notice",
  custom: "Custom Report",
};

const STATUS_STYLES: Record<ReportStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Draft" },
  published: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Published" },
  archived: { bg: "bg-muted", text: "text-muted-foreground", label: "Archived" },
};

const CURRENT_QUARTER = (() => {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
})();

// ── Fund Metrics Card ────────────────────────────────────────────────────
const MetricCard = ({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  icon: typeof TrendingUp;
}) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
    <p className="text-lg font-semibold text-foreground font-mono">{value}</p>
    {subtitle && (
      <p className={`text-[10px] mt-0.5 ${
        trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-400" : "text-muted-foreground"
      }`}>
        {trend === "up" && <TrendingUp className="inline h-2.5 w-2.5 mr-0.5" />}
        {trend === "down" && <TrendingDown className="inline h-2.5 w-2.5 mr-0.5" />}
        {subtitle}
      </p>
    )}
  </div>
);

// ── Fund Metrics Editor Dialog ──────────────────────────────────────────
const FundMetricsDialog = ({
  open,
  onClose,
  metrics,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  metrics: FundMetrics;
  onSave: (m: Partial<FundMetrics>) => Promise<void>;
  isSaving: boolean;
}) => {
  const [form, setForm] = useState({ ...metrics });

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  const field = (label: string, key: keyof FundMetrics, prefix = "", suffix = "") => (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          step="any"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
          className={`w-full h-9 ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-7" : "pr-3"} rounded-md border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fund Metrics</DialogTitle>
          <DialogDescription>Configure your fund-level performance metrics for LP reports.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {field("Fund Size", "fundSize", "$")}
          {field("Vintage Year", "vintage")}
          {field("Total Committed", "totalCommitted", "$")}
          {field("Total Called", "totalCalled", "$")}
          {field("Total Distributed", "totalDistributed", "$")}
          {field("NAV", "nav", "$")}
          {field("Net IRR", "irr", "", "%")}
          {field("TVPI", "tvpiMultiple", "", "x")}
          {field("DPI", "dpiMultiple", "", "x")}
          {field("RVPI", "rvpiMultiple", "", "x")}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Metrics
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Create Report Dialog ────────────────────────────────────────────────
const CreateReportDialog = ({
  open,
  onClose,
  onCreate,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (type: ReportType, fundName: string, period: string) => Promise<Report>;
  isSaving: boolean;
}) => {
  const [type, setType] = useState<ReportType>("quarterly_update");
  const [fundName, setFundName] = useState("");
  const [period, setPeriod] = useState(CURRENT_QUARTER);

  const handleCreate = async () => {
    if (!fundName.trim()) return;
    await onCreate(type, fundName.trim(), period.trim());
    setFundName("");
    setPeriod(CURRENT_QUARTER);
    setType("quarterly_update");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create LP Report</DialogTitle>
          <DialogDescription>Generate a new report from a template.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {REPORT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fund Name</label>
            <input
              type="text"
              placeholder="e.g. Grapevine Fund I"
              value={fundName}
              onChange={(e) => setFundName(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Reporting Period</label>
            <input
              type="text"
              placeholder="e.g. Q1 2026"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!fundName.trim() || isSaving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Report
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Report Card ─────────────────────────────────────────────────────────
const ReportCard = ({
  report,
  onClick,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  report: Report;
  onClick: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) => {
  const status = STATUS_STYLES[report.status];
  const updatedLabel = (() => {
    try {
      return formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  return (
    <div className="rounded-lg border border-border bg-card p-5 hover:border-primary/20 hover:bg-primary/[0.01] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <button onClick={onClick} className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-grape shrink-0" />
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {report.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{report.fundName}</span>
            <span>·</span>
            <span>{report.period}</span>
          </div>
        </button>
        <span className={`${status.bg} ${status.text} text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          IRR {formatPercent(report.metrics.irr)}
        </span>
        <span className="flex items-center gap-1">
          TVPI {formatMultiple(report.metrics.tvpiMultiple)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {updatedLabel}
        </span>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <button
          onClick={onClick}
          className="flex-1 h-7 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
        >
          <Edit3 className="h-3 w-3" /> Edit
        </button>
        <button
          onClick={onDuplicate}
          className="h-7 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Duplicate"
        >
          <Copy className="h-3 w-3" />
        </button>
        {report.status !== "archived" && (
          <button
            onClick={onArchive}
            className="h-7 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Archive"
          >
            <Archive className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="h-7 px-2 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

// ── Report Editor ───────────────────────────────────────────────────────
const ReportEditor = ({
  report,
  onBack,
  onUpdateSection,
  onUpdateReport,
  onPublish,
  isSaving,
}: {
  report: Report;
  onBack: () => void;
  onUpdateSection: (sectionId: string, updates: Partial<ReportSection>) => Promise<void>;
  onUpdateReport: (updates: Partial<Report>) => Promise<void>;
  onPublish: () => Promise<void>;
  isSaving: boolean;
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(report.title);
  const status = STATUS_STYLES[report.status];

  const handleTitleSave = async () => {
    if (title.trim() && title !== report.title) {
      await onUpdateReport({ title: title.trim() });
    }
    setEditingTitle(false);
  };

  return (
    <div className="space-y-5">
      {/* Editor Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-b border-primary text-foreground outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              />
              <button onClick={handleTitleSave} className="text-primary">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingTitle(true)} className="text-left group/title">
              <h2 className="text-lg font-semibold text-foreground group-hover/title:text-primary transition-colors flex items-center gap-2">
                {report.title}
                <Edit3 className="h-3.5 w-3.5 opacity-0 group-hover/title:opacity-100 transition-opacity" />
              </h2>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{report.fundName}</span>
            <span>·</span>
            <span>{report.period}</span>
            <span>·</span>
            <span className={`${status.bg} ${status.text} text-[10px] font-medium px-1.5 py-0 rounded-full`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report.status === "draft" && (
            <button
              onClick={onPublish}
              disabled={isSaving}
              className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Fund Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Net IRR" value={formatPercent(report.metrics.irr)} trend={report.metrics.irr >= 0 ? "up" : "down"} icon={TrendingUp} />
        <MetricCard label="TVPI" value={formatMultiple(report.metrics.tvpiMultiple)} subtitle="Total Value" icon={BarChart3} />
        <MetricCard label="DPI" value={formatMultiple(report.metrics.dpiMultiple)} subtitle="Distributions" icon={DollarSign} />
        <MetricCard label="RVPI" value={formatMultiple(report.metrics.rvpiMultiple)} subtitle="Residual Value" icon={TrendingUp} />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {report.sections.map((section) => (
          <SectionEditor
            key={section.id}
            section={section}
            onUpdate={(updates) => onUpdateSection(section.id, updates)}
            isSaving={isSaving}
          />
        ))}
      </div>
    </div>
  );
};

// ── Section Editor ──────────────────────────────────────────────────────
const SectionEditor = ({
  section,
  onUpdate,
  isSaving,
}: {
  section: ReportSection;
  onUpdate: (updates: Partial<ReportSection>) => Promise<void>;
  isSaving: boolean;
}) => {
  const [content, setContent] = useState(section.content);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    await onUpdate({ content });
    setDirty(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{section.type}</span>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-6 px-2 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
              Save
            </button>
          )}
        </div>
      </div>
      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder={`Write your ${section.title.toLowerCase()} here...`}
          rows={section.type === "text" ? 6 : 4}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────────────
const LPReporting = () => {
  const {
    reports,
    fundMetrics,
    isLoading,
    isSaving,
    createReport,
    updateReport,
    updateSection,
    publishReport,
    archiveReport,
    deleteReport,
    duplicateReport,
    updateFundMetrics,
  } = useReports();

  const [showCreate, setShowCreate] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");

  const activeReport = activeReportId ? reports.find((r) => r.id === activeReportId) : null;

  const filteredReports = useMemo(
    () =>
      reports
        .filter((r) => {
          if (statusFilter !== "all" && r.status !== statusFilter) return false;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
              r.title.toLowerCase().includes(q) ||
              r.fundName.toLowerCase().includes(q) ||
              r.period.toLowerCase().includes(q)
            );
          }
          return true;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [reports, searchQuery, statusFilter]
  );

  const draftCount = reports.filter((r) => r.status === "draft").length;
  const publishedCount = reports.filter((r) => r.status === "published").length;

  // ── Render Editor ──
  if (activeReport) {
    return (
      <PageTransition>
        <div className="p-3 sm:p-6">
          <ReportEditor
            report={activeReport}
            onBack={() => setActiveReportId(null)}
            onUpdateSection={(sectionId, updates) => updateSection(activeReport.id, sectionId, updates)}
            onUpdateReport={(updates) => updateReport(activeReport.id, updates)}
            onPublish={() => publishReport(activeReport.id)}
            isSaving={isSaving}
          />
        </div>
      </PageTransition>
    );
  }

  // ── Render List ──
  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              LP Reporting
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate and manage investor reports — quarterly updates, capital calls, and performance summaries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetrics(true)}
              className="h-9 px-4 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" /> Fund Metrics
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Report
            </button>
          </div>
        </div>

        {/* Fund Performance Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Fund Size" value={formatCurrency(fundMetrics.fundSize)} icon={DollarSign} />
          <MetricCard label="Called" value={formatCurrency(fundMetrics.totalCalled)} subtitle={fundMetrics.fundSize > 0 ? `${((fundMetrics.totalCalled / fundMetrics.fundSize) * 100).toFixed(0)}% deployed` : undefined} icon={TrendingUp} />
          <MetricCard label="Distributed" value={formatCurrency(fundMetrics.totalDistributed)} icon={DollarSign} />
          <MetricCard label="Net IRR" value={formatPercent(fundMetrics.irr)} trend={fundMetrics.irr >= 0 ? "up" : "down"} icon={TrendingUp} />
          <MetricCard label="TVPI" value={formatMultiple(fundMetrics.tvpiMultiple)} icon={BarChart3} />
          <MetricCard label="DPI" value={formatMultiple(fundMetrics.dpiMultiple)} icon={DollarSign} />
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(["all", "draft", "published", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : STATUS_STYLES[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono text-primary">{reports.length}</span> reports
          <span>·</span>
          <span>
            <span className="font-mono text-yellow-500">{draftCount}</span> drafts
          </span>
          <span>·</span>
          <span>
            <span className="font-mono text-emerald-500">{publishedCount}</span> published
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReports.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => setActiveReportId(report.id)}
                onDuplicate={() => duplicateReport(report.id)}
                onArchive={() => archiveReport(report.id)}
                onDelete={() => deleteReport(report.id)}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No reports found"
            description={searchQuery ? "Try a different search term." : "Create your first LP report to get started with investor communications."}
            actionLabel="New Report"
            onAction={() => setShowCreate(true)}
          />
        )}

        {/* Dialogs */}
        <CreateReportDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={createReport}
          isSaving={isSaving}
        />
        <FundMetricsDialog
          open={showMetrics}
          onClose={() => setShowMetrics(false)}
          metrics={fundMetrics}
          onSave={updateFundMetrics}
          isSaving={isSaving}
        />
      </div>
    </PageTransition>
  );
};

export default LPReporting;

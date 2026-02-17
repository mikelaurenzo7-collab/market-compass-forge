import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────
export type ReportType = "quarterly_update" | "annual_review" | "capital_call" | "distribution_notice" | "custom";
export type ReportStatus = "draft" | "published" | "archived";

export interface ReportMetric {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  type: "text" | "metrics" | "table" | "highlights";
  metrics?: ReportMetric[];
}

export interface FundMetrics {
  totalCommitted: number;
  totalCalled: number;
  totalDistributed: number;
  nav: number;
  irr: number;
  tvpiMultiple: number;
  dpiMultiple: number;
  rvpiMultiple: number;
  vintage: number;
  fundSize: number;
}

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  period: string;
  fundName: string;
  sections: ReportSection[];
  metrics: FundMetrics;
  recipients: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const INTEGRATION_TYPE = "lp_reports";

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

const DEFAULT_FUND_METRICS: FundMetrics = {
  totalCommitted: 0,
  totalCalled: 0,
  totalDistributed: 0,
  nav: 0,
  irr: 0,
  tvpiMultiple: 1.0,
  dpiMultiple: 0,
  rvpiMultiple: 1.0,
  vintage: new Date().getFullYear(),
  fundSize: 0,
};

const REPORT_TEMPLATES: Record<ReportType, { title: string; sections: Omit<ReportSection, "id">[] }> = {
  quarterly_update: {
    title: "Quarterly LP Update",
    sections: [
      { title: "Executive Summary", content: "", type: "text" },
      { title: "Fund Performance", content: "", type: "metrics", metrics: [] },
      { title: "Portfolio Highlights", content: "", type: "highlights" },
      { title: "New Investments", content: "", type: "text" },
      { title: "Exits & Distributions", content: "", type: "text" },
      { title: "Market Outlook", content: "", type: "text" },
    ],
  },
  annual_review: {
    title: "Annual Fund Review",
    sections: [
      { title: "Year in Review", content: "", type: "text" },
      { title: "Fund Performance", content: "", type: "metrics", metrics: [] },
      { title: "Portfolio Summary", content: "", type: "table" },
      { title: "Investment Activity", content: "", type: "text" },
      { title: "Realizations & Distributions", content: "", type: "text" },
      { title: "Team Updates", content: "", type: "text" },
      { title: "Outlook & Strategy", content: "", type: "text" },
    ],
  },
  capital_call: {
    title: "Capital Call Notice",
    sections: [
      { title: "Capital Call Details", content: "", type: "metrics", metrics: [] },
      { title: "Purpose of Call", content: "", type: "text" },
      { title: "Payment Instructions", content: "", type: "text" },
    ],
  },
  distribution_notice: {
    title: "Distribution Notice",
    sections: [
      { title: "Distribution Summary", content: "", type: "metrics", metrics: [] },
      { title: "Source of Distribution", content: "", type: "text" },
      { title: "Fund Performance Impact", content: "", type: "text" },
    ],
  },
  custom: {
    title: "Custom Report",
    sections: [
      { title: "Overview", content: "", type: "text" },
    ],
  },
};

export { REPORT_TEMPLATES };

// ── Hook ──────────────────────────────────────────────────────────────
export function useReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: row, isLoading } = useQuery({
    queryKey: ["lp-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("integration_type", INTEGRATION_TYPE)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const reports: Report[] = (row?.config as { reports?: Report[] })?.reports ?? [];
  const fundMetrics: FundMetrics = (row?.config as { fundMetrics?: FundMetrics })?.fundMetrics ?? DEFAULT_FUND_METRICS;

  const saveMutation = useMutation({
    mutationFn: async (config: { reports: Report[]; fundMetrics: FundMetrics }) => {
      const { error } = await supabase
        .from("integration_settings")
        .upsert(
          {
            user_id: user!.id,
            integration_type: INTEGRATION_TYPE,
            enabled: true,
            config,
          },
          { onConflict: "user_id,integration_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-reports", user?.id] });
    },
  });

  const updateFundMetrics = async (updates: Partial<FundMetrics>) => {
    const updated = { ...fundMetrics, ...updates };
    await saveMutation.mutateAsync({ reports, fundMetrics: updated });
    toast.success("Fund metrics updated");
  };

  const createReport = async (type: ReportType, fundName: string, period: string): Promise<Report> => {
    const template = REPORT_TEMPLATES[type];
    const newReport: Report = {
      id: generateId(),
      title: template.title,
      type,
      status: "draft",
      period,
      fundName,
      sections: template.sections.map((s) => ({ ...s, id: generateSectionId() })),
      metrics: { ...fundMetrics },
      recipients: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };
    await saveMutation.mutateAsync({ reports: [...reports, newReport], fundMetrics });
    toast.success("Report created", { description: `${template.title} — ${period}` });
    return newReport;
  };

  const updateReport = async (reportId: string, updates: Partial<Report>) => {
    const updated = reports.map((r) =>
      r.id === reportId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    );
    await saveMutation.mutateAsync({ reports: updated, fundMetrics });
  };

  const updateSection = async (reportId: string, sectionId: string, updates: Partial<ReportSection>) => {
    const updated = reports.map((r) => {
      if (r.id !== reportId) return r;
      return {
        ...r,
        updatedAt: new Date().toISOString(),
        sections: r.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
      };
    });
    await saveMutation.mutateAsync({ reports: updated, fundMetrics });
  };

  const publishReport = async (reportId: string) => {
    await updateReport(reportId, { status: "published", publishedAt: new Date().toISOString() });
    toast.success("Report published");
  };

  const archiveReport = async (reportId: string) => {
    await updateReport(reportId, { status: "archived" });
    toast.success("Report archived");
  };

  const deleteReport = async (reportId: string) => {
    const updated = reports.filter((r) => r.id !== reportId);
    await saveMutation.mutateAsync({ reports: updated, fundMetrics });
    toast.success("Report deleted");
  };

  const duplicateReport = async (reportId: string): Promise<Report | undefined> => {
    const source = reports.find((r) => r.id === reportId);
    if (!source) return;
    const clone: Report = {
      ...source,
      id: generateId(),
      title: `${source.title} (Copy)`,
      status: "draft",
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: source.sections.map((s) => ({ ...s, id: generateSectionId() })),
    };
    await saveMutation.mutateAsync({ reports: [...reports, clone], fundMetrics });
    toast.success("Report duplicated");
    return clone;
  };

  const getReportById = (reportId: string): Report | undefined => reports.find((r) => r.id === reportId);

  return {
    reports,
    fundMetrics,
    isLoading,
    isSaving: saveMutation.isPending,
    createReport,
    updateReport,
    updateSection,
    publishReport,
    archiveReport,
    deleteReport,
    duplicateReport,
    updateFundMetrics,
    getReportById,
  };
}

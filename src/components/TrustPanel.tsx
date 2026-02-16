import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Database, FileText, Globe, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface TrustPanelProps {
  companyId: string;
}

interface CoverageSection {
  label: string;
  icon: typeof Database;
  hasData: boolean;
  count: number;
  isSynthetic: boolean;
  lastRefresh: string | null;
}

const TrustPanel = ({ companyId }: TrustPanelProps) => {
  const { data: coverage, isLoading } = useQuery({
    queryKey: ["trust-panel", companyId],
    queryFn: async () => {
      const [finRes, fundRes, enrichRes, docRes, eventRes] = await Promise.all([
        supabase.from("financials").select("id, source_type, fetched_at, is_synthetic").eq("company_id", companyId),
        supabase.from("funding_rounds").select("id, source_type, fetched_at, is_synthetic").eq("company_id", companyId),
        supabase.from("company_enrichments").select("id, scraped_at, confidence_score").eq("company_id", companyId),
        supabase.from("company_documents").select("id, created_at").eq("company_id", companyId),
        supabase.from("activity_events").select("id, published_at, source_type").eq("company_id", companyId).limit(5),
      ]);

      const financials = finRes.data ?? [];
      const funding = fundRes.data ?? [];
      const enrichments = enrichRes.data ?? [];
      const documents = docRes.data ?? [];
      const events = eventRes.data ?? [];

      const sections: CoverageSection[] = [
        {
          label: "Financials",
          icon: Database,
          hasData: financials.length > 0,
          count: financials.length,
          isSynthetic: financials.every(f => (f as any).is_synthetic),
          lastRefresh: financials[0]?.fetched_at ?? null,
        },
        {
          label: "Funding Rounds",
          icon: Database,
          hasData: funding.length > 0,
          count: funding.length,
          isSynthetic: funding.every(f => (f as any).is_synthetic),
          lastRefresh: funding[0]?.fetched_at ?? null,
        },
        {
          label: "Web Enrichments",
          icon: Globe,
          hasData: enrichments.length > 0,
          count: enrichments.length,
          isSynthetic: false,
          lastRefresh: enrichments[0]?.scraped_at ?? null,
        },
        {
          label: "Documents",
          icon: FileText,
          hasData: documents.length > 0,
          count: documents.length,
          isSynthetic: false,
          lastRefresh: documents[0]?.created_at ?? null,
        },
        {
          label: "Activity/News",
          icon: Clock,
          hasData: events.length > 0,
          count: events.length,
          isSynthetic: events.every(e => e.source_type === "seeded"),
          lastRefresh: events[0]?.published_at ?? null,
        },
      ];

      const withRealData = sections.filter(s => s.hasData && !s.isSynthetic).length;
      const coverageScore = Math.round((withRealData / sections.length) * 100);
      const totalEvidence = enrichments.length + documents.length;

      return { sections, coverageScore, totalEvidence, withRealData, totalSections: sections.length };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  if (isLoading || !coverage) return null;

  const freshnessLabel = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days < 1) return "Today";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const scoreColor = coverage.coverageScore >= 60 ? "text-success" : coverage.coverageScore >= 30 ? "text-warning" : "text-destructive";

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Data Trust Score</h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Score summary */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={`text-2xl font-black font-mono ${scoreColor}`}>{coverage.coverageScore}%</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Coverage</p>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
              <div className="bg-success transition-all" style={{ width: `${coverage.coverageScore}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {coverage.withRealData}/{coverage.totalSections} sections with real evidence · {coverage.totalEvidence} total sources
            </p>
          </div>
        </div>

        {/* Section breakdown */}
        <div className="space-y-1">
          {coverage.sections.map((s) => (
            <div key={s.label} className="flex items-center gap-2 py-1">
              <s.icon className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground flex-1">{s.label}</span>
              {!s.hasData ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Missing</span>
              ) : s.isSynthetic ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/30 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> Seeded
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/30 flex items-center gap-0.5">
                  <CheckCircle className="h-2.5 w-2.5" /> Sourced
                </span>
              )}
              <span className="text-[9px] font-mono text-muted-foreground w-12 text-right">{freshnessLabel(s.lastRefresh)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustPanel;

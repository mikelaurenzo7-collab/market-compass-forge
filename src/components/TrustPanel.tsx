import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Database, FileText, Globe, Clock, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

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
  quality: "high" | "medium" | "low" | "missing";
}

const TrustPanel = ({ companyId }: TrustPanelProps) => {
  const { data: coverage, isLoading } = useQuery({
    queryKey: ["trust-panel", companyId],
    queryFn: async () => {
      const [finRes, fundRes, enrichRes, docRes, eventRes] = await Promise.all([
        supabase.from("financials").select("id, source_type, fetched_at, is_synthetic, confidence_score").eq("company_id", companyId),
        supabase.from("funding_rounds").select("id, source_type, fetched_at, is_synthetic, confidence_score").eq("company_id", companyId),
        supabase.from("company_enrichments").select("id, scraped_at, confidence_score").eq("company_id", companyId),
        supabase.from("company_documents").select("id, created_at").eq("company_id", companyId),
        supabase.from("activity_events").select("id, published_at, source_type").eq("company_id", companyId).limit(10),
      ]);

      const financials = finRes.data ?? [];
      const funding = fundRes.data ?? [];
      const enrichments = enrichRes.data ?? [];
      const documents = docRes.data ?? [];
      const events = eventRes.data ?? [];

      const getQuality = (hasData: boolean, isSynthetic: boolean, count: number): CoverageSection["quality"] => {
        if (!hasData) return "missing";
        if (isSynthetic) return "low";
        if (count >= 3) return "high";
        return "medium";
      };

      const sections: CoverageSection[] = [
        {
          label: "Financials",
          icon: TrendingUp,
          hasData: financials.length > 0,
          count: financials.length,
          isSynthetic: financials.every(f => (f as any).is_synthetic),
          lastRefresh: financials[0]?.fetched_at ?? null,
          quality: getQuality(financials.length > 0, financials.every(f => (f as any).is_synthetic), financials.length),
        },
        {
          label: "Funding Rounds",
          icon: Database,
          hasData: funding.length > 0,
          count: funding.length,
          isSynthetic: funding.every(f => (f as any).is_synthetic),
          lastRefresh: funding[0]?.fetched_at ?? null,
          quality: getQuality(funding.length > 0, funding.every(f => (f as any).is_synthetic), funding.length),
        },
        {
          label: "Web Intelligence",
          icon: Globe,
          hasData: enrichments.length > 0,
          count: enrichments.length,
          isSynthetic: false,
          lastRefresh: enrichments[0]?.scraped_at ?? null,
          quality: getQuality(enrichments.length > 0, false, enrichments.length),
        },
        {
          label: "Documents",
          icon: FileText,
          hasData: documents.length > 0,
          count: documents.length,
          isSynthetic: false,
          lastRefresh: documents[0]?.created_at ?? null,
          quality: getQuality(documents.length > 0, false, documents.length),
        },
        {
          label: "Activity / News",
          icon: Clock,
          hasData: events.length > 0,
          count: events.length,
          isSynthetic: events.every(e => e.source_type === "seeded"),
          lastRefresh: events[0]?.published_at ?? null,
          quality: getQuality(events.length > 0, events.every(e => e.source_type === "seeded"), events.length),
        },
      ];

      const withRealData = sections.filter(s => s.hasData && !s.isSynthetic).length;
      const coverageScore = Math.round((withRealData / sections.length) * 100);
      const totalEvidence = enrichments.length + documents.length;
      const highQualityCount = sections.filter(s => s.quality === "high").length;

      return { sections, coverageScore, totalEvidence, withRealData, totalSections: sections.length, highQualityCount };
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

  const scoreColor = coverage.coverageScore >= 80 ? "text-success" : coverage.coverageScore >= 60 ? "text-primary" : coverage.coverageScore >= 30 ? "text-warning" : "text-destructive";
  const scoreGrade = coverage.coverageScore >= 80 ? "A" : coverage.coverageScore >= 60 ? "B" : coverage.coverageScore >= 40 ? "C" : "D";

  const qualityConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    high: { label: "Verified", className: "text-success bg-success/10 border-success/30", icon: CheckCircle },
    medium: { label: "Partial", className: "text-primary bg-primary/10 border-primary/30", icon: RefreshCw },
    low: { label: "Seeded", className: "text-warning bg-warning/10 border-warning/30", icon: AlertTriangle },
    missing: { label: "Missing", className: "text-muted-foreground bg-muted/50 border-border", icon: Clock },
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with score */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Data Trust Score</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-black font-mono ${scoreColor}`}>{scoreGrade}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{coverage.coverageScore}%</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Visual score bar */}
        <div className="space-y-1.5">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
            <motion.div
              className={`rounded-full ${coverage.coverageScore >= 80 ? "bg-success" : coverage.coverageScore >= 60 ? "bg-primary" : coverage.coverageScore >= 30 ? "bg-warning" : "bg-destructive"}`}
              initial={{ width: 0 }}
              animate={{ width: `${coverage.coverageScore}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              style={{ boxShadow: `0 0 8px hsl(var(--primary) / 0.3)` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {coverage.withRealData}/{coverage.totalSections} sections verified · {coverage.totalEvidence} evidence sources
            </p>
            {coverage.highQualityCount > 0 && (
              <span className="text-[9px] font-medium text-success flex items-center gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" />
                {coverage.highQualityCount} high-quality
              </span>
            )}
          </div>
        </div>

        {/* Section breakdown */}
        <div className="space-y-1.5">
          {coverage.sections.map((s, i) => {
            const qc = qualityConfig[s.quality];
            const QIcon = qc.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-secondary/30 transition-colors"
              >
                <s.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground flex-1 font-medium">{s.label}</span>
                {s.count > 0 && (
                  <span className="text-[9px] font-mono text-muted-foreground">{s.count}</span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 font-medium ${qc.className}`}>
                  <QIcon className="h-2.5 w-2.5" />
                  {qc.label}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground w-12 text-right">{freshnessLabel(s.lastRefresh)}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrustPanel;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, FileText, Globe, Shield, AlertTriangle, Clock, Database } from "lucide-react";
import ConfidenceBadge from "@/components/ConfidenceBadge";

interface EvidencePanelProps {
  companyId: string;
}

const EvidencePanel = ({ companyId }: EvidencePanelProps) => {
  const { data: enrichments, isLoading: loadingEnrich } = useQuery({
    queryKey: ["evidence-enrichments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_enrichments")
        .select("*")
        .eq("company_id", companyId)
        .order("scraped_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["evidence-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: financials } = useQuery({
    queryKey: ["evidence-financials", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financials")
        .select("id, period, source_type, source, confidence_score, fetched_at, revenue, arr, ebitda")
        .eq("company_id", companyId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingEnrich || loadingDocs;
  const totalSources = (enrichments?.length ?? 0) + (documents?.length ?? 0);
  const verifiedCount = (enrichments ?? []).filter(e => e.confidence_score === "high").length;
  const estimatedFinancials = (financials ?? []).filter(f => f.source_type === "seeded" || f.source_type === "estimated");
  const sourcedFinancials = (financials ?? []).filter(f => f.source_type !== "seeded" && f.source_type !== "estimated");

  const freshnessLabel = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days < 1) return "Today";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Evidence & Data Provenance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-border/50 bg-secondary/30 p-3 text-center">
            <p className="text-lg font-mono font-semibold text-foreground">{totalSources}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sources</p>
          </div>
          <div className="rounded border border-border/50 bg-secondary/30 p-3 text-center">
            <p className="text-lg font-mono font-semibold text-success">{verifiedCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">High Confidence</p>
          </div>
          <div className="rounded border border-border/50 bg-secondary/30 p-3 text-center">
            <p className="text-lg font-mono font-semibold text-foreground">{sourcedFinancials.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sourced Financials</p>
          </div>
          <div className="rounded border border-border/50 bg-secondary/30 p-3 text-center">
            <p className="text-lg font-mono font-semibold text-warning">{estimatedFinancials.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimated / Seeded</p>
          </div>
        </div>
      </div>

      {/* Financial data provenance */}
      {financials && financials.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Financial Data Sources</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Period</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Metrics</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Source</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Confidence</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Freshness</th>
                </tr>
              </thead>
              <tbody>
                {financials.map((f) => {
                  const isEstimated = f.source_type === "seeded" || f.source_type === "estimated";
                  return (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="px-4 py-2.5 font-medium text-foreground">{f.period}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {[f.revenue && "Rev", f.arr && "ARR", f.ebitda && "EBITDA"].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{f.source ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {isEstimated ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" /> Estimate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">
                            <Shield className="h-2.5 w-2.5" /> Sourced
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center"><ConfidenceBadge level={f.confidence_score} compact /></td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{freshnessLabel(f.fetched_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrichment sources */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Web Enrichments</h4>
          <span className="text-[10px] text-muted-foreground ml-auto">{enrichments?.length ?? 0} sources</span>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading evidence...</div>
        ) : (enrichments ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No enrichment data yet. Visit the company page to trigger auto-enrichment.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {(enrichments ?? []).map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-start gap-3">
                <div className="h-7 w-7 rounded bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{e.title ?? e.source_name}</p>
                    <ConfidenceBadge level={e.confidence_score} compact />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{e.summary ?? "No summary available"}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {freshnessLabel(e.scraped_at)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{e.data_type}</span>
                    {e.source_url && (
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> View Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploaded documents */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Uploaded Documents</h4>
          <span className="text-[10px] text-muted-foreground ml-auto">{documents?.length ?? 0} docs</span>
        </div>
        {(documents ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No documents uploaded. Upload deal materials via the Document Analyzer.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {(documents ?? []).map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-start gap-3">
                <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.file_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{d.document_type}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {freshnessLabel(d.created_at)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">v{d.version}</span>
                  </div>
                  {d.ai_summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.ai_summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidencePanel;

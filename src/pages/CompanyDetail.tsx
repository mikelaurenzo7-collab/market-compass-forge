import { useParams, useNavigate } from "react-router-dom";
import { useCompany, useCompanyFunding, useCompanyFinancials, useActivityEvents, formatCurrency, formatPercent } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Building2, MapPin, Users, Calendar, Globe, Loader2, Plus, Send, Clock, TrendingUp, Printer } from "lucide-react";
import AIResearchChat from "@/components/AIResearchChat";
import InvestmentMemo from "@/components/InvestmentMemo";
import SharedNotes from "@/components/SharedNotes";
import EnrichmentPanel from "@/components/EnrichmentPanel";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import DataProvenance from "@/components/DataProvenance";
import CompanyScore from "@/components/CompanyScore";
import FinancialsChart from "@/components/FinancialsChart";
import { useCompanyScore } from "@/hooks/useCompanyScore";
import { AddToWatchlistButton } from "@/components/WatchlistManager";
import { printElement } from "@/lib/export";
import { logActivity } from "@/lib/activityLogger";

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useCompany(id!);
  const { data: funding } = useCompanyFunding(id!);
  const { data: financials } = useCompanyFinancials(id!);
  const { data: events } = useActivityEvents(id);
  const [noteContent, setNoteContent] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "research" | "memo" | "enrichment">("overview");

  const { data: notes } = useQuery({
    queryKey: ["user-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .eq("company_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: decisionTrail } = useQuery({
    queryKey: ["decision-trail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_activity")
        .select("*")
        .eq("entity_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("user_notes").insert({
        company_id: id!,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
      logActivity({
        userId: user!.id,
        action: "added a note on",
        entityType: "company",
        entityId: id,
        entityName: company?.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notes", id] });
      setNoteContent("");
    },
  });

  const addToPipeline = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deal_pipeline").insert({
        company_id: id!,
        user_id: user!.id,
        stage: "sourced",
      });
      if (error) throw error;
      logActivity({
        userId: user!.id,
        action: "added to pipeline",
        entityType: "deal",
        entityId: id,
        entityName: company?.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Company not found.</p>
        <button onClick={() => navigate("/companies")} className="text-primary hover:underline mt-2 text-sm">Back to companies</button>
      </div>
    );
  }

  const latestFinancial = financials?.[0];
  const latestRound = funding?.[funding.length - 1];

  return (
    <div className="p-6 space-y-6 max-w-6xl print-target">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate("/companies")} className="p-2 rounded-md hover:bg-secondary text-muted-foreground mt-0.5 no-print">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {company.sector && <span>{company.sector}</span>}
                {company.sub_sector && <span>· {company.sub_sector}</span>}
                {company.stage && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">{company.stage}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <AddToWatchlistButton companyId={id!} />
          <button
            onClick={() => printElement(company.name)}
            className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => addToPipeline.mutate()}
            disabled={addToPipeline.isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add to Pipeline
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {company.hq_city && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><MapPin className="h-3 w-3" /> HQ</div>
            <p className="text-sm font-medium text-foreground">{company.hq_city}, {company.hq_country}</p>
          </div>
        )}
        {company.employee_count && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Users className="h-3 w-3" /> Employees</div>
            <p className="text-sm font-medium text-foreground font-mono">{company.employee_count.toLocaleString()}</p>
          </div>
        )}
        {company.founded_year && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Calendar className="h-3 w-3" /> Founded</div>
            <p className="text-sm font-medium text-foreground font-mono">{company.founded_year}</p>
          </div>
        )}
        {company.domain && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Globe className="h-3 w-3" /> Website</div>
            <p className="text-sm font-medium text-primary truncate">{company.domain}</p>
          </div>
        )}
        {latestRound?.valuation_post && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3 w-3" /> Valuation</div>
            <p className="text-sm font-medium text-foreground font-mono">{formatCurrency(latestRound.valuation_post)}</p>
          </div>
        )}
        {latestFinancial?.arr && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-muted-foreground text-xs mb-1">ARR</div>
            <p className="text-sm font-medium text-foreground font-mono">{formatCurrency(latestFinancial.arr)}</p>
          </div>
        )}
      </div>

      {company.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border no-print">
        {(["overview", "research", "memo", "enrichment"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "research" ? "AI Research" : tab === "memo" ? "Investment Memo" : "Enrichment"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Funding table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card">
                <h3 className="text-sm font-semibold text-foreground">Funding History</h3>
              </div>
              {funding && funding.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-data">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Round</th>
                        <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Amount</th>
                        <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Post-Val</th>
                        <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Lead Investors</th>
                        <th className="text-center px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Conf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funding.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="px-4 py-2.5 font-medium text-foreground">{r.round_type}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(r.amount)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(r.valuation_post)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{r.lead_investors?.join(", ") ?? "—"}</td>
                          <td className="px-4 py-2.5 text-center"><ConfidenceBadge level={r.confidence_score} compact /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No funding data available</div>
              )}
            </div>

            {latestFinancial && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Financial Metrics ({latestFinancial.period})</h3>
                  <ConfidenceBadge level={latestFinancial.confidence_score} source={latestFinancial.source} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DataProvenance label="Revenue" value={formatCurrency(latestFinancial.revenue)} confidence={latestFinancial.confidence_score} source={latestFinancial.source} />
                  <DataProvenance label="ARR" value={formatCurrency(latestFinancial.arr)} confidence={latestFinancial.confidence_score} source={latestFinancial.source} />
                  <DataProvenance label="Gross Margin" value={formatPercent(latestFinancial.gross_margin)} confidence={latestFinancial.confidence_score} source={latestFinancial.source} />
                  <DataProvenance label="EBITDA" value={formatCurrency(latestFinancial.ebitda)} confidence={latestFinancial.confidence_score} source={latestFinancial.source} />
                </div>
              </div>
            )}

            {financials && <FinancialsChart financials={financials} />}

            {/* Decision Trail */}
            {decisionTrail && decisionTrail.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Decision Trail</h3>
                </div>
                <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                  {decisionTrail.map((a) => (
                    <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <p className="text-xs text-foreground flex-1">
                        {a.action} {a.entity_name && <span className="text-primary">{a.entity_name}</span>}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <CompanyScore score={score} />
            {/* Activity */}
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Activity</h3>
              </div>
              <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                {events && events.length > 0 ? events.map((e) => (
                  <div key={e.id} className="px-4 py-3">
                    <p className="text-sm text-foreground leading-snug">{e.headline}</p>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {e.published_at ? new Date(e.published_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                )) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">No activity</div>
                )}
              </div>
            </div>

            {/* Private Notes */}
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Private Notes</h3>
              </div>
              <div className="p-4 space-y-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); if (noteContent.trim()) addNote.mutate(noteContent.trim()); }}
                  className="flex gap-2"
                >
                  <input
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={!noteContent.trim() || addNote.isPending}
                    className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notes?.map((n) => (
                    <div key={n.id} className="p-2 rounded bg-secondary/50 text-sm text-foreground">
                      <p>{n.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {(!notes || notes.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-2">No notes yet</p>
                  )}
                </div>
              </div>
            </div>

            <SharedNotes companyId={id!} />
          </div>
        </div>
      )}

      {activeTab === "research" && (
        <AIResearchChat companyId={id!} companyName={company.name} sector={company.sector} />
      )}

      {activeTab === "memo" && (
        <InvestmentMemo companyId={id!} companyName={company.name} />
      )}

      {activeTab === "enrichment" && (
        <EnrichmentPanel companyId={id!} companyName={company.name} />
      )}
    </div>
  );
};

export default CompanyDetail;

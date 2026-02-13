import { useParams, useNavigate } from "react-router-dom";
import { useCompany, useCompanyFunding, useCompanyFinancials, useActivityEvents, formatCurrency, formatPercent } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAutoEnrich } from "@/hooks/useAutoEnrich";
import { ArrowLeft, MapPin, Users, Calendar, Globe, Loader2, Plus, Send, Clock, TrendingUp, Printer, AlertCircle } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import AIResearchChat from "@/components/AIResearchChat";
import NewsFeed from "@/components/NewsFeed";
import InvestmentMemo from "@/components/InvestmentMemo";
import SharedNotes from "@/components/SharedNotes";
import EnrichmentPanel from "@/components/EnrichmentPanel";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import DataProvenance from "@/components/DataProvenance";
import CompanyScore from "@/components/CompanyScore";
import FinancialsChart from "@/components/FinancialsChart";
import DCFCalculator from "@/components/DCFCalculator";
import ValuationFootballField from "@/components/ValuationFootballField";
import SECFilingsTab from "@/components/SECFilingsTab";
import { useCompanyScore } from "@/hooks/useCompanyScore";
import { useSectorMultiples } from "@/hooks/useSectorMultiples";
import { AddToWatchlistButton } from "@/components/WatchlistManager";
import { printElement } from "@/lib/export";
import { logActivity } from "@/lib/activityLogger";
import { toast } from "sonner";

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useCompany(id!);
  const { data: funding } = useCompanyFunding(id!);
  const { data: financials } = useCompanyFinancials(id!);
  const { data: events } = useActivityEvents(id);
  
  // Auto-enrich company with real data via Firecrawl on first view
  useAutoEnrich(id, !!user);
  
  const [noteContent, setNoteContent] = useState("");
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as any) || "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "valuation" | "deals" | "analysis" | "news" | "research" | "memo" | "filings">(initialTab);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const latestFinancialForScore = financials?.[0];
  const previousFinancial = financials?.[1];
  const latestRoundForScore = funding?.[funding.length - 1];
  const score = useCompanyScore(id!, company ? {
    sector: company.sector,
    stage: company.stage,
    employee_count: company.employee_count,
    arr: latestFinancialForScore?.arr,
    revenue: latestFinancialForScore?.revenue,
    ebitda: latestFinancialForScore?.ebitda,
    valuation: latestRoundForScore?.valuation_post,
    grossMargin: latestFinancialForScore?.gross_margin,
    burnRate: latestFinancialForScore?.burn_rate,
    runwayMonths: latestFinancialForScore?.runway_months ? Number(latestFinancialForScore.runway_months) : undefined,
    previousArr: previousFinancial?.arr,
    previousRevenue: previousFinancial?.revenue,
    historicalFinancials: financials?.map(f => ({
      period: f.period,
      revenue: f.revenue,
      arr: f.arr,
      gross_margin: f.gross_margin,
      burn_rate: f.burn_rate,
      runway_months: f.runway_months ? Number(f.runway_months) : null,
    })),
  } : undefined);

  // Sector multiples for football field
  const { data: sectorMultiples } = useSectorMultiples(company?.sector);

  // Dynamic comparable companies from same sector
  const { data: sectorComps } = useQuery({
    queryKey: ["sector-comps", company?.sector, id],
    queryFn: async () => {
      if (!company?.sector) return [];
      // Get companies in same sector (excluding current)
      const { data: sectorCompanies, error } = await supabase
        .from("companies")
        .select("id, name, sector")
        .eq("sector", company.sector)
        .neq("id", id!)
        .limit(20);
      if (error) throw error;
      if (!sectorCompanies?.length) return [];

      const compIds = sectorCompanies.map(c => c.id);
      
      // Get financials and funding for these companies
      const [finRes, fundRes] = await Promise.all([
        supabase.from("financials").select("company_id, revenue, ebitda, arr").in("company_id", compIds).order("period", { ascending: false }),
        supabase.from("funding_rounds").select("company_id, valuation_post").in("company_id", compIds).order("date", { ascending: false }),
      ]);

      const latestFin: Record<string, { revenue: number | null; ebitda: number | null; arr: number | null }> = {};
      (finRes.data ?? []).forEach(f => { if (!latestFin[f.company_id]) latestFin[f.company_id] = f; });
      
      const latestVal: Record<string, number> = {};
      (fundRes.data ?? []).forEach(f => { if (!latestVal[f.company_id] && f.valuation_post) latestVal[f.company_id] = f.valuation_post; });

      return sectorCompanies
        .map(c => {
          const fin = latestFin[c.id];
          const val = latestVal[c.id];
          const rev = fin?.arr ?? fin?.revenue ?? 0;
          const ebitda = fin?.ebitda ?? 0;
          return {
            name: c.name,
            revenue: rev,
            ebitda,
            valuation: val ?? 0,
            evRevenue: val && rev ? val / rev : null,
            evEbitda: val && ebitda > 0 ? val / ebitda : null,
          };
        })
        .filter(c => c.evRevenue !== null)
        .sort((a, b) => (b.evRevenue ?? 0) - (a.evRevenue ?? 0))
        .slice(0, 8);
    },
    enabled: !!company?.sector && !!id,
  });

  const sectorCompMedians = (() => {
    if (!sectorComps?.length) return null;
    const evRevs = sectorComps.map(c => c.evRevenue).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const evEbitdas = sectorComps.map(c => c.evEbitda).filter((v): v is number => v !== null).sort((a, b) => a - b);
    return {
      medianEvRev: evRevs.length ? evRevs[Math.floor(evRevs.length / 2)] : null,
      medianEvEbitda: evEbitdas.length ? evEbitdas[Math.floor(evEbitdas.length / 2)] : null,
    };
  })();

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
      if (error) {
        if (error.code === "23505") {
          toast.info("Already in your pipeline");
          return;
        }
        throw error;
      }
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

  // DCF pre-population values
  const dcfRevenue = latestFinancial?.revenue ? latestFinancial.revenue / 1e6 : undefined;
  const dcfGrowth = score?.revenueCAGR ? Math.round(score.revenueCAGR * 100) : undefined;
  const dcfMargin = latestFinancial?.ebitda && latestFinancial?.revenue
    ? Math.round((latestFinancial.ebitda / latestFinancial.revenue) * 100)
    : undefined;

  // Build data-driven analysis
  const buildAnalysis = () => {
    if (!score || !latestFinancial) return null;
    const strengths: string[] = [];
    const risks: string[] = [];

    // Data-driven strengths
    if (latestFinancial.arr && latestFinancial.arr >= 100e6) strengths.push(`${formatCurrency(latestFinancial.arr)} ARR demonstrates significant market traction and product-market fit`);
    else if (latestFinancial.arr) strengths.push(`${formatCurrency(latestFinancial.arr)} ARR with ${score.revenueCAGR ? `${Math.round(score.revenueCAGR * 100)}% CAGR` : 'growing trajectory'}`);

    if (score.ruleOf40 !== null && score.ruleOf40 >= 40) strengths.push(`Rule of 40 at ${Math.round(score.ruleOf40)} indicates best-in-class growth/profitability balance`);
    if (latestFinancial.gross_margin && latestFinancial.gross_margin >= 0.7) strengths.push(`${Math.round(latestFinancial.gross_margin * 100)}% gross margin supports scalable unit economics`);
    if (score.forwardMultiple && score.forwardMultiple < 15) strengths.push(`${score.forwardMultiple.toFixed(1)}x forward EV/Revenue suggests attractive entry point at current growth`);
    if (score.impliedMultiple && score.sectorMedianEvRevenue && score.impliedMultiple < score.sectorMedianEvRevenue) {
      strengths.push(`Trading at ${((score.impliedMultiple / score.sectorMedianEvRevenue) * 100).toFixed(0)}% of sector median EV/Revenue — potential value opportunity`);
    }
    if (score.capitalEfficiency >= 80) strengths.push("Capital efficient operations with strong cash conversion");

    // Data-driven risks
    if (score.ruleOf40 !== null && score.ruleOf40 < 20) risks.push(`Rule of 40 at ${Math.round(score.ruleOf40)} — growth not offsetting margin compression`);
    if (latestFinancial.burn_rate && latestFinancial.burn_rate < 0 && latestFinancial.runway_months && Number(latestFinancial.runway_months) < 18) {
      risks.push(`${Number(latestFinancial.runway_months).toFixed(0)} months runway at current burn rate of ${formatCurrency(Math.abs(latestFinancial.burn_rate))}/mo`);
    }
    if (score.impliedMultiple && score.impliedMultiple > 30) risks.push(`${score.impliedMultiple.toFixed(1)}x EV/Revenue — premium valuation requires sustained execution`);
    if (score.sectorMomentum < 35) risks.push(`${company.sector} sector showing limited deal activity — potential headwind for exit timing`);
    if (score.growthScore < 40) risks.push("Decelerating growth trajectory may pressure valuation multiples");
    if (score.efficiencyScore < 40) risks.push("Operational efficiency below benchmarks — margins need improvement");

    // Pad with contextual defaults if needed
    if (strengths.length < 2) strengths.push(`Positioned in ${company.sector || 'growing'} market with expanding TAM`);
    if (risks.length < 2) risks.push("Competitive dynamics in core market require monitoring");

    return { strengths: strengths.slice(0, 4), risks: risks.slice(0, 4) };
  };

  const analysis = buildAnalysis();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl print-target">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate("/companies")} className="p-2 rounded-md hover:bg-secondary text-muted-foreground mt-0.5 no-print">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={company.name} sector={company.sector} size="lg" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {company.sector && <span>{company.sector}</span>}
                {company.sub_sector && <span>· {company.sub_sector}</span>}
                {company.stage && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                    {company.stage}
                  </span>
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
      <div className="flex gap-1 border-b border-border no-print overflow-x-auto">
        {(["overview", "financials", "valuation", "filings", "deals", "analysis", "news", "research", "memo"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "financials" ? "Financials" : tab === "valuation" ? "Valuation" : tab === "filings" ? "SEC Filings" : tab === "deals" ? "Deal History" : tab === "analysis" ? "AI Analysis" : tab === "news" ? "News & Sentiment" : tab === "research" ? "AI Research" : "Investment Memo"}
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

      {activeTab === "financials" && financials && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Financial History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-data">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Period</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Revenue</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">YoY Growth</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">EBITDA</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map((f, idx) => {
                    const prev = financials[idx + 1];
                    const growth = prev && prev.revenue ? ((f.revenue! - prev.revenue) / prev.revenue * 100) : null;
                    return (
                      <tr key={f.id} className="border-b border-border/50">
                        <td className="px-4 py-2.5 font-medium text-foreground">{f.period}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(f.revenue)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{growth !== null ? `${growth.toFixed(1)}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(f.ebitda)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{f.gross_margin ? `${(f.gross_margin * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "valuation" && (!latestFinancial || !latestRound) && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Insufficient data for valuation analysis</p>
          <p className="text-xs text-muted-foreground">
            Missing: {!latestFinancial ? "financial data" : ""}{!latestFinancial && !latestRound ? " and " : ""}{!latestRound ? "funding/valuation data" : ""}
          </p>
        </div>
      )}

      {activeTab === "valuation" && latestFinancial && latestRound && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Estimated Valuation</p>
                <p className="text-2xl font-mono font-semibold text-primary">{formatCurrency(latestRound.valuation_post)}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Comp Analysis</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded border border-border/50 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">EV/Revenue</p>
                <p className="text-lg font-mono font-semibold text-foreground">{latestFinancial.revenue && latestRound.valuation_post ? (latestRound.valuation_post / latestFinancial.revenue).toFixed(2) : "—"}x</p>
              </div>
              <div className="p-3 rounded border border-border/50 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">EV/EBITDA</p>
                <p className="text-lg font-mono font-semibold text-foreground">{latestFinancial.ebitda && latestRound.valuation_post ? (latestRound.valuation_post / latestFinancial.ebitda).toFixed(1) : "—"}x</p>
              </div>
              <div className="p-3 rounded border border-border/50 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Est. Revenue</p>
                <p className="text-lg font-mono font-semibold text-foreground">{formatCurrency(latestFinancial.revenue)}</p>
              </div>
              <div className="p-3 rounded border border-border/50 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Est. EBITDA</p>
                <p className="text-lg font-mono font-semibold text-foreground">{formatCurrency(latestFinancial.ebitda)}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Comparable Companies */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Comparable Companies — {company.sector}</h3>
              {sectorCompMedians && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Sector Median: {sectorCompMedians.medianEvRev ? `${sectorCompMedians.medianEvRev.toFixed(1)}x EV/Rev` : "—"}
                  {sectorCompMedians.medianEvEbitda ? ` · ${sectorCompMedians.medianEvEbitda.toFixed(1)}x EV/EBITDA` : ""}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-data text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Valuation</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Revenue</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">EV/Rev</th>
                    <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">EV/EBITDA</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorComps && sectorComps.length > 0 ? sectorComps.map((comp) => (
                    <tr key={comp.name} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{comp.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(comp.valuation)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(comp.revenue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">{comp.evRevenue ? `${comp.evRevenue.toFixed(1)}x` : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">{comp.evEbitda ? `${comp.evEbitda.toFixed(1)}x` : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No comparable companies found in {company.sector}</td></tr>
                  )}
                  {sectorCompMedians && (
                    <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                      <td className="px-4 py-2.5 text-foreground">Sector Median</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">—</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">—</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary">{sectorCompMedians.medianEvRev ? `${sectorCompMedians.medianEvRev.toFixed(1)}x` : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary">{sectorCompMedians.medianEvEbitda ? `${sectorCompMedians.medianEvEbitda.toFixed(1)}x` : "—"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Football Field — computed from company data */}
          <ValuationFootballField
            companyData={{
              revenue: latestFinancial.revenue,
              ebitda: latestFinancial.ebitda,
              sectorMultiples: sectorMultiples ? {
                evRevenue: { p25: sectorMultiples.evRevenue.p25, median: sectorMultiples.evRevenue.median, p75: sectorMultiples.evRevenue.p75 },
                evEbitda: { p25: sectorMultiples.evEbitda.p25, median: sectorMultiples.evEbitda.median, p75: sectorMultiples.evEbitda.p75 },
              } : undefined,
            }}
          />

          {/* DCF Calculator — pre-populated from company data */}
          <DCFCalculator
            initialRevenue={dcfRevenue}
            initialGrowth={dcfGrowth}
            initialMargin={dcfMargin}
            companyName={company.name}
          />
        </div>
      )}

      {activeTab === "deals" && funding && funding.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Deal Timeline</h3>
            </div>
            <div className="divide-y divide-border/50">
              {funding.map((round, idx) => (
                <div key={round.id} className="px-4 py-3 flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary shrink-0"></div>
                    {idx < funding.length - 1 && <div className="h-8 w-0.5 bg-border/30 mt-1"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-foreground">{round.round_type}</p>
                      <span className="text-xs text-muted-foreground font-mono">{round.date ? new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(round.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Post-Val</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(round.valuation_post)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lead Investors</p>
                        <p className="text-sm text-foreground">{round.lead_investors?.slice(0, 2).join(', ') || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analysis" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">AI Investment Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {company.name} is a {company.stage || 'late-stage'} {company.sector || 'technology'} company
                {company.employee_count ? ` with ${company.employee_count.toLocaleString()} employees` : ''}.
                {latestFinancial?.arr ? ` Current ARR is ${formatCurrency(latestFinancial.arr)}` : ''}
                {score?.revenueCAGR ? ` growing at ${Math.round(score.revenueCAGR * 100)}% CAGR` : ''}.
                {score?.impliedMultiple ? ` Trading at ${score.impliedMultiple.toFixed(1)}x EV/Revenue` : ''}
                {score?.sectorMedianEvRevenue ? ` vs sector median of ${score.sectorMedianEvRevenue.toFixed(1)}x` : ''}.
                {score?.ruleOf40 !== null && score?.ruleOf40 !== undefined ? ` Rule of 40 is ${Math.round(score.ruleOf40)}.` : ''}
                {' '}Overall investment grade: {score?.grade ?? 'N/A'} ({score?.overall ?? 0}/100).
              </p>
            </div>

            {analysis && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Key Strengths</h4>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success mt-0.5">●</span>
                        <span className="text-sm text-foreground">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Key Risks</h4>
                  <ul className="space-y-2">
                    {analysis.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-destructive mt-0.5">●</span>
                        <span className="text-sm text-foreground">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "filings" && (
        <SECFilingsTab
          companyId={id!}
          companyName={company.name}
          cikNumber={(company as any).cik_number}
          marketType={company.market_type}
        />
      )}

      {activeTab === "news" && (
        <NewsFeed companyId={id!} />
      )}

      {activeTab === "research" && (
        <AIResearchChat companyId={id!} companyName={company.name} sector={company.sector} />
      )}

      {activeTab === "memo" && (
        <InvestmentMemo companyId={id!} companyName={company.name} />
      )}
    </div>
  );
};

export default CompanyDetail;

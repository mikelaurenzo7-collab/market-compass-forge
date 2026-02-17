import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { exportToCSV } from "@/lib/export";
import ReactMarkdown from "react-markdown";
import {
  Table, Search, Plus, X, Download, Sparkles, Building2,
  TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Printer, Wand2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type CompanyRow = {
  id: string;
  name: string;
  sector: string | null;
  market_type: string;
  stage: string | null;
  employee_count: number | null;
  founded_year: number | null;
  revenue: number | null;
  arr: number | null;
  gross_margin: number | null;
  ebitda: number | null;
  valuation: number | null;
  ev_revenue: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  price: number | null;
  price_change_pct: number | null;
  last_round: string | null;
  ticker: string | null;
};

function fmt(val: number | null, suffix = "") {
  if (val === null || val === undefined) return "—";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B${suffix}`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M${suffix}`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K${suffix}`;
  return `$${val.toFixed(2)}${suffix}`;
}

function pct(val: number | null) {
  if (val === null || val === undefined) return "—";
  return `${(val * 100).toFixed(0)}%`;
}

const CompTableBuilder = ({ embedded }: { embedded?: boolean } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Search companies
  const { data: searchResults } = useQuery({
    queryKey: ["comp-search", searchTerm],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, sector, market_type, stage")
        .ilike("name", `%${searchTerm}%`)
        .limit(10);
      return data ?? [];
    },
    enabled: searchTerm.length >= 2,
  });

  // Fetch full data for selected companies
  const { data: compRows, isLoading } = useQuery({
    queryKey: ["comp-table-data", selectedIds],
    queryFn: async () => {
      if (!selectedIds.length) return [];

      const [companiesRes, financialsRes, fundingRes] = await Promise.all([
        supabase.from("companies").select("*").in("id", selectedIds),
        supabase.from("financials").select("*").in("company_id", selectedIds).order("period", { ascending: false }),
        supabase.from("funding_rounds").select("*").in("company_id", selectedIds).order("date", { ascending: false }),
      ]);

      const companies = companiesRes.data ?? [];
      const financials = financialsRes.data ?? [];
      const funding = fundingRes.data ?? [];

      return companies.map((c): CompanyRow => {
        const latestFin = financials.find((f) => f.company_id === c.id);
        const latestFunding = funding.find((f) => f.company_id === c.id);
        const valuation = latestFunding?.valuation_post ? Number(latestFunding.valuation_post) : null;
        const revenue = latestFin?.revenue ? Number(latestFin.revenue) : null;

        return {
          id: c.id,
          name: c.name,
          sector: c.sector,
          market_type: c.market_type,
          stage: c.stage,
          employee_count: c.employee_count,
          founded_year: c.founded_year,
          revenue,
          arr: latestFin?.arr ? Number(latestFin.arr) : null,
          gross_margin: latestFin?.gross_margin ? Number(latestFin.gross_margin) : null,
          ebitda: latestFin?.ebitda ? Number(latestFin.ebitda) : null,
          valuation,
          ev_revenue: revenue && valuation ? valuation / revenue : null,
          market_cap: null,
          pe_ratio: null,
          price: null,
          price_change_pct: null,
          last_round: latestFunding?.round_type ?? null,
          ticker: null,
        };
      });
    },
    enabled: selectedIds.length > 0,
  });

  const addCompany = (id: string) => {
    if (selectedIds.length >= 10) {
      toast({ title: "Maximum 10 companies", description: "Remove a company to add another.", variant: "destructive" });
      return;
    }
    if (!selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id]);
    }
    setSearchTerm("");
    setShowSearch(false);
  };

  const removeCompany = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const runAiAnalysis = async () => {
    if (selectedIds.length < 2) {
      toast({ title: "Select at least 2 companies", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiAnalysis("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comp-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ company_ids: selectedIds }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "Analysis failed", description: err.error, variant: "destructive" });
        setAiLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiAnalysis(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Analysis error", description: String(e), variant: "destructive" });
    }
    setAiLoading(false);
  };

  const handleExportCSV = () => {
    if (!compRows?.length) return;
    exportToCSV(
      compRows.map((r) => ({
        company: r.name,
        type: r.market_type,
        sector: r.sector ?? "",
        stage: r.stage ?? "",
        revenue: r.revenue ?? "",
        arr: r.arr ?? "",
        gross_margin: r.gross_margin !== null ? `${(r.gross_margin * 100).toFixed(0)}%` : "",
        ebitda: r.ebitda ?? "",
        valuation: r.valuation ?? "",
        ev_revenue: r.ev_revenue?.toFixed(1) ?? "",
        market_cap: r.market_cap ?? "",
        pe_ratio: r.pe_ratio ?? "",
        last_round: r.last_round ?? "",
      })),
      "comp-table"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Stats row
  const stats = useMemo(() => {
    if (!compRows?.length) return null;
    const revs = compRows.map((r) => r.revenue).filter((v): v is number => v !== null);
    const evrs = compRows.map((r) => r.ev_revenue).filter((v): v is number => v !== null);
    const margins = compRows.map((r) => r.gross_margin).filter((v): v is number => v !== null);
    return {
      medianRevenue: revs.length ? revs.sort((a, b) => a - b)[Math.floor(revs.length / 2)] : null,
      medianEVR: evrs.length ? evrs.sort((a, b) => a - b)[Math.floor(evrs.length / 2)] : null,
      medianMargin: margins.length ? margins.sort((a, b) => a - b)[Math.floor(margins.length / 2)] : null,
    };
  }, [compRows]);

  return (
    <div className="p-6 space-y-6 print-target">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Table className="h-5 w-5 text-primary" /> Comp Table Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare up to 10 companies across public & private markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Company
          </button>
          {selectedIds.length >= 1 && (
            <button
              onClick={async () => {
                // Auto-find public comps based on first selected company's sector
                const firstCompany = compRows?.[0];
                if (!firstCompany?.sector) {
                  toast({ title: "Select a company with a sector first", variant: "destructive" });
                  return;
                }
                const { data: matches } = await supabase
                  .from("companies")
                  .select("id")
                  .eq("market_type", "public")
                  .eq("sector", firstCompany.sector)
                  .not("id", "in", `(${selectedIds.join(",")})`)
                  .limit(5);
                if (matches?.length) {
                  setSelectedIds(prev => [...prev, ...matches.map(m => m.id)].slice(0, 10));
                  toast({ title: `Added ${matches.length} public comps`, description: `Matched by sector: ${firstCompany.sector}` });
                } else {
                  toast({ title: "No public comps found", description: "Try a different sector", variant: "destructive" });
                }
              }}
              className="h-9 px-3 rounded-md border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" /> Find Public Comps
            </button>
          )}
          {compRows && compRows.length >= 2 && (
            <button
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className="h-9 px-3 rounded-md border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Analysis
            </button>
          )}
          {compRows && compRows.length > 0 && (
            <>
              <button onClick={handleExportCSV} className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" /> CSV
              </button>
              <button onClick={handlePrint} className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                <Printer className="h-4 w-4" /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <div className="rounded-lg border border-border bg-card p-4 no-print">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search companies to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
              className="w-full h-10 pl-9 pr-10 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
              {searchResults.filter((c) => !selectedIds.includes(c.id)).map((c) => (
                <button
                  key={c.id}
                  onClick={() => addCompany(c.id)}
                  className="w-full px-3 py-2.5 text-left rounded-md hover:bg-accent transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground font-medium">{c.name}</span>
                    {c.sector && <span className="text-xs text-muted-foreground">· {c.sector}</span>}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.market_type === "public" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {c.market_type.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 no-print">
          {compRows?.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${c.market_type === "public" ? "bg-success" : "bg-primary"}`} />
              {c.name}
              <button onClick={() => removeCompany(c.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selectedIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Table className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium text-foreground">Build a Comp Table</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
            Select 2–10 companies to auto-populate financials, valuations and multiples. Mix private and public peers for cross-market analysis.
          </p>
          <button
            onClick={() => setShowSearch(true)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Companies
          </button>
        </div>
      )}

      {/* Comp Table */}
      {compRows && compRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-foreground sticky left-0 bg-muted/30 z-10 min-w-[180px]">Company</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">ARR</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">Margin</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">EBITDA</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">Valuation</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">EV/Rev</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">P/E</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-3 py-3 font-medium text-muted-foreground">Stage</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-card z-10">
                      <button onClick={() => navigate(`/companies/${row.id}`)} className="text-foreground hover:text-primary transition-colors font-medium">
                        {row.name}
                      </button>
                      <div className="flex items-center gap-1 mt-0.5">
                        {row.ticker && <span className="text-[10px] font-mono text-muted-foreground">{row.ticker}</span>}
                        {row.sector && <span className="text-[10px] text-muted-foreground">· {row.sector}</span>}
                      </div>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${row.market_type === "public" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                        {row.market_type === "public" ? "PUB" : "PVT"}
                      </span>
                    </td>
                    <td className="text-right px-3 py-3 font-mono text-foreground">{fmt(row.revenue)}</td>
                    <td className="text-right px-3 py-3 font-mono text-foreground">{fmt(row.arr)}</td>
                    <td className="text-right px-3 py-3 font-mono text-foreground">{pct(row.gross_margin)}</td>
                    <td className="text-right px-3 py-3 font-mono text-foreground">{fmt(row.ebitda)}</td>
                    <td className="text-right px-3 py-3 font-mono text-foreground font-medium">{fmt(row.valuation)}</td>
                    <td className="text-right px-3 py-3 font-mono text-primary font-medium">
                      {row.ev_revenue !== null ? `${row.ev_revenue.toFixed(1)}x` : "—"}
                    </td>
                    <td className="text-right px-3 py-3 font-mono text-foreground">
                      {row.pe_ratio !== null ? `${row.pe_ratio.toFixed(1)}x` : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {row.price !== null ? (
                        <div className="font-mono">
                          <div className="text-foreground">${row.price.toFixed(2)}</div>
                          {row.price_change_pct !== null && (
                            <div className={`text-[10px] flex items-center justify-end gap-0.5 ${row.price_change_pct >= 0 ? "text-success" : "text-destructive"}`}>
                              {row.price_change_pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(row.price_change_pct).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="text-right px-3 py-3 text-muted-foreground">{row.stage ?? "—"}</td>
                  </tr>
                ))}
                {/* Median row */}
                {stats && (
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="px-4 py-3 sticky left-0 bg-muted/20 z-10 text-xs font-semibold text-muted-foreground uppercase">Median</td>
                    <td></td>
                    <td className="text-right px-3 py-3 font-mono text-muted-foreground text-xs">{fmt(stats.medianRevenue)}</td>
                    <td></td>
                    <td className="text-right px-3 py-3 font-mono text-muted-foreground text-xs">{pct(stats.medianMargin)}</td>
                    <td></td>
                    <td></td>
                    <td className="text-right px-3 py-3 font-mono text-primary/70 text-xs font-medium">{stats.medianEVR !== null ? `${stats.medianEVR.toFixed(1)}x` : "—"}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {(aiAnalysis || aiLoading) && (
        <div className="rounded-lg border border-primary/20 bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">AI Comp Analysis</h2>
            {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />}
          </div>
          <div className="px-4 py-4 prose prose-sm prose-invert max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_li]:text-foreground/90 [&_p]:text-foreground/90">
            {aiAnalysis ? <ReactMarkdown>{aiAnalysis}</ReactMarkdown> : (
              <p className="text-muted-foreground text-sm">Generating analysis...</p>
            )}
          </div>
          <p className="px-4 pb-3 text-[10px] text-muted-foreground/60">
            For informational purposes only. Not investment advice. Conduct independent due diligence.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompTableBuilder;

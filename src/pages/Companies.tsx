import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useCompaniesWithFinancialsAll, formatCurrency } from "@/hooks/useData";
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, Database } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import { exportCompaniesCSV } from "@/lib/export";
import { useTableNavigation } from "@/hooks/useHotkeys";
import CompanyHoverCard from "@/components/CompanyHoverCard";
import { TableSkeleton } from "@/components/SkeletonLoaders";
import { SyntheticDataWarning } from "@/components/DataBadges";
import ProvenanceFilters, { type ProvenanceFilterState, getDefaultProvenanceFilters, applyProvenanceFilter } from "@/components/ProvenanceFilters";
import ProvenanceBadge from "@/components/ProvenanceBadge";

const STAGES = ["All", "Series A", "Series B", "Series C", "Series D", "Series E", "Series F", "Series G", "Series H", "Growth", "Late Stage"];
const SECTORS = ["All", "AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3", "Climate Tech", "EdTech", "E-Commerce", "Services", "Construction", "Manufacturing", "Professional Services", "Financial Services", "Distribution", "Real Estate", "Hospitality", "Restaurant"];

const GRADE_MAP: { min: number; grade: string; color: string }[] = [
  { min: 85, grade: "A+", color: "text-success" },
  { min: 75, grade: "A", color: "text-success" },
  { min: 65, grade: "B+", color: "text-chart-2" },
  { min: 55, grade: "B", color: "text-primary" },
  { min: 45, grade: "C+", color: "text-warning" },
  { min: 35, grade: "C", color: "text-warning" },
  { min: 0, grade: "D", color: "text-destructive" },
];

const getGrade = (score: number) => {
  const g = GRADE_MAP.find((g) => score >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
  return { grade: g.grade, color: g.color };
};

type SortKey = "name" | "valuation" | "revenue" | "sector" | "stage" | "score";

const Companies = () => {
  const { data: companies, isLoading } = useCompaniesWithFinancialsAll();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("valuation");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [provFilters, setProvFilters] = useState<ProvenanceFilterState>(getDefaultProvenanceFilters());

  const scoredCompanies = useMemo(() => {
    if (!companies) return [];
    const allRevenue = companies.map((c: any) => c.latestFinancials?.revenue ?? c.latestFinancials?.arr ?? 0).filter((a: number) => a > 0).sort((a: number, b: number) => a - b);
    const sectorCounts: Record<string, number> = {};
    companies.forEach((c: any) => { if (c.sector) sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1; });
    const maxSectorCount = Math.max(...Object.values(sectorCounts), 1);

    return companies.map((c: any) => {
      const revenue = c.latestFinancials?.revenue ?? c.latestFinancials?.arr ?? 0;
      const valuation = c.latestRound?.valuation_post ?? 0;
      const empCount = c.employee_count ?? 0;
      const ebitda = c.latestFinancials?.ebitda ?? 0;

      let revenueScore = 50;
      if (revenue > 0 && allRevenue.length > 0) {
        const rank = allRevenue.filter((a: number) => a <= revenue).length;
        revenueScore = Math.round((rank / allRevenue.length) * 100);
      }

      let valuationScore = 50;
      if (valuation > 0 && revenue > 0) {
        const multiple = valuation / revenue;
        if (multiple <= 5) valuationScore = 90;
        else if (multiple <= 10) valuationScore = 80;
        else if (multiple <= 20) valuationScore = 70;
        else if (multiple <= 40) valuationScore = 55;
        else if (multiple <= 60) valuationScore = 40;
        else valuationScore = 25;
      }

      const sectorMomentum = c.sector ? Math.round((sectorCounts[c.sector] / maxSectorCount) * 100) : 50;

      let efficiencyScore = 50;
      if (empCount > 0 && revenue > 0) {
        const revPerEmp = revenue / empCount;
        efficiencyScore = Math.min(100, Math.round((revPerEmp / 300000) * 100));
      }

      let ebitdaScore = 50;
      if (revenue > 0 && ebitda > 0) {
        const margin = ebitda / revenue;
        ebitdaScore = Math.min(100, Math.round(margin * 400));
      }

      const overall = Math.round(revenueScore * 0.25 + valuationScore * 0.20 + sectorMomentum * 0.15 + efficiencyScore * 0.20 + ebitdaScore * 0.20);
      const { grade, color } = getGrade(overall);

      return { ...c, _score: overall, _grade: grade, _gradeColor: color };
    });
  }, [companies]);

  const [financialsOnly, setFinancialsOnly] = useState(false);

  const coverageStats = useMemo(() => {
    if (!companies) return { withFinancials: 0, total: 0, pct: 0 };
    const withFin = companies.filter((c: any) => c.latestFinancials?.revenue || c.latestFinancials?.arr).length;
    return { withFinancials: withFin, total: companies.length, pct: companies.length > 0 ? Math.round((withFin / companies.length) * 100) : 0 };
  }, [companies]);

  const filtered = useMemo(() => {
    return scoredCompanies
      .filter((c: any) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
        if (stageFilter !== "All" && c.stage !== stageFilter) return false;
        if (financialsOnly && !(c.latestFinancials?.revenue || c.latestFinancials?.arr)) return false;
        if (!applyProvenanceFilter(c, provFilters)) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name": av = a.name; bv = b.name; break;
          case "valuation": av = a.latestRound?.valuation_post ?? 0; bv = b.latestRound?.valuation_post ?? 0; break;
          case "revenue": av = a.latestFinancials?.revenue ?? a.latestFinancials?.arr ?? 0; bv = b.latestFinancials?.revenue ?? b.latestFinancials?.arr ?? 0; break;
          case "sector": av = a.sector ?? ""; bv = b.sector ?? ""; break;
          case "stage": av = a.stage ?? ""; bv = b.stage ?? ""; break;
          case "score": av = a._score; bv = b._score; break;
        }
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [scoredCompanies, search, sectorFilter, stageFilter, sortKey, sortAsc, financialsOnly, provFilters]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: any) => void, value: any) => {
    setter(value);
    setPage(0);
  };

  useTableNavigation(filtered.length, (index) => {
    if (filtered[index]) navigate(`/companies/${filtered[index].id}`);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, sortId, align }: { label: string; sortId: SortKey; align?: string }) => (
    <th
      className={`px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(sortId)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sortId ? "text-primary" : "opacity-30"}`} />
      </span>
    </th>
  );

  if (isLoading) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SyntheticDataWarning />
      
      <div>
          <h1 className="text-xl font-semibold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading...</p>
        </div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="p-4 sm:p-6 space-y-4">
      <SyntheticDataWarning />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">Intelligence</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-primary">{filtered.length}</span> private companies tracked
            <span className="mx-1.5">·</span>
            <button onClick={() => navigate("/deals")} className="text-primary hover:underline">View Deals</button>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 self-start flex-wrap">
          <button
            onClick={() => setFinancialsOnly(!financialsOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
              financialsOnly
                ? "border-primary/40 bg-primary/10 text-primary"
                : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <Database className="h-3 w-3" />
            <span>Coverage:</span>
            <span className="font-mono font-medium">{coverageStats.pct}%</span>
            <span className={`h-1.5 w-1.5 rounded-full ${coverageStats.pct >= 50 ? "bg-success" : coverageStats.pct >= 25 ? "bg-warning" : "bg-destructive"}`} />
          </button>
          <button
            onClick={() => exportCompaniesCSV(filtered)}
            className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Quick-start filter templates */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "🔥 Top AI/ML", sector: "AI/ML", stage: "All" },
          { label: "📈 Series B+ Growth", sector: "All", stage: "Series B" },
          { label: "💰 Fintech", sector: "Fintech", stage: "All" },
          { label: "🛡️ Cybersecurity", sector: "Cybersecurity", stage: "All" },
          { label: "🏗️ Late Stage", sector: "All", stage: "Late Stage" },
        ].map((t) => {
          const isActive = (t.sector !== "All" && sectorFilter === t.sector) || (t.stage !== "All" && stageFilter === t.stage);
          return (
            <button
              key={t.label}
              onClick={() => {
                handleFilterChange(setSectorFilter, t.sector);
                handleFilterChange(setStageFilter, t.stage);
                setSearch("");
              }}
              className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        {(sectorFilter !== "All" || stageFilter !== "All" || search) && (
          <button
            onClick={() => { handleFilterChange(setSectorFilter, "All"); handleFilterChange(setStageFilter, "All"); setSearch(""); }}
            className="h-7 px-2.5 rounded-full text-[11px] font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            ✕ Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search companies..." value={search} onChange={(e) => handleFilterChange(setSearch, e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64" />
        <select value={sectorFilter} onChange={(e) => handleFilterChange(setSectorFilter, e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => handleFilterChange(setStageFilter, e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ProvenanceFilters filters={provFilters} onChange={(f) => { setProvFilters(f); setPage(0); }} />

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortHeader label="Company" sortId="name" />
                <SortHeader label="Sector" sortId="sector" />
                <SortHeader label="Valuation" sortId="valuation" align="right" />
                <th className="px-3 sm:px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-right hidden md:table-cell cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => toggleSort("revenue")}>
                  <span className="inline-flex items-center gap-1">Revenue <ArrowUpDown className={`h-3 w-3 ${sortKey === "revenue" ? "text-primary" : "opacity-30"}`} /></span>
                </th>
                <SortHeader label="Score" sortId="score" align="right" />
                <th className="px-3 sm:px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left hidden sm:table-cell cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => toggleSort("stage")}>
                  <span className="inline-flex items-center gap-1">Stage <ArrowUpDown className={`h-3 w-3 ${sortKey === "stage" ? "text-primary" : "opacity-30"}`} /></span>
                </th>
                <th className="px-3 sm:px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left hidden lg:table-cell">HQ</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c: any, i) => (
                <tr
                  key={c.id}
                  data-index={i}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/companies/${c.id}`); }}
                >
                  <td className="px-3 sm:px-4 py-2.5">
                    <CompanyHoverCard company={{ id: c.id, name: c.name, sector: c.sector, stage: c.stage, hq_country: c.hq_country, employee_count: c.employee_count, valuation: c.latestRound?.valuation_post, arr: c.latestFinancials?.arr }}>
                      <div className="flex items-center gap-2">
                        <CompanyAvatar name={c.name} sector={c.sector} />
                        <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-none">{c.name}</span>
                      </div>
                    </CompanyHoverCard>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-muted-foreground">{c.sector ?? "—"}</td>
                  <td className="px-3 sm:px-4 py-2.5 text-right text-foreground font-medium font-mono">
                    {formatCurrency(c.latestRound?.valuation_post ?? null)}
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-right text-foreground font-mono hidden md:table-cell">
                    {formatCurrency(c.latestFinancials?.revenue ?? c.latestFinancials?.arr ?? null)}
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold text-xs ${c._gradeColor}`}>{c._grade}</span>
                    <span className="text-[10px] text-muted-foreground ml-1 font-mono">{c._score}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 hidden sm:table-cell">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {c.stage ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-muted-foreground hidden lg:table-cell">{c.hq_country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No companies match your filters</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-7 px-1.5 rounded bg-secondary border border-border text-sm text-foreground">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
};

export default Companies;

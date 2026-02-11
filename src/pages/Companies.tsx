import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancialsAll, formatCurrency } from "@/hooks/useData";
import { ArrowUpDown, Building2, Download } from "lucide-react";
import { exportCompaniesCSV } from "@/lib/export";
import { useTableNavigation } from "@/hooks/useHotkeys";
import CompanyHoverCard from "@/components/CompanyHoverCard";
import { TableSkeleton } from "@/components/SkeletonLoaders";

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

  const filtered = useMemo(() => {
    return scoredCompanies
      .filter((c: any) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
        if (stageFilter !== "All" && c.stage !== stageFilter) return false;
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
  }, [scoredCompanies, search, sectorFilter, stageFilter, sortKey, sortAsc]);

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
        <div>
          <h1 className="text-xl font-semibold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading...</p>
        </div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-primary">{filtered.length}</span> private companies tracked
          </p>
        </div>
        <button
          onClick={() => exportCompaniesCSV(filtered)}
          className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2 self-start"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64" />
        <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortHeader label="Company" sortId="name" />
                <SortHeader label="Sector" sortId="sector" />
                <SortHeader label="Valuation" sortId="valuation" align="right" />
                <SortHeader label="Revenue" sortId="revenue" align="right" />
                <SortHeader label="Score" sortId="score" align="right" />
                <SortHeader label="Stage" sortId="stage" />
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">HQ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any, i) => (
                <tr
                  key={c.id}
                  data-index={i}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/companies/${c.id}`); }}
                >
                  <td className="px-4 py-2.5">
                    <CompanyHoverCard company={{ id: c.id, name: c.name, sector: c.sector, stage: c.stage, hq_country: c.hq_country, employee_count: c.employee_count, valuation: c.latestRound?.valuation_post, arr: c.latestFinancials?.arr }}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0">
                          <Building2 className="h-3 w-3 text-accent-foreground" />
                        </div>
                        <span className="text-foreground font-medium">{c.name}</span>
                      </div>
                    </CompanyHoverCard>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.sector ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-foreground font-medium font-mono">
                    {formatCurrency(c.latestRound?.valuation_post ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground font-mono">
                    {formatCurrency(c.latestFinancials?.revenue ?? c.latestFinancials?.arr ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold text-xs ${c._gradeColor}`}>{c._grade}</span>
                    <span className="text-[10px] text-muted-foreground ml-1 font-mono">{c._score}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {c.stage ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.hq_country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No companies match your filters</div>
        )}
      </div>
    </div>
  );
};

export default Companies;

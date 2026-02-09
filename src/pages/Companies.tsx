import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancials, formatCurrency } from "@/hooks/useData";
import { ArrowUpDown, Building2, Loader2 } from "lucide-react";

const STAGES = ["All", "Late Stage", "Growth", "Series B", "Series C", "Series D", "Public"];
const SECTORS = ["All", "AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3"];

type SortKey = "name" | "valuation" | "arr" | "sector" | "stage";

const Companies = () => {
  const { data: companies, isLoading } = useCompaniesWithFinancials();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("valuation");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!companies) return [];
    return companies
      .filter((c) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
        if (stageFilter !== "All" && c.stage !== stageFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name": av = a.name; bv = b.name; break;
          case "valuation": av = a.latestRound?.valuation_post ?? 0; bv = b.latestRound?.valuation_post ?? 0; break;
          case "arr": av = a.latestFinancials?.arr ?? 0; bv = b.latestFinancials?.arr ?? 0; break;
          case "sector": av = a.sector ?? ""; bv = b.sector ?? ""; break;
          case "stage": av = a.stage ?? ""; bv = b.stage ?? ""; break;
        }
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [companies, search, sectorFilter, stageFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, sortId }: { label: string; sortId: SortKey }) => (
    <th
      className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none"
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Companies</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-mono text-primary">{filtered.length}</span> companies tracked
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortHeader label="Company" sortId="name" />
                <SortHeader label="Sector" sortId="sector" />
                <SortHeader label="Valuation" sortId="valuation" />
                <SortHeader label="ARR" sortId="arr" />
                <SortHeader label="Stage" sortId="stage" />
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">HQ</th>
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">Last Round</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0">
                        <Building2 className="h-3 w-3 text-accent-foreground" />
                      </div>
                      <span className="text-foreground font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.sector ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-foreground font-medium font-mono">
                    {formatCurrency(c.latestRound?.valuation_post ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground font-mono">
                    {formatCurrency(c.latestFinancials?.arr ?? null)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {c.stage ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.hq_country ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.latestRound?.round_type ?? "—"}</td>
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

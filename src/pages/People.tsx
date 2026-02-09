import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, ChevronDown, ChevronRight, ExternalLink, Building2, Loader2 } from "lucide-react";
import { useInvestors, useInvestorPortfolio, formatCurrency } from "@/hooks/useAnalyticsData";

const People = () => {
  const { data: investors, isLoading } = useInvestors();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "aum" | "type">("aum");
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();

  const types = useMemo(() => {
    if (!investors) return [];
    const set = new Set(investors.map((i) => i.type).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [investors]);

  const filtered = useMemo(() => {
    if (!investors) return [];
    return investors
      .filter((i) => {
        if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== "All" && i.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name": av = a.name; bv = b.name; break;
          case "aum": av = a.aum ?? 0; bv = b.aum ?? 0; break;
          case "type": av = a.type ?? ""; bv = b.type ?? ""; break;
        }
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [investors, search, typeFilter, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">People & Investors</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-mono text-primary">{filtered.length}</span> investors tracked
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search investors..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-data">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-4 py-2" />
              {[
                { label: "Name", key: "name" as const, align: "text-left" },
                { label: "Type", key: "type" as const, align: "text-left" },
                { label: "AUM", key: "aum" as const, align: "text-right" },
                { label: "HQ", key: null, align: "text-left" },
                { label: "Website", key: null, align: "text-left" },
              ].map(({ label, key, align }) => (
                <th key={label}
                  className={`px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium ${align} ${key ? "cursor-pointer hover:text-foreground" : ""}`}
                  onClick={key ? () => toggleSort(key) : undefined}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <InvestorRow key={inv.id} investor={inv} isExpanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                onNavigate={(id) => navigate(`/companies/${id}`)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No investors match your search</div>
        )}
      </div>
    </div>
  );
};

const InvestorRow = ({ investor, isExpanded, onToggle, onNavigate }: {
  investor: any; isExpanded: boolean; onToggle: () => void; onNavigate: (id: string) => void;
}) => {
  const { data: portfolio, isLoading } = useInvestorPortfolio(isExpanded ? investor.id : null);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-2.5">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0">
              <Users className="h-3 w-3 text-accent-foreground" />
            </div>
            <span className="font-medium text-foreground">{investor.name}</span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">{investor.type ?? "—"}</span>
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(investor.aum)}</td>
        <td className="px-4 py-2.5 text-muted-foreground">{investor.hq_country ?? "—"}</td>
        <td className="px-4 py-2.5">
          {investor.website && (
            <a href={investor.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
              onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3 w-3" /> Visit
            </a>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-muted/20 px-8 py-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading portfolio...
              </div>
            ) : portfolio && portfolio.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Portfolio Companies ({portfolio.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {portfolio.map((p: any) => (
                    <button key={p.company_id}
                      onClick={() => onNavigate(p.company_id)}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary border border-border/50 text-left transition-colors">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.companies?.name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.companies?.sector ?? ""} · {p.funding_rounds?.round_type ?? ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No portfolio companies linked</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

export default People;

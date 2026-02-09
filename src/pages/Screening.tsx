import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancials, formatCurrency } from "@/hooks/useData";
import { Search, Filter, Building2, Loader2, ArrowUpDown, Plus, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Filters = {
  search: string;
  sectors: string[];
  stages: string[];
  countries: string[];
  foundedMin: string;
  foundedMax: string;
  arrMin: string;
  arrMax: string;
  valuationMin: string;
  valuationMax: string;
  employeeMin: string;
  employeeMax: string;
};

const EMPTY_FILTERS: Filters = {
  search: "", sectors: [], stages: [], countries: [],
  foundedMin: "", foundedMax: "", arrMin: "", arrMax: "",
  valuationMin: "", valuationMax: "", employeeMin: "", employeeMax: "",
};

const SECTORS = ["AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3"];
const STAGES = ["Late Stage", "Growth", "Series B", "Series C", "Series D", "Public"];

const Screening = () => {
  const { data: companies, isLoading } = useCompaniesWithFinancials();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = localStorage.getItem("screening-filters");
    return saved ? JSON.parse(saved) : EMPTY_FILTERS;
  });
  const [sortKey, setSortKey] = useState<"name" | "valuation" | "arr">("valuation");
  const [sortAsc, setSortAsc] = useState(false);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleArrayFilter = useCallback((key: "sectors" | "stages" | "countries", val: string) => {
    setFilters((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }, []);

  const savePreset = () => {
    localStorage.setItem("screening-filters", JSON.stringify(filters));
    toast.success("Filter preset saved");
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    localStorage.removeItem("screening-filters");
  };

  const addToPipeline = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.from("deal_pipeline").insert({
        company_id: companyId, user_id: user!.id, stage: "sourced",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Added to pipeline");
    },
  });

  const parseNum = (s: string) => s ? parseFloat(s) : null;

  const filtered = useMemo(() => {
    if (!companies) return [];
    const arrMin = parseNum(filters.arrMin);
    const arrMax = parseNum(filters.arrMax);
    const valMin = parseNum(filters.valuationMin);
    const valMax = parseNum(filters.valuationMax);
    const empMin = parseNum(filters.employeeMin);
    const empMax = parseNum(filters.employeeMax);
    const fMin = parseNum(filters.foundedMin);
    const fMax = parseNum(filters.foundedMax);

    return companies
      .filter((c) => {
        if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.sectors.length && (!c.sector || !filters.sectors.includes(c.sector))) return false;
        if (filters.stages.length && (!c.stage || !filters.stages.includes(c.stage))) return false;
        if (filters.countries.length && (!c.hq_country || !filters.countries.includes(c.hq_country))) return false;
        const arr = c.latestFinancials?.arr ?? 0;
        if (arrMin !== null && arr < arrMin * 1e6) return false;
        if (arrMax !== null && arr > arrMax * 1e6) return false;
        const val = c.latestRound?.valuation_post ?? 0;
        if (valMin !== null && val < valMin * 1e9) return false;
        if (valMax !== null && val > valMax * 1e9) return false;
        if (empMin !== null && (c.employee_count ?? 0) < empMin) return false;
        if (empMax !== null && (c.employee_count ?? 0) > empMax) return false;
        if (fMin !== null && (c.founded_year ?? 0) < fMin) return false;
        if (fMax !== null && (c.founded_year ?? 0) > fMax) return false;
        return true;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name": av = a.name; bv = b.name; break;
          case "valuation": av = a.latestRound?.valuation_post ?? 0; bv = b.latestRound?.valuation_post ?? 0; break;
          case "arr": av = a.latestFinancials?.arr ?? 0; bv = b.latestFinancials?.arr ?? 0; break;
        }
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [companies, filters, sortKey, sortAsc]);

  const countries = useMemo(() => {
    if (!companies) return [];
    const set = new Set(companies.map((c) => c.hq_country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [companies]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Screening</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-primary">{filtered.length}</span> companies match your criteria
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={savePreset} className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
            <Save className="h-4 w-4" /> Save
          </button>
          <button onClick={resetFilters} className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-primary" /> Filters
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text" placeholder="Search..." value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="h-8 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            ARR ($M):
            <input type="number" placeholder="Min" value={filters.arrMin} onChange={(e) => updateFilter("arrMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="Max" value={filters.arrMax} onChange={(e) => updateFilter("arrMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Val ($B):
            <input type="number" placeholder="Min" value={filters.valuationMin} onChange={(e) => updateFilter("valuationMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="Max" value={filters.valuationMax} onChange={(e) => updateFilter("valuationMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Emp:
            <input type="number" placeholder="Min" value={filters.employeeMin} onChange={(e) => updateFilter("employeeMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="Max" value={filters.employeeMax} onChange={(e) => updateFilter("employeeMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Founded:
            <input type="number" placeholder="From" value={filters.foundedMin} onChange={(e) => updateFilter("foundedMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="To" value={filters.foundedMax} onChange={(e) => updateFilter("foundedMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
          </div>
        </div>

        {/* Chip filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SECTORS.map((s) => (
              <button key={s} onClick={() => toggleArrayFilter("sectors", s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filters.sectors.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button key={s} onClick={() => toggleArrayFilter("stages", s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filters.stages.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => (
              <button key={c} onClick={() => toggleArrayFilter("countries", c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filters.countries.includes(c) ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { label: "Company", key: "name" as const },
                  { label: "Sector", key: null },
                  { label: "Valuation", key: "valuation" as const },
                  { label: "ARR", key: "arr" as const },
                  { label: "Stage", key: null },
                  { label: "HQ", key: null },
                  { label: "Actions", key: null },
                ].map(({ label, key }, i) => (
                  <th key={label}
                    className={`px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium ${i >= 2 && i <= 3 ? "text-right" : "text-left"} ${key ? "cursor-pointer hover:text-foreground" : ""}`}
                    onClick={key ? () => toggleSort(key) : undefined}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {key && <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? "text-primary" : "opacity-30"}`} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-2.5 cursor-pointer" onClick={() => navigate(`/companies/${c.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0">
                        <Building2 className="h-3 w-3 text-accent-foreground" />
                      </div>
                      <span className="text-foreground font-medium hover:text-primary transition-colors">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.sector ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(c.latestRound?.valuation_post ?? null)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(c.latestFinancials?.arr ?? null)}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">{c.stage ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.hq_country ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); addToPipeline.mutate(c.id); }}
                      className="h-7 px-2 rounded text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Pipeline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No companies match your criteria</div>
        )}
      </div>
    </div>
  );
};

export default Screening;

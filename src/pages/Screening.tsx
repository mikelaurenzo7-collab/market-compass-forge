import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancials, formatCurrency } from "@/hooks/useData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Filter, Building2, Loader2, ArrowUpDown, Plus, Save, RotateCcw, FileText, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Filters = {
  search: string;
  sectors: string[];
  stages: string[];
  countries: string[];
  ownershipTypes: string[];
  foundedMin: string;
  foundedMax: string;
  arrMin: string;
  arrMax: string;
  ebitdaMin: string;
  ebitdaMax: string;
  valuationMin: string;
  valuationMax: string;
  employeeMin: string;
  employeeMax: string;
};

const EMPTY_FILTERS: Filters = {
  search: "", sectors: [], stages: [], countries: [], ownershipTypes: [],
  foundedMin: "", foundedMax: "", arrMin: "", arrMax: "",
  ebitdaMin: "", ebitdaMax: "",
  valuationMin: "", valuationMax: "", employeeMin: "", employeeMax: "",
};

const SECTORS = ["AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3", "Climate Tech", "EdTech", "E-Commerce", "Semiconductors", "Energy", "Industrials", "Pharmaceuticals", "Retail", "Automotive", "Aerospace & Defense", "Media & Entertainment", "Telecommunications"];
const STAGES = ["Series A", "Series B", "Series C", "Series D", "Series E", "Series F", "Series G", "Series H", "Growth", "Late Stage"];
const OWNERSHIP_TYPES = ["PE-Backed", "VC-Backed", "Family-Owned", "Independent"];

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

type SortKey = "name" | "valuation" | "arr" | "score";

const Screening = () => {
  const { data: companies, isLoading } = useCompaniesWithFinancials();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = localStorage.getItem("screening-filters");
    return saved ? { ...EMPTY_FILTERS, ...JSON.parse(saved) } : EMPTY_FILTERS;
  });
  const [sortKey, setSortKey] = useState<SortKey>("valuation");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleArrayFilter = useCallback((key: "sectors" | "stages" | "countries" | "ownershipTypes", val: string) => {
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
      if (error) {
        if (error.code === "23505") return;
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Added to pipeline");
    },
  });

  const bulkAddToPipeline = useMutation({
    mutationFn: async (ids: string[]) => {
      let added = 0;
      for (const company_id of ids) {
        const { error } = await supabase.from("deal_pipeline").insert({
          company_id, user_id: user!.id, stage: "sourced",
        });
        if (!error) added++;
        else if (error.code !== "23505") throw error;
      }
      return added;
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(`${added} companies added to pipeline`);
      setSelectedIds(new Set());
    },
    onError: () => {
      toast.error("Failed to add some companies to pipeline");
    },
  });

  const parseNum = (s: string) => s ? parseFloat(s) : null;

  const scoredCompanies = useMemo(() => {
    if (!companies) return [];
    const allARR = companies.map((c: any) => c.latestFinancials?.arr ?? 0).filter((a: number) => a > 0).sort((a: number, b: number) => a - b);
    const sectorCounts: Record<string, number> = {};
    companies.forEach((c: any) => { if (c.sector) sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1; });
    const maxSectorCount = Math.max(...Object.values(sectorCounts), 1);

    return companies.map((c: any) => {
      const arr = c.latestFinancials?.arr ?? 0;
      const valuation = c.latestRound?.valuation_post ?? 0;
      const empCount = c.employee_count ?? 0;

      let arrScore = 50;
      if (arr > 0 && allARR.length > 0) {
        const rank = allARR.filter((a: number) => a <= arr).length;
        arrScore = Math.round((rank / allARR.length) * 100);
      }

      let valuationScore = 50;
      if (valuation > 0 && arr > 0) {
        const multiple = valuation / arr;
        if (multiple <= 10) valuationScore = 90;
        else if (multiple <= 20) valuationScore = 75;
        else if (multiple <= 40) valuationScore = 60;
        else if (multiple <= 60) valuationScore = 45;
        else if (multiple <= 80) valuationScore = 30;
        else valuationScore = 20;
      }

      const sectorMomentum = c.sector ? Math.round((sectorCounts[c.sector] / maxSectorCount) * 100) : 50;

      let efficiencyScore = 50;
      if (empCount > 0 && arr > 0) {
        const revPerEmp = arr / empCount;
        efficiencyScore = Math.min(100, Math.round((revPerEmp / 300000) * 100));
      }

      const overall = Math.round(arrScore * 0.30 + valuationScore * 0.25 + sectorMomentum * 0.20 + efficiencyScore * 0.25);
      const { grade, color } = getGrade(overall);

      return { ...c, _score: overall, _grade: grade, _gradeColor: color };
    });
  }, [companies]);

  const filtered = useMemo(() => {
    const arrMin = parseNum(filters.arrMin);
    const arrMax = parseNum(filters.arrMax);
    const ebitdaMin = parseNum(filters.ebitdaMin);
    const ebitdaMax = parseNum(filters.ebitdaMax);
    const valMin = parseNum(filters.valuationMin);
    const valMax = parseNum(filters.valuationMax);
    const empMin = parseNum(filters.employeeMin);
    const empMax = parseNum(filters.employeeMax);
    const fMin = parseNum(filters.foundedMin);
    const fMax = parseNum(filters.foundedMax);

    return scoredCompanies
      .filter((c: any) => {
        if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.sectors.length && (!c.sector || !filters.sectors.includes(c.sector))) return false;
        if (filters.stages.length && (!c.stage || !filters.stages.includes(c.stage))) return false;
        if (filters.countries.length && (!c.hq_country || !filters.countries.includes(c.hq_country))) return false;
        
        if (filters.ownershipTypes.length) {
          const matches = filters.ownershipTypes.some((type: string) => {
            if (type === "PE-Backed") return c.stage && ["Series D", "Series E", "Series F", "Series G", "Series H", "Growth", "Late Stage"].includes(c.stage);
            if (type === "VC-Backed") return c.stage && ["Series A", "Series B", "Series C", "Series D"].includes(c.stage);
            if (type === "Family-Owned") return !c.stage || c.stage === "Independent";
            if (type === "Independent") return !c.stage;
            return false;
          });
          if (!matches) return false;
        }

        const arr = c.latestFinancials?.arr ?? 0;
        if (arrMin !== null && arr < arrMin * 1e6) return false;
        if (arrMax !== null && arr > arrMax * 1e6) return false;
        const ebitda = c.latestFinancials?.ebitda ?? 0;
        if (ebitdaMin !== null && ebitda < ebitdaMin * 1e6) return false;
        if (ebitdaMax !== null && ebitda > ebitdaMax * 1e6) return false;
        const val = c.latestRound?.valuation_post ?? 0;
        if (valMin !== null && val < valMin * 1e9) return false;
        if (valMax !== null && val > valMax * 1e9) return false;
        if (empMin !== null && (c.employee_count ?? 0) < empMin) return false;
        if (empMax !== null && (c.employee_count ?? 0) > empMax) return false;
        if (fMin !== null && (c.founded_year ?? 0) < fMin) return false;
        if (fMax !== null && (c.founded_year ?? 0) > fMax) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name": av = a.name; bv = b.name; break;
          case "valuation": av = a.latestRound?.valuation_post ?? 0; bv = b.latestRound?.valuation_post ?? 0; break;
          case "arr": av = a.latestFinancials?.arr ?? 0; bv = b.latestFinancials?.arr ?? 0; break;
          case "score": av = a._score; bv = b._score; break;
        }
        if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [scoredCompanies, filters, sortKey, sortAsc]);

  const countries = useMemo(() => {
    if (!companies) return [];
    const set = new Set(companies.map((c: any) => c.hq_country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [companies]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c: any) => c.id)));
    }
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/5 animate-fade-in">
          <span className="text-sm font-medium text-foreground">
            <span className="font-mono text-primary">{selectedIds.size}</span> selected
          </span>
          <button
            onClick={() => bulkAddToPipeline.mutate(Array.from(selectedIds))}
            disabled={bulkAddToPipeline.isPending}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {bulkAddToPipeline.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add to Pipeline
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm font-medium text-foreground w-full md:cursor-default"
        >
          <Filter className="h-4 w-4 text-primary" /> Filters
          <span className="md:hidden ml-auto">
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </span>
        </button>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${!filtersOpen && isMobile ? "hidden" : ""}`}>
          <input
            type="text" placeholder="Search..." value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="h-8 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring col-span-1 sm:col-span-2 lg:col-span-1"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Revenue ($M):
            <input type="number" placeholder="Min" value={filters.arrMin} onChange={(e) => updateFilter("arrMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="Max" value={filters.arrMax} onChange={(e) => updateFilter("arrMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            EBITDA ($M):
            <input type="number" placeholder="Min" value={filters.ebitdaMin} onChange={(e) => updateFilter("ebitdaMin", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
            <span>–</span>
            <input type="number" placeholder="Max" value={filters.ebitdaMax} onChange={(e) => updateFilter("ebitdaMax", e.target.value)} className="h-8 w-20 px-2 rounded-md bg-secondary border border-border text-sm text-foreground" />
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
        <div className={`space-y-2 ${!filtersOpen && isMobile ? "hidden" : ""}`}>
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
          <div className="flex flex-wrap gap-1.5">
            {OWNERSHIP_TYPES.map((type) => (
              <button key={type} onClick={() => toggleArrayFilter("ownershipTypes", type)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filters.ownershipTypes.includes(type) ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                {type}
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
                <th className="px-3 py-2 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <SortHeader label="Company" sortId="name" />
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">Sector</th>
                <SortHeader label="Valuation" sortId="valuation" align="right" />
                <SortHeader label="Revenue" sortId="arr" align="right" />
                <SortHeader label="Score" sortId="score" align="right" />
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">Stage</th>
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">HQ</th>
                <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className={`border-b border-border/50 hover:bg-secondary/50 transition-colors ${selectedIds.has(c.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleSelect(c.id)} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.has(c.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
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
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/research?company=${c.id}&name=${encodeURIComponent(c.name)}&sector=${encodeURIComponent(c.sector ?? "")}`); }}
                        className="h-7 px-2 rounded text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" /> Research
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToPipeline.mutate(c.id); }}
                        className="h-7 px-2 rounded text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Pipeline
                      </button>
                    </div>
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

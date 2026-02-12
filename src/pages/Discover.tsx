import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancialsAll, formatCurrency } from "@/hooks/useData";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Check, Plus } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

const STAGES = ["Series A", "Series B", "Series C", "Series D", "Series E+", "Growth"];
const SECTORS = ["AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Infrastructure", "Climate Tech", "Other"];

const PRESETS = [
  { id: "growth", name: "Growth Stage", label: "Series A-C, $1M-50M ARR", stages: ["Series A", "Series B", "Series C"], minRevenue: 1e6, maxRevenue: 50e6 },
  { id: "valuations", name: "Unicorn Hunters", label: "<$500M valuation", maxValuation: 500e6 },
  { id: "quickbets", name: "Quick Bets", label: "AI/ML + Young", sectors: ["AI/ML"], maxAge: 3 },
];

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: companies, isLoading } = useCompaniesWithFinancialsAll();
  const [search, setSearch] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [revenueRange, setRevenueRange] = useState({ min: 0, max: 100e6 });
  const [valuationRange, setValuationRange] = useState({ min: 0, max: 1e9 });
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [quickPreview, setQuickPreview] = useState<any>(null);

  const filtered = useMemo(() => {
    if (!companies) return [];
    return companies
      .filter((c: any) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedSectors.length && !selectedSectors.includes(c.sector)) return false;
        if (selectedStages.length && !selectedStages.includes(c.stage)) return false;
        const revenue = c.latestFinancials?.revenue ?? c.latestFinancials?.arr ?? 0;
        if (revenue && (revenue < revenueRange.min || revenue > revenueRange.max)) return false;
        const valuation = c.latestRound?.valuation_post ?? 0;
        if (valuation && (valuation < valuationRange.min || valuation > valuationRange.max)) return false;
        return true;
      })
      .sort((a: any, b: any) => (b.latestRound?.valuation_post ?? 0) - (a.latestRound?.valuation_post ?? 0));
  }, [companies, search, selectedSectors, selectedStages, revenueRange, valuationRange]);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setSelectedSectors(preset.sectors || []);
    setSelectedStages(preset.stages || []);
    setRevenueRange({ min: preset.minRevenue ?? 0, max: preset.maxRevenue ?? 100e6 });
    setValuationRange({ min: 0, max: preset.maxValuation ?? 1e9 });
  };

  const handleAddToWatchlist = async (companyId: string, companyName: string) => {
    if (!user) { toast.error("Please sign in"); return; }
    try {
      const { data: watchlist } = await supabase.from("user_watchlists").select("id, company_ids").eq("user_id", user.id).eq("name", "Discovery Finds").maybeSingle();
      const newIds = watchlist ? [...(watchlist.company_ids ?? []), companyId] : [companyId];
      if (watchlist) {
        await supabase.from("user_watchlists").update({ company_ids: newIds }).eq("id", watchlist.id);
      } else {
        await supabase.from("user_watchlists").insert({ user_id: user.id, name: "Discovery Finds", company_ids: newIds });
      }
      toast.success(`Added ${companyName} to watchlist`);
    } catch (e) {
      toast.error("Failed to add to watchlist");
    }
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-3">Quick Filters</h3>
        <div className="space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p)}
              className="w-full text-left px-3 py-2 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm"
            >
              <p className="font-medium text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-3">Sectors</h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSectors(selectedSectors.includes(s) ? selectedSectors.filter((x) => x !== s) : [...selectedSectors, s])}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center justify-between ${selectedSectors.includes(s) ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50"}`}
            >
              {s}
              {selectedSectors.includes(s) && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-3">Funding Stage</h3>
        <div className="space-y-2">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStages(selectedStages.includes(s) ? selectedStages.filter((x) => x !== s) : [...selectedStages, s])}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center justify-between ${selectedStages.includes(s) ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50"}`}
            >
              {s}
              {selectedStages.includes(s) && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const CompanyCard = ({ company }: { company: any }) => {
    const valuation = company.latestRound?.valuation_post ?? 0;
    const revenue = company.latestFinancials?.revenue ?? company.latestFinancials?.arr ?? 0;
    const multiple = revenue > 0 ? (valuation / revenue).toFixed(1) : "—";

    return (
      <motion.button
        variants={fadeUp}
        onClick={() => navigate(`/companies/${company.id}`)}
        className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all p-4 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <CompanyAvatar name={company.name} sector={company.sector} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{company.name}</h3>
              <p className="text-[11px] text-muted-foreground">{company.sector || "—"}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(company.id, company.name); }}
            className="h-8 w-8 rounded-md border border-border hover:bg-primary/10 flex items-center justify-center transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground">Valuation</p>
            <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(valuation)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Revenue / ARR</p>
            <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(revenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">EV/Revenue</p>
            <p className="text-sm font-mono font-semibold text-foreground">{multiple}x</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Stage</p>
            <p className="text-sm font-mono font-semibold text-foreground">{company.stage || "—"}</p>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setQuickPreview(company); }}
          className="w-full h-8 text-xs font-medium rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          Quick Preview
        </button>
      </motion.button>
    );
  };

  return (
    <div className="flex h-full gap-6 p-4 sm:p-6">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 shrink-0 overflow-y-auto border-r border-border pr-6">
          {filterPanel}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Discover</h1>
            {isMobile && (
              <button onClick={() => setShowFilters(!showFilters)} className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary">
                <Filter className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-primary">{filtered.length}</span> companies match your criteria
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-48 rounded-lg bg-skeleton animate-pulse" />
              ))
            ) : filtered.length > 0 ? (
              filtered.map((c) => <CompanyCard key={c.id} company={c} />)
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No companies match your filters</div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobile && showFilters && (
        <Drawer open={showFilters} onOpenChange={setShowFilters}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">{filterPanel}</div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Quick Preview Modal */}
      <Dialog open={!!quickPreview} onOpenChange={() => setQuickPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{quickPreview?.name}</DialogTitle>
          </DialogHeader>
          {quickPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Valuation</p>
                  <p className="text-base font-mono font-bold text-foreground">{formatCurrency(quickPreview.latestRound?.valuation_post)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Revenue / ARR</p>
                  <p className="text-base font-mono font-bold text-foreground">{formatCurrency(quickPreview.latestFinancials?.revenue ?? quickPreview.latestFinancials?.arr)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Stage</p>
                  <p className="text-base font-mono font-bold text-foreground">{quickPreview.stage || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Employees</p>
                  <p className="text-base font-mono font-bold text-foreground">{quickPreview.employee_count?.toLocaleString() || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Founded</p>
                  <p className="text-base font-mono font-bold text-foreground">{quickPreview.founded_year || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">HQ</p>
                  <p className="text-base font-mono font-bold text-foreground">{quickPreview.hq_country || "—"}</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => { navigate(`/companies/${quickPreview.id}`); setQuickPreview(null); }}>
                View Full Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

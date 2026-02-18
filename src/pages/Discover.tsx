import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Compass, Sparkles, Bell, ArrowRight, Target, TrendingUp, Globe, AlertTriangle, Search, Plus, Building2, Zap, Filter, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";

const SECTORS = ["Technology", "Healthcare", "Financial Services", "Real Estate", "Energy", "Consumer", "Industrials", "Infrastructure"];

const Discover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Company search
  const { data: searchResults } = useQuery({
    queryKey: ["discover-search", searchQuery],
    queryFn: async () => {
      let q = supabase
        .from("companies")
        .select("id, name, sector, description, hq_country, stage, employee_count, market_type")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (searchQuery.length >= 2) {
        q = q.ilike("name", `%${searchQuery}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Browse companies (when not searching)
  const { data: browseCompanies } = useQuery({
    queryKey: ["discover-browse", sectorFilter],
    queryFn: async () => {
      let q = supabase
        .from("companies")
        .select("id, name, sector, description, hq_country, stage, employee_count, market_type")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (sectorFilter) q = q.eq("sector", sectorFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length < 2,
  });

  // Recent signals
  const { data: signals } = useQuery({
    queryKey: ["discover-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_notifications")
        .select("*, companies(id, name, sector)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Market events
  const { data: marketEvents } = useQuery({
    queryKey: ["discover-market-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*, companies(id, name, sector)")
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Distressed opportunities
  const { data: distressed } = useQuery({
    queryKey: ["discover-distressed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distressed_assets")
        .select("id, name, asset_type, asking_price, discount_pct, sector, distress_type, status, description")
        .eq("status", "active")
        .order("listed_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Open Room: add company to pipeline and navigate
  const openRoom = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Check if already in pipeline
      const { data: existing } = await supabase
        .from("deal_pipeline")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("deal_pipeline")
        .insert({ company_id: companyId, user_id: user.id, stage: "sourced" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Room opened");
      navigate(`/deals/${dealId}`);
    },
    onError: () => toast.error("Failed to open room"),
  });

  const displayCompanies = searchQuery.length >= 2 ? searchResults : browseCompanies;

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Discover
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Surface rooms worth opening. Search, filter, and open a Deal Room in one click.
            </p>
          </div>
          <button
            onClick={() => navigate("/deals/recommended")}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> AI Deal Matcher
          </button>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies by name..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors ${showFilters ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pb-2">
                  <button
                    onClick={() => setSectorFilter(null)}
                    className={`h-7 px-3 rounded-full text-xs transition-colors ${!sectorFilter ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}
                  >
                    All Sectors
                  </button>
                  {SECTORS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
                      className={`h-7 px-3 rounded-full text-xs transition-colors ${sectorFilter === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Companies grid - the sourcing engine */}
        {displayCompanies && displayCompanies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {searchQuery.length >= 2 ? `Results for "${searchQuery}"` : "Companies"}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayCompanies.map((company: any, i: number) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyAvatar name={company.name} sector={company.sector} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{company.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {company.sector && <span className="text-[11px] text-muted-foreground">{company.sector}</span>}
                          {company.hq_country && <span className="text-[11px] text-muted-foreground">· {company.hq_country}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {company.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{company.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {company.stage && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{company.stage}</span>
                      )}
                      {company.employee_count && (
                        <span className="text-[10px] text-muted-foreground">{company.employee_count.toLocaleString()} emp</span>
                      )}
                    </div>
                    <button
                      onClick={() => openRoom.mutate(company.id)}
                      disabled={openRoom.isPending}
                      className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" /> Open Room
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate("/deals/recommended")}
                className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">AI Deal Matcher</p>
                <p className="text-xs text-muted-foreground mt-0.5">Analyze pipeline & find matching opportunities</p>
              </button>
              <button
                onClick={() => navigate("/deals/flow")}
                className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Pipeline</p>
                <p className="text-xs text-muted-foreground mt-0.5">View & manage your deal pipeline</p>
              </button>
              <button
                onClick={() => navigate("/data-room")}
                className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Import Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ingest companies, financials & contacts via CSV</p>
              </button>
            </div>

            {/* Market Intelligence */}
            {marketEvents && marketEvents.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Market Intelligence
                  </h2>
                </div>
                <div className="divide-y divide-border/50">
                  {marketEvents.map((event: any, i: number) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <p className="text-sm text-foreground font-medium">{event.headline}</p>
                      {event.detail && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.detail}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {event.companies?.name && (
                          <button
                            onClick={() => openRoom.mutate(event.companies.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            {event.companies.name} → Open Room
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(event.published_at ?? event.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Signal Feed */}
            {signals && signals.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Signals
                  </h2>
                  <button onClick={() => navigate("/alerts")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">
                    View All
                  </button>
                </div>
                <div className="divide-y divide-border/50">
                  {signals.map((signal: any) => (
                    <div key={signal.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <p className="text-sm text-foreground">{signal.title}</p>
                      {signal.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{signal.detail}</p>}
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Distressed */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Distressed Opportunities
                </h2>
              </div>
              {!distressed?.length ? (
                <div className="p-6 text-center">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No active distressed assets</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {distressed.map((asset: any) => (
                    <div key={asset.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                      {asset.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {asset.asset_type} · {asset.sector ?? "—"}
                        </span>
                        {asset.discount_pct && (
                          <span className="text-xs font-mono font-medium text-warning">{asset.discount_pct}% off</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Discover;

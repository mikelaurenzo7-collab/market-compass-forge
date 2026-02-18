import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Compass, Sparkles, Bell, ArrowRight, Target, TrendingUp, Globe, AlertTriangle, Search, Plus, Building2, Zap, Filter, X, MapPin, DollarSign, Users, BarChart3, Clock, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";
import { useWatchlists } from "@/components/WatchlistManager";

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
        .select("id, name, sector, description, hq_country, stage, employee_count, market_type, domain, founded_year")
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
        .select("id, name, sector, description, hq_country, stage, employee_count, market_type, domain, founded_year")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (sectorFilter) q = q.eq("sector", sectorFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length < 2,
  });

  // Sector breakdown for trending widget
  const { data: sectorCounts } = useQuery({
    queryKey: ["discover-sector-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("sector")
        .not("sector", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c) => { if (c.sector) counts[c.sector] = (counts[c.sector] ?? 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    },
    staleTime: 60_000,
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

  // Global opportunities
  const { data: globalOpps } = useQuery({
    queryKey: ["discover-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_opportunities")
        .select("*")
        .in("status", ["active", null as any])
        .order("created_at", { ascending: false })
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
        .select("id, name, asset_type, asking_price, discount_pct, sector, distress_type, status, description, location_city, location_state")
        .eq("status", "active")
        .order("listed_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Recent deal transactions
  const { data: recentDeals } = useQuery({
    queryKey: ["discover-recent-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_transactions")
        .select("*")
        .order("announced_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Pipeline count for context
  const { data: pipelineCount } = useQuery({
    queryKey: ["discover-pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("deal_pipeline")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Watchlist quick-add
  const { data: watchlists } = useWatchlists();

  const defaultWatchlistId = useMemo(() => watchlists?.[0]?.id ?? null, [watchlists]);
  const watchedCompanyIds = useMemo(() => {
    const ids = new Set<string>();
    (watchlists ?? []).forEach((wl) => {
      ((wl.company_ids ?? []) as string[]).forEach((id) => ids.add(id));
    });
    return ids;
  }, [watchlists]);

  const toggleWatch = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isWatched = watchedCompanyIds.has(companyId);

      if (isWatched) {
        // Remove from all watchlists
        for (const wl of (watchlists ?? [])) {
          const ids = (wl.company_ids ?? []) as string[];
          if (ids.includes(companyId)) {
            await supabase
              .from("user_watchlists")
              .update({ company_ids: ids.filter((id) => id !== companyId) })
              .eq("id", wl.id);
          }
        }
      } else {
        // Add to default watchlist or create one
        if (defaultWatchlistId) {
          const wl = watchlists!.find((w) => w.id === defaultWatchlistId)!;
          const existing = (wl.company_ids ?? []) as string[];
          await supabase
            .from("user_watchlists")
            .update({ company_ids: [...existing, companyId] })
            .eq("id", defaultWatchlistId);
        } else {
          await supabase.from("user_watchlists").insert({
            name: "Watchlist",
            user_id: user.id,
            company_ids: [companyId],
          });
        }
      }
    },
    onSuccess: (_, companyId) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      const wasWatched = watchedCompanyIds.has(companyId);
      toast.success(wasWatched ? "Removed from watchlist" : "Added to watchlist");
    },
    onError: () => toast.error("Failed to update watchlist"),
  });

  // Open Room: add company to pipeline and navigate
  const openRoom = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user) throw new Error("Not authenticated");
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

  const formatValue = (val: number | null) => {
    if (!val) return null;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  };

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
              Surface rooms worth opening.
              {pipelineCount != null && pipelineCount > 0 && (
                <span className="ml-2 text-primary font-mono">{pipelineCount} deals in pipeline</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/deals")}
              className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" /> Pipeline
            </button>
            <button
              onClick={() => navigate("/deals/recommended")}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> AI Deal Matcher
            </button>
          </div>
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

        {/* Companies grid */}
        {displayCompanies && displayCompanies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {searchQuery.length >= 2 ? `Results for "${searchQuery}"` : "Companies"}
              </h2>
              <span className="text-[10px] text-muted-foreground font-mono">{displayCompanies.length} results</span>
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
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {company.stage && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{company.stage}</span>
                    )}
                    {company.employee_count && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" /> {company.employee_count.toLocaleString()}
                      </span>
                    )}
                    {company.founded_year && (
                      <span className="text-[10px] text-muted-foreground">Est. {company.founded_year}</span>
                    )}
                    {company.domain && (
                      <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline truncate max-w-[120px]">
                        {company.domain}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWatch.mutate(company.id); }}
                      disabled={toggleWatch.isPending}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                        watchedCompanyIds.has(company.id)
                          ? "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20"
                          : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {watchedCompanyIds.has(company.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {watchedCompanyIds.has(company.id) ? "Watching" : "Watch"}
                    </button>
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

            {/* Recent Deal Transactions */}
            {recentDeals && recentDeals.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" /> Recent Transactions
                  </h2>
                  <button onClick={() => navigate("/deals/flow")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">
                    View All
                  </button>
                </div>
                <div className="divide-y divide-border/50">
                  {recentDeals.map((deal: any, i: number) => (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{deal.target_company}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">{deal.deal_type}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {deal.deal_value && <span className="text-xs font-mono text-foreground">{formatValue(deal.deal_value)}</span>}
                        {deal.acquirer_investor && <span className="text-[10px] text-muted-foreground">by {deal.acquirer_investor}</span>}
                        {deal.target_industry && <span className="text-[10px] text-muted-foreground">· {deal.target_industry}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Sector Heatmap */}
            {sectorCounts && sectorCounts.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Sector Coverage
                  </h2>
                </div>
                <div className="p-3 space-y-1.5">
                  {sectorCounts.map(([sector, count], i) => {
                    const maxCount = sectorCounts[0][1] as number;
                    const pct = (count as number) / (maxCount as number) * 100;
                    return (
                      <button
                        key={sector}
                        onClick={() => { setSectorFilter(sectorFilter === sector ? null : sector); setShowFilters(true); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${sectorFilter === sector ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-foreground"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="truncate font-medium">{sector}</span>
                            <span className="font-mono text-muted-foreground ml-2">{count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.05, duration: 0.4 }}
                              className="h-full rounded-full bg-primary/60"
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Global Opportunities */}
            {globalOpps && globalOpps.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-chart-4" /> Global Opportunities
                  </h2>
                </div>
                <div className="divide-y divide-border/50">
                  {globalOpps.map((opp: any) => (
                    <div key={opp.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <p className="text-sm font-medium text-foreground truncate">{opp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {opp.country}
                        </span>
                        {opp.sector && <span className="text-[10px] text-muted-foreground">· {opp.sector}</span>}
                      </div>
                      {opp.deal_value_usd && (
                        <span className="text-xs font-mono text-primary mt-1 inline-block">{formatValue(opp.deal_value_usd)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distressed Opportunities */}
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{asset.asset_type}</span>
                          {asset.location_city && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              · <MapPin className="h-2.5 w-2.5" /> {asset.location_city}{asset.location_state ? `, ${asset.location_state}` : ""}
                            </span>
                          )}
                        </div>
                        {asset.discount_pct && (
                          <span className="text-xs font-mono font-medium text-warning">{asset.discount_pct}% off</span>
                        )}
                      </div>
                      {asset.asking_price && (
                        <span className="text-[10px] font-mono text-primary mt-1 inline-block">{formatValue(asset.asking_price)}</span>
                      )}
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

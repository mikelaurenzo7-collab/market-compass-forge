import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Compass, Sparkles, Bell, ArrowRight, Zap, Target, TrendingUp, Building2, Globe, AlertTriangle, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import CreateDealButton from "@/components/CreateDealButton";

const Discover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"signals" | "matcher">("signals");

  // Recent signals from alert_notifications
  const { data: signals } = useQuery({
    queryKey: ["discover-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_notifications")
        .select("*, companies(id, name, sector)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Recent activity events as market intel
  const { data: marketEvents } = useQuery({
    queryKey: ["discover-market-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*, companies(id, name, sector)")
        .order("published_at", { ascending: false })
        .limit(15);
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
        .select("id, name, asset_type, asking_price, discount_pct, sector, distress_type, status")
        .eq("status", "active")
        .order("listed_date", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Discover
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Surface rooms worth opening. Signals, opportunities, and AI-matched deals.
            </p>
          </div>
          <button
            onClick={() => navigate("/deals/recommended")}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> AI Deal Matcher
          </button>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/deals/recommended")}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Target className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">AI Deal Matcher</p>
            <p className="text-xs text-muted-foreground mt-0.5">Analyze your pipeline and find matching opportunities</p>
          </button>
          <button
            onClick={() => setActiveSection("signals")}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Bell className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Signal Feed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Latest alerts and market-moving events</p>
          </button>
          <button
            onClick={() => navigate("/deals/flow")}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Pipeline</p>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage your deal pipeline</p>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Market Events + Signals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market events */}
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Market Intelligence
                </h2>
              </div>
              {!marketEvents?.length ? (
                <div className="p-8 text-center">
                  <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent market events</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {marketEvents.map((event: any, i: number) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground font-medium">{event.headline}</p>
                          {event.detail && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.detail}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {event.companies?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {event.companies.name}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(event.published_at ?? event.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Signal feed */}
            {signals && signals.length > 0 && (
              <div className="rounded-lg border border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Recent Signals
                  </h2>
                  <button
                    onClick={() => navigate("/alerts")}
                    className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-border/50">
                  {signals.slice(0, 10).map((signal: any) => (
                    <div key={signal.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <p className="text-sm text-foreground">{signal.title}</p>
                      {signal.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{signal.detail}</p>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Distressed opportunities */}
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
                    <div key={asset.id} className="px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                      <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
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

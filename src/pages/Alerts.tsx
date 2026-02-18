import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Plus, Trash2, Loader2, Check, X, BellRing, Eye, EyeOff, FileText, AlertTriangle, TrendingDown, Zap } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const SECTOR_OPTIONS = ["AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3", "Climate Tech", "EdTech", "E-Commerce"];
const ROUND_OPTIONS = ["Seed", "Series A", "Series B", "Series C", "Series D", "Late Stage", "IPO"];
import { Building, ShieldAlert, BarChart3 } from "lucide-react";

const ALERT_TYPES = [
  { value: "custom", label: "Custom", icon: <Zap className="h-3.5 w-3.5" />, description: "Funding rounds & events", module: "general" },
  { value: "sec_filing", label: "SEC Filing", icon: <FileText className="h-3.5 w-3.5" />, description: "10-K, 10-Q, 8-K filings", module: "general" },
  { value: "distressed_new", label: "Distressed", icon: <AlertTriangle className="h-3.5 w-3.5" />, description: "New distressed assets", module: "distressed" },
  { value: "auction_event", label: "Auction", icon: <AlertTriangle className="h-3.5 w-3.5" />, description: "Auction dates & bid deadlines", module: "distressed" },
  { value: "covenant_breach", label: "Covenant Breach", icon: <ShieldAlert className="h-3.5 w-3.5" />, description: "DSCR or LTV covenant violations", module: "distressed" },
  { value: "price_move", label: "Price Move", icon: <TrendingDown className="h-3.5 w-3.5" />, description: "Significant price changes", module: "general" },
  { value: "occupancy_drop", label: "Occupancy Drop", icon: <Building className="h-3.5 w-3.5" />, description: "Occupancy falls below threshold", module: "real_estate" },
  { value: "caprate_shift", label: "Cap Rate Shift", icon: <BarChart3 className="h-3.5 w-3.5" />, description: "Cap rate spread widens/narrows", module: "real_estate" },
];

const Alerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [alertType, setAlertType] = useState("custom");
  const [sector, setSector] = useState("");
  const [roundType, setRoundType] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [keywords, setKeywords] = useState("");

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["user-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["alert-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_notifications")
        .select("*, companies:company_id(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createAlert = useMutation({
    mutationFn: async () => {
      const conditions: Record<string, any> = {};
      if (sector) conditions.sector = sector;
      if (roundType) conditions.round_type = roundType;
      if (minAmount) conditions.min_amount = Number(minAmount) * 1e6;
      if (keywords) conditions.keywords = keywords.split(",").map((k: string) => k.trim());

      const selectedType = ALERT_TYPES.find(t => t.value === alertType);
      const { error } = await supabase.from("user_alerts").insert({
        user_id: user!.id,
        name,
        alert_type: alertType,
        module: selectedType?.module ?? "general",
        conditions,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-alerts"] });
      setShowCreate(false);
      setName(""); setAlertType("custom"); setSector(""); setRoundType(""); setMinAmount(""); setKeywords("");
      toast({ title: "Alert created", description: "You'll be notified when conditions are met." });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-alerts"] }),
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("user_alerts").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-alerts"] }),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-notifications"] }),
  });

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ["alert-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <PageTransition>
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor companies, sectors and investor activity. <span className="font-mono text-primary">{unreadCount}</span> unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => {
                const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) ?? [];
                if (!unreadIds.length) return;
                Promise.all(unreadIds.map(nid => supabase.from("alert_notifications").update({ is_read: true }).eq("id", nid)))
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["alert-notifications"] });
                    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
                    toast({ title: "All notifications marked as read" });
                  });
              }}
              className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Check className="h-4 w-4" /> Mark All Read
            </button>
          )}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Alert
          </button>
        </div>
      </div>

      {/* Create Alert Form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">Create Alert Rule</h3>
          {/* Alert type selector */}
          <div className="flex gap-2 flex-wrap">
            {ALERT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setAlertType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                  alertType === t.value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alert name (e.g. 'Cybersecurity Series B+')"
              className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Any sector</option>
              {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {alertType === "custom" && (
              <select
                value={roundType}
                onChange={(e) => setRoundType(e.target.value)}
                className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Any round type</option>
                {ROUND_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {(alertType === "custom" || alertType === "distressed_new") && (
              <input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder={alertType === "distressed_new" ? "Max price ($M)" : "Min amount ($M)"}
                type="number"
                className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Keywords (comma-separated)"
              className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring col-span-full md:col-span-1"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createAlert.mutate()}
              disabled={!name.trim() || createAlert.isPending}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {createAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-md bg-secondary text-foreground text-sm hover:bg-secondary/80 flex items-center gap-2"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active alerts */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Active Alerts</h3>
          {alertsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : alerts && alerts.length > 0 ? (
            alerts.map((alert) => {
              const cond = alert.conditions as Record<string, any>;
              return (
                <div key={alert.id} className="rounded-lg border border-border bg-card p-3 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className={`h-4 w-4 ${alert.is_active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium text-foreground">{alert.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleAlert.mutate({ id: alert.id, is_active: !alert.is_active })}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground"
                        title={alert.is_active ? "Pause" : "Activate"}
                      >
                        {alert.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => deleteAlert.mutate(alert.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(alert as any).alert_type && (alert as any).alert_type !== "custom" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium uppercase">{(alert as any).alert_type.replace("_", " ")}</span>
                    )}
                    {cond.sector && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">{cond.sector}</span>}
                    {cond.round_type && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">{cond.round_type}+</span>}
                    {cond.min_amount && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">≥${(cond.min_amount / 1e6).toFixed(0)}M</span>}
                    {cond.keywords?.map((k: string) => <span key={k} className="px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">"{k}"</span>)}
                  </div>
                  {!alert.is_active && <p className="text-[10px] text-muted-foreground mt-1">Paused</p>}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <Bell className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No alerts configured</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Notifications</h3>
          {notifications && notifications.length > 0 ? (
            <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${n.is_read ? "bg-muted" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{n.title}</p>
                    {n.detail && <p className="text-xs text-muted-foreground mt-0.5">{n.detail}</p>}
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Bell className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create an alert rule to start monitoring</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Alerts;

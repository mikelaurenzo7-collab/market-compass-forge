import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Zap, FileText, Sparkles, TrendingUp } from "lucide-react";

const USAGE_CONFIG = [
  { action: "ai_research", label: "AI Queries", icon: Sparkles, limit: 100 },
  { action: "memo_generation", label: "Memos", icon: FileText, limit: 50 },
  { action: "enrichment", label: "Enrichments", icon: TrendingUp, limit: 50 },
];

const UsageMeters = () => {
  const { user } = useAuth();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: usageCounts } = useQuery({
    queryKey: ["usage-meters", user?.id],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const config of USAGE_CONFIG) {
        const { count } = await supabase
          .from("usage_tracking")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("action", config.action)
          .gte("created_at", startOfDay.toISOString());
        counts[config.action] = count ?? 0;
      }
      return counts;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Today's Usage</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
          Professional
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {USAGE_CONFIG.map((config) => {
          const used = usageCounts?.[config.action] ?? 0;
          const limit = config.limit;
          const pct = Math.min(100, (used / limit) * 100);
          const isNearLimit = pct >= 80;

          return (
            <div key={config.action} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <config.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                </div>
                <span className={`text-xs font-mono ${isNearLimit ? "text-warning" : "text-muted-foreground"}`}>
                  {used} / {limit}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageMeters;

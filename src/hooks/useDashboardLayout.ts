import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  section: "full" | "main" | "sidebar";
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "morning-briefing", label: "Morning Briefing", visible: true, order: 0, section: "full" },
  { id: "quick-actions", label: "Quick Actions", visible: true, order: 1, section: "full" },
  { id: "alpha-signals", label: "Alpha Signals", visible: true, order: 2, section: "full" },
  { id: "companies-table", label: "Companies Table", visible: true, order: 3, section: "main" },
  { id: "pipeline-deals", label: "Pipeline Deals", visible: true, order: 4, section: "sidebar" },
  { id: "watchlists", label: "Watchlists", visible: true, order: 5, section: "sidebar" },
  { id: "distressed", label: "Distressed Opportunities", visible: true, order: 6, section: "sidebar" },
  { id: "news-wire", label: "News Wire", visible: true, order: 7, section: "sidebar" },
];

function mergeWithDefaults(saved: Partial<WidgetConfig>[] | null): WidgetConfig[] {
  if (!saved || saved.length === 0) return [...DEFAULT_WIDGETS];

  const savedMap = new Map(saved.map((w) => [w.id, w]));
  const merged = DEFAULT_WIDGETS.map((def) => {
    const s = savedMap.get(def.id);
    if (s) {
      return { ...def, visible: s.visible ?? def.visible, order: s.order ?? def.order };
    }
    return { ...def };
  });

  return merged.sort((a, b) => a.order - b.order);
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: widgets = DEFAULT_WIDGETS, isLoading } = useQuery({
    queryKey: ["dashboard-layout", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("dashboard_widgets")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const saved = (data?.dashboard_widgets as any)?.widgets ?? null;
      return mergeWithDefaults(saved);
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      const payload = {
        widgets: newWidgets.map(({ id, visible, order }) => ({ id, visible, order })),
      };
      const { error } = await supabase
        .from("profiles")
        .update({ dashboard_widgets: payload as any })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
    },
  });

  const fullWidgets = widgets.filter((w) => w.visible && w.section === "full");
  const mainWidgets = widgets.filter((w) => w.visible && w.section === "main");
  const sidebarWidgets = widgets.filter((w) => w.visible && w.section === "sidebar");

  const resetToDefaults = () => {
    updateMutation.mutate([...DEFAULT_WIDGETS]);
  };

  return {
    widgets,
    fullWidgets,
    mainWidgets,
    sidebarWidgets,
    isLoading,
    updateWidgets: updateMutation.mutate,
    resetToDefaults,
  };
}

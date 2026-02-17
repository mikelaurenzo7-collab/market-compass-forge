import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CalendarConfig } from "@/lib/integrations";

export function useCalendarSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: setting } = useQuery({
    queryKey: ["integration-settings", "calendar", user?.id],
    queryFn: async () => {
      // Check for either Google Calendar or Outlook Calendar
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .in("integration_type", ["google_calendar", "outlook_calendar"]);
      // Return the first connected calendar
      return data?.find((s) => s.enabled) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const config = (setting?.config ?? {}) as CalendarConfig;
  const isConfigured = !!(setting?.enabled && (config.access_token || config.connected_at));
  const provider = setting?.integration_type ?? null;

  const pushDealEvent = async (dealId: string, eventData: { title: string; date: string; description?: string }) => {
    if (!isConfigured) return;
    try {
      const { error } = await supabase.functions.invoke("calendar-sync", {
        body: {
          action: "push",
          deal_id: dealId,
          event: eventData,
          provider: config.provider,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      toast.success("Event synced to calendar");
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    } catch {
      toast.error("Calendar sync failed");
    }
  };

  const pullEvents = async (): Promise<unknown[]> => {
    if (!isConfigured) return [];
    try {
      const { data, error } = await supabase.functions.invoke("calendar-sync", {
        body: {
          action: "pull",
          provider: config.provider,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return (data as Record<string, unknown[]>)?.events ?? [];
    } catch {
      return [];
    }
  };

  return {
    isConfigured,
    config,
    provider,
    pushDealEvent,
    pullEvents,
    lastSyncAt: config.last_sync_at ?? null,
  };
}

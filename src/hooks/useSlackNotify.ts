import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SlackNotificationType =
  | "deal_stage_change"
  | "deal_added"
  | "alert_triggered"
  | "intelligence_summary"
  | "portfolio_update"
  | "watchlist_update";

export function useSlackNotify() {
  const { user } = useAuth();

  const { data: slackConfig } = useQuery({
    queryKey: ["integration-settings", "slack", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("integration_type", "slack")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const notify = async (type: SlackNotificationType, data: Record<string, any>, dealId?: string) => {
    if (!slackConfig?.enabled || !slackConfig?.config) return;

    const config = slackConfig.config as { channel?: string; notifications?: Record<string, boolean> };
    const channel = config.channel;
    if (!channel) return;

    // Check if this notification type is enabled
    if (config.notifications && config.notifications[type] === false) return;

    try {
      await supabase.functions.invoke("slack-notify", {
        body: { type, channel, data: { ...data, deal_id: dealId }, user_id: user?.id },
      });
    } catch (e) {
      console.error("Slack notification failed:", e);
    }
  };

  return {
    notify,
    isConfigured: !!(slackConfig?.enabled && (slackConfig?.config as any)?.channel),
  };
}

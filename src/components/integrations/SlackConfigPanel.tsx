import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { IntegrationState } from "@/hooks/useIntegrations";

const NOTIFICATION_TYPES = [
  { key: "deal_stage_change", label: "Deal stage changes" },
  { key: "deal_added", label: "New deals added" },
  { key: "alert_triggered", label: "Alert notifications" },
  { key: "intelligence_summary", label: "Intelligence signals" },
  { key: "portfolio_update", label: "Portfolio updates" },
  { key: "watchlist_update", label: "Watchlist activity" },
];

interface Props {
  state: IntegrationState;
  onUpdate: (config: Record<string, unknown>) => void;
}

export default function SlackConfigPanel({ state, onUpdate }: Props) {
  const { user } = useAuth();
  const config = state.config as Record<string, unknown>;
  const [channel, setChannel] = useState((config.channel as string) ?? "");
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    (config.notifications as Record<string, boolean>) ?? Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true]))
  );
  const [deepLinks, setDeepLinks] = useState((config.deep_links as boolean) ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChannel((config.channel as string) ?? "");
    setNotifications(
      (config.notifications as Record<string, boolean>) ?? Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true]))
    );
    setDeepLinks((config.deep_links as boolean) ?? true);
  }, [config.channel, config.notifications, config.deep_links]);

  const testSlack = async () => {
    if (!channel) return toast.error("Set a channel first");
    try {
      const { error } = await supabase.functions.invoke("slack-notify", {
        body: {
          type: "deal_added",
          channel,
          data: { company_name: "Test Company", stage: "Watching", sector: "Technology" },
        },
      });
      if (error) throw error;
      toast.success("Test message sent to Slack!");
    } catch {
      toast.error("Failed to send test message");
    }
  };

  const handleSave = () => {
    setSaving(true);
    onUpdate({ channel, notifications, deep_links: deepLinks });
    setTimeout(() => setSaving(false), 500);
    toast.success("Slack settings saved");
  };

  const { data: slackLog } = useQuery({
    queryKey: ["slack-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("slack_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Channel</label>
        <div className="flex gap-2">
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#deal-flow"
            className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={testSlack}
            className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5"
          >
            <Send className="h-3 w-3" /> Test
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Use channel name or ID</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Notification Types</label>
        <div className="grid grid-cols-2 gap-2">
          {NOTIFICATION_TYPES.map((n) => (
            <label key={n.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={notifications[n.key] !== false}
                onChange={(e) => setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))}
                className="rounded border-border"
              />
              {n.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={deepLinks}
          onChange={(e) => setDeepLinks(e.target.checked)}
          className="rounded border-border"
        />
        Include "View in Grapevine" deep links
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Save
      </button>

      {slackLog && slackLog.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Notifications</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {slackLog.map((entry: Record<string, unknown>) => (
              <div key={entry.id as string} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                <span className="text-foreground">{(entry.message_type as string).replace(/_/g, " ")}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  entry.status === "sent" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {entry.status as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

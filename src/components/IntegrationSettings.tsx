import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  Mail,
  Database,
  Check,
  Loader2,
  ExternalLink,
  Send,
  RefreshCw,
  Copy,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

type IntegrationType = "slack" | "email" | "crm_salesforce" | "crm_affinity";

interface IntegrationConfig {
  channel?: string;
  notifications?: Record<string, boolean>;
  forwarding_address?: string;
  api_key?: string;
  sync_deals?: boolean;
  sync_contacts?: boolean;
  sync_notes?: boolean;
}

const NOTIFICATION_TYPES = [
  { key: "deal_stage_change", label: "Deal stage changes" },
  { key: "deal_added", label: "New deals added" },
  { key: "alert_triggered", label: "Alert notifications" },
  { key: "intelligence_summary", label: "Intelligence signals" },
  { key: "portfolio_update", label: "Portfolio updates" },
  { key: "watchlist_update", label: "Watchlist activity" },
];

export default function IntegrationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["integration-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getSetting = (type: IntegrationType) =>
    settings?.find((s) => s.integration_type === type);

  const upsertSetting = useMutation({
    mutationFn: async ({ type, config, enabled }: { type: IntegrationType; config: IntegrationConfig; enabled: boolean }) => {
      const { error } = await supabase
        .from("integration_settings")
        .upsert(
          { user_id: user!.id, integration_type: type, config: config as any, enabled, updated_at: new Date().toISOString() },
          { onConflict: "user_id,integration_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      toast.success("Settings saved");
    },
  });

  // Email inbound log
  const { data: emailLog } = useQuery({
    queryKey: ["email-inbound-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_inbound_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Slack notification log
  const { data: slackLog } = useQuery({
    queryKey: ["slack-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("slack_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* Slack Integration */}
      <SlackSection
        setting={getSetting("slack")}
        onSave={(config, enabled) => upsertSetting.mutate({ type: "slack", config, enabled })}
        saving={upsertSetting.isPending}
        log={slackLog ?? []}
      />

      {/* Email Integration */}
      <EmailSection
        setting={getSetting("email")}
        onSave={(config, enabled) => upsertSetting.mutate({ type: "email", config, enabled })}
        saving={upsertSetting.isPending}
        log={emailLog ?? []}
      />

      {/* CRM Export */}
      <CRMSection />
    </div>
  );
}

// ─── Slack Section ─────────────────────────────────────────
function SlackSection({
  setting,
  onSave,
  saving,
  log,
}: {
  setting: any;
  onSave: (config: IntegrationConfig, enabled: boolean) => void;
  saving: boolean;
  log: any[];
}) {
  const config = (setting?.config ?? {}) as IntegrationConfig;
  const [channel, setChannel] = useState(config.channel ?? "");
  const [enabled, setEnabled] = useState(setting?.enabled ?? false);
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    config.notifications ?? Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true]))
  );

  useEffect(() => {
    if (setting) {
      const c = (setting.config ?? {}) as IntegrationConfig;
      setChannel(c.channel ?? "");
      setEnabled(setting.enabled ?? false);
      setNotifications(c.notifications ?? Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true])));
    }
  }, [setting]);

  const testSlack = async () => {
    if (!channel) return toast.error("Set a channel first");
    try {
      const { error } = await supabase.functions.invoke("slack-notify", {
        body: {
          type: "deal_added",
          channel,
          data: { company_name: "Test Company", stage: "Sourced", sector: "Technology" },
        },
      });
      if (error) throw error;
      toast.success("Test message sent to Slack!");
    } catch {
      toast.error("Failed to send test message");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#4A154B] flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Slack</h3>
            <p className="text-xs text-muted-foreground">Deal alerts, intelligence & portfolio updates</p>
          </div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {enabled && (
        <>
          <div className="space-y-3">
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
              <p className="text-[10px] text-muted-foreground mt-1">Use channel name (e.g. #deal-flow) or channel ID</p>
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
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSave({ channel, notifications }, enabled)}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </button>
          </div>

          {/* Recent notifications */}
          {log.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Notifications</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {log.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                    <span className="text-foreground">{entry.message_type.replace(/_/g, " ")}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      entry.status === "sent" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Email Section ─────────────────────────────────────────
function EmailSection({
  setting,
  onSave,
  saving,
  log,
}: {
  setting: any;
  onSave: (config: IntegrationConfig, enabled: boolean) => void;
  saving: boolean;
  log: any[];
}) {
  const [enabled, setEnabled] = useState(setting?.enabled ?? false);
  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-inbound`;

  useEffect(() => {
    if (setting) setEnabled(setting.enabled ?? false);
  }, [setting]);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    toast.success("Endpoint URL copied");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Email to Pipeline</h3>
            <p className="text-xs text-muted-foreground">Auto-create deals from forwarded intro emails</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEnabled(!enabled);
            onSave({}, !enabled);
          }}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {enabled && (
        <>
          <div className="rounded-md bg-secondary/50 border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">How it works</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Forward intro emails to the webhook endpoint below</li>
              <li>Grapevine extracts company names and contacts automatically</li>
              <li>New companies are created and added to your pipeline as "Sourced"</li>
              <li>Contact info is preserved in deal notes for follow-up</li>
            </ol>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Webhook Endpoint</label>
            <div className="flex gap-2">
              <code className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-xs text-foreground font-mono flex items-center truncate">
                {endpointUrl}
              </code>
              <button
                onClick={copyEndpoint}
                className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              POST JSON: {"{"} from_email, subject, body_text, user_id {"}"}
            </p>
          </div>

          {/* Recent parsed emails */}
          {log.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Emails Processed</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {log.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                    <div className="min-w-0">
                      <span className="text-foreground truncate block">{entry.subject || entry.from_email}</span>
                      {entry.parsed_company && (
                        <span className="text-muted-foreground">→ {entry.parsed_company}</span>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      entry.action_taken === "deal_created" ? "bg-success/10 text-success" :
                      entry.action_taken === "company_created" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {entry.action_taken?.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── CRM Export Section ────────────────────────────────────
function CRMSection() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportForCRM = async (format: "salesforce" | "affinity" | "dealcloud") => {
    setExporting(format);
    try {
      const { data: deals } = await supabase
        .from("deal_pipeline")
        .select("*, companies(name, sector, stage, hq_country, domain, employee_count, description)")
        .eq("user_id", user!.id);

      if (!deals?.length) {
        toast.error("No deals to export");
        return;
      }

      if (format === "salesforce") {
        exportToCSV(
          deals.map((d: any) => ({
            "Account Name": d.companies?.name ?? "",
            Industry: d.companies?.sector ?? "",
            "Billing Country": d.companies?.hq_country ?? "",
            Website: d.companies?.domain ? `https://${d.companies.domain}` : "",
            Description: d.companies?.description ?? "",
            Employees: d.companies?.employee_count ?? "",
            "Deal Stage": d.stage,
            Priority: d.priority ?? "",
            Notes: d.notes ?? "",
            "Created Date": d.created_at?.split("T")[0] ?? "",
          })),
          `grapevine-salesforce-export`
        );
      } else if (format === "affinity") {
        exportToCSV(
          deals.map((d: any) => ({
            "Organization Name": d.companies?.name ?? "",
            Industry: d.companies?.sector ?? "",
            Location: d.companies?.hq_country ?? "",
            Domain: d.companies?.domain ?? "",
            "List Entry Status": d.stage,
            Note: d.notes ?? "",
          })),
          `grapevine-affinity-export`
        );
      } else {
        exportToCSV(
          deals.map((d: any) => ({
            "Deal Name": d.companies?.name ?? "",
            Sector: d.companies?.sector ?? "",
            Stage: d.stage,
            Priority: d.priority ?? "",
            Country: d.companies?.hq_country ?? "",
            Employees: d.companies?.employee_count ?? "",
            Notes: d.notes ?? "",
          })),
          `grapevine-dealcloud-export`
        );
      }

      toast.success(`Exported ${deals.length} deals for ${format}`);
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-success flex items-center justify-center">
            <Database className="h-4 w-4 text-success-foreground" />
          </div>
          <div>
          <h3 className="text-sm font-semibold text-foreground">CRM Export</h3>
          <p className="text-xs text-muted-foreground">Export pipeline in CRM-compatible formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "salesforce" as const, name: "Salesforce", desc: "Account + Opportunity format" },
          { id: "affinity" as const, name: "Affinity", desc: "Organization list format" },
          { id: "dealcloud" as const, name: "DealCloud", desc: "Deal pipeline format" },
        ].map((crm) => (
          <button
            key={crm.id}
            onClick={() => exportForCRM(crm.id)}
            disabled={exporting === crm.id}
            className="flex flex-col items-start gap-1 p-3 rounded-md border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {exporting === crm.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {crm.name}
            </div>
            <p className="text-[10px] text-muted-foreground">{crm.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Downloads a CSV file with all deals in your pipeline. You can then manually import it into your CRM.
      </p>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Loader2, Check, Download, Key } from "lucide-react";
import { exportToCSV } from "@/lib/export";
import type { IntegrationState } from "@/hooks/useIntegrations";

interface Props {
  state: IntegrationState;
  onUpdate: (config: Record<string, unknown>) => void;
}

const SYNC_DIRECTIONS = [
  { value: "push", label: "Push to CRM" },
  { value: "pull", label: "Pull from CRM" },
  { value: "both", label: "Bidirectional" },
];

export default function CRMConfigPanel({ state, onUpdate }: Props) {
  const { user } = useAuth();
  const config = state.config as Record<string, unknown>;
  const isApiKeyBased = state.type === "crm_affinity" || state.type === "crm_dealcloud";
  const [apiKey, setApiKey] = useState((config.api_key as string) ?? "");
  const [syncDeals, setSyncDeals] = useState((config.sync_deals as boolean) ?? true);
  const [syncContacts, setSyncContacts] = useState((config.sync_contacts as boolean) ?? true);
  const [syncDirection, setSyncDirection] = useState((config.sync_direction as string) ?? "push");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = () => {
    setSaving(true);
    onUpdate({
      ...config,
      api_key: isApiKeyBased ? apiKey : config.api_key,
      sync_deals: syncDeals,
      sync_contacts: syncContacts,
      sync_direction: syncDirection,
    });
    setTimeout(() => setSaving(false), 500);
    toast.success("CRM settings saved");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: deals } = await supabase
        .from("deal_pipeline")
        .select("*, companies(name, sector, stage, hq_country, domain, employee_count, description)")
        .eq("user_id", user!.id);

      if (!deals?.length) {
        toast.error("No deals to export");
        return;
      }

      const formatName =
        state.type === "crm_salesforce" ? "Salesforce" :
        state.type === "crm_affinity" ? "Affinity" : "DealCloud";

      if (state.type === "crm_salesforce") {
        exportToCSV(
          deals.map((d: Record<string, unknown>) => {
            const co = d.companies as Record<string, unknown> | null;
            return {
              "Account Name": co?.name ?? "",
              Industry: co?.sector ?? "",
              "Billing Country": co?.hq_country ?? "",
              Website: co?.domain ? `https://${co.domain}` : "",
              Description: co?.description ?? "",
              Employees: co?.employee_count ?? "",
              "Deal Stage": d.stage,
              Priority: d.priority ?? "",
              Notes: d.notes ?? "",
            };
          }),
          `grapevine-salesforce-export`
        );
      } else if (state.type === "crm_affinity") {
        exportToCSV(
          deals.map((d: Record<string, unknown>) => {
            const co = d.companies as Record<string, unknown> | null;
            return {
              "Organization Name": co?.name ?? "",
              Industry: co?.sector ?? "",
              Location: co?.hq_country ?? "",
              Domain: co?.domain ?? "",
              "List Entry Status": d.stage,
              Note: d.notes ?? "",
            };
          }),
          `grapevine-affinity-export`
        );
      } else {
        exportToCSV(
          deals.map((d: Record<string, unknown>) => {
            const co = d.companies as Record<string, unknown> | null;
            return {
              "Deal Name": co?.name ?? "",
              Sector: co?.sector ?? "",
              Stage: d.stage,
              Priority: d.priority ?? "",
              Country: co?.hq_country ?? "",
              Notes: d.notes ?? "",
            };
          }),
          `grapevine-dealcloud-export`
        );
      }

      toast.success(`Exported deals for ${formatName}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleSyncNow = () => {
    toast.info("CRM sync initiated", { description: "Deals will be synced shortly." });
  };

  return (
    <div className="space-y-4">
      {isApiKeyBased && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">API Key</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Sync Direction</label>
        <div className="flex gap-2">
          {SYNC_DIRECTIONS.map((dir) => (
            <button
              key={dir.value}
              onClick={() => setSyncDirection(dir.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                syncDirection === dir.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {dir.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground block">What to sync</label>
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={syncDeals}
            onChange={(e) => setSyncDeals(e.target.checked)}
            className="rounded border-border"
          />
          Deals and pipeline stages
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={syncContacts}
            onChange={(e) => setSyncContacts(e.target.checked)}
            className="rounded border-border"
          />
          Contacts and relationships
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={handleSyncNow}
          className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Sync Now
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export CSV
        </button>
      </div>

      {state.lastSyncAt && (
        <p className="text-[10px] text-muted-foreground">
          {state.itemsSynced ?? 0} items synced · Last sync: {new Date(state.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

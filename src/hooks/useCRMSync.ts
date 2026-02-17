import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CRMSyncConfig } from "@/lib/integrations";

export function useCRMSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: setting } = useQuery({
    queryKey: ["integration-settings", "crm", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .in("integration_type", ["crm_salesforce", "crm_affinity", "crm_dealcloud"]);
      return data?.find((s) => s.enabled) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const config = (setting?.config ?? {}) as CRMSyncConfig;
  const isConfigured = !!(setting?.enabled && (config.access_token || config.api_key || config.connected_at));
  const crmType = setting?.integration_type ?? null;

  const syncDeals = async (direction: "push" | "pull" | "both" = "both") => {
    if (!isConfigured) return;
    try {
      const { data, error } = await supabase.functions.invoke("crm-sync", {
        body: {
          action: direction === "pull" ? "pull_deals" : "push_deals",
          crm_type: crmType,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      const count = (data as Record<string, number>)?.synced ?? 0;
      toast.success(`Synced ${count} deals ${direction === "push" ? "to" : "from"} CRM`);
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch {
      toast.error("CRM sync failed");
    }
  };

  const syncContacts = async (direction: "push" | "pull" | "both" = "both") => {
    if (!isConfigured) return;
    try {
      const { error } = await supabase.functions.invoke("crm-sync", {
        body: {
          action: "sync_contacts",
          direction,
          crm_type: crmType,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      toast.success("Contacts synced");
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    } catch {
      toast.error("Contact sync failed");
    }
  };

  return {
    isConfigured,
    config,
    crmType,
    syncDeals,
    syncContacts,
    lastSyncAt: config.last_sync_at ?? null,
    itemsSynced: config.items_synced ?? null,
  };
}

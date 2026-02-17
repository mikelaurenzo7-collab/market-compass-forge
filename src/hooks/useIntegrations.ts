import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { IntegrationType, ConnectionStatus, IntegrationDefinition } from "@/lib/integrations";
import { INTEGRATION_DEFINITIONS, buildOAuthURL } from "@/lib/integrations";

export interface IntegrationState {
  type: IntegrationType;
  definition: IntegrationDefinition;
  enabled: boolean;
  config: Record<string, unknown>;
  status: ConnectionStatus;
  lastSyncAt: string | null;
  itemsSynced: number | null;
  updatedAt: string | null;
}

export function useIntegrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
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

  const integrations: IntegrationState[] = INTEGRATION_DEFINITIONS.map((def) => {
    const setting = settings?.find((s) => s.integration_type === def.type);
    const config = (setting?.config ?? {}) as Record<string, unknown>;

    let status: ConnectionStatus = "not_connected";
    if (setting?.enabled) {
      if (
        config.access_token ||
        config.api_key ||
        config.connected_at ||
        def.type === "slack" ||
        def.type === "email"
      ) {
        status = "connected";
      }
      if (config._syncing) status = "syncing";
      if (config._error) status = "error";
    }

    return {
      type: def.type,
      definition: def,
      enabled: setting?.enabled ?? false,
      config,
      status,
      lastSyncAt: (config.last_sync_at as string) ?? null,
      itemsSynced: (config.items_synced as number) ?? null,
      updatedAt: setting?.updated_at ?? null,
    };
  });

  const upsertSetting = useMutation({
    mutationFn: async ({
      type,
      config,
      enabled,
    }: {
      type: IntegrationType;
      config: Record<string, unknown>;
      enabled: boolean;
    }) => {
      const { error } = await supabase.from("integration_settings").upsert(
        {
          user_id: user!.id,
          integration_type: type,
          config: config as Record<string, unknown>,
          enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,integration_type" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    },
  });

  const connect = (type: IntegrationType) => {
    const def = INTEGRATION_DEFINITIONS.find((d) => d.type === type);
    if (!def) return;

    if (!def.oauthRequired) {
      upsertSetting.mutate(
        { type, config: { connected_at: new Date().toISOString() }, enabled: true },
        { onSuccess: () => toast.success(`${def.name} enabled`) }
      );
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = JSON.stringify({ type, user_id: user?.id });
    const oauthUrl = buildOAuthURL(def, redirectUri, state);

    if (oauthUrl) {
      sessionStorage.setItem("oauth_state", state);
      window.location.href = oauthUrl;
    } else {
      toast.error("OAuth not configured for this provider");
    }
  };

  const disconnect = (type: IntegrationType) => {
    const def = INTEGRATION_DEFINITIONS.find((d) => d.type === type);
    upsertSetting.mutate(
      { type, config: {}, enabled: false },
      { onSuccess: () => toast.success(`${def?.name ?? type} disconnected`) }
    );
  };

  const getIntegration = (type: IntegrationType): IntegrationState | undefined =>
    integrations.find((i) => i.type === type);

  return {
    integrations,
    isLoading,
    connect,
    disconnect,
    upsertSetting,
    getIntegration,
  };
}

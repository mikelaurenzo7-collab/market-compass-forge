import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GoogleDriveConfig } from "@/lib/integrations";

export function useGoogleDrive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: setting } = useQuery({
    queryKey: ["integration-settings", "google_drive", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("integration_type", "google_drive")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const config = (setting?.config ?? {}) as GoogleDriveConfig;
  const isConfigured = !!(setting?.enabled && (config.access_token || config.connected_at));

  const syncFiles = async (companyId: string) => {
    if (!isConfigured) return;
    try {
      const { data, error } = await supabase.functions.invoke("google-drive-sync", {
        body: {
          action: "sync",
          company_id: companyId,
          folder_id: config.sync_folder_id,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      toast.success(`Synced ${(data as Record<string, number>)?.files_synced ?? 0} files from Drive`);
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["deal-doc-counts"] });
    } catch {
      toast.error("Drive sync failed");
    }
  };

  const listFiles = async (folderId?: string): Promise<unknown[]> => {
    if (!isConfigured) return [];
    try {
      const { data, error } = await supabase.functions.invoke("google-drive-sync", {
        body: {
          action: "list",
          folder_id: folderId || config.sync_folder_id,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return (data as Record<string, unknown[]>)?.files ?? [];
    } catch {
      return [];
    }
  };

  return {
    isConfigured,
    config,
    syncFiles,
    listFiles,
    lastSyncAt: config.last_sync_at ?? null,
    itemsSynced: config.items_synced ?? null,
  };
}

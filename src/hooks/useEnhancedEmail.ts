import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmailEnhancedConfig } from "@/lib/integrations";

export function useEnhancedEmail() {
  const { user } = useAuth();

  const { data: setting } = useQuery({
    queryKey: ["integration-settings", "enhanced_email", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .in("integration_type", ["gmail", "outlook_email"]);
      return data?.find((s) => s.enabled) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const config = (setting?.config ?? {}) as EmailEnhancedConfig;
  const isConfigured = !!(setting?.enabled && (config.access_token || config.connected_at));
  const provider = setting?.integration_type ?? null;

  const forwardToDealRoom = async (dealId: string, emailData: { subject: string; body: string; from: string }) => {
    if (!isConfigured) return;
    try {
      const { error } = await supabase.functions.invoke("email-inbound", {
        body: {
          action: "forward_to_deal",
          deal_id: dealId,
          email: emailData,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      toast.success("Email forwarded to Deal Room");
    } catch {
      toast.error("Failed to forward email");
    }
  };

  const captureThread = async (threadId: string) => {
    if (!isConfigured) return;
    try {
      const { error } = await supabase.functions.invoke("email-inbound", {
        body: {
          action: "capture_thread",
          thread_id: threadId,
          provider: config.provider,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      toast.success("Email thread captured");
    } catch {
      toast.error("Failed to capture thread");
    }
  };

  return {
    isConfigured,
    config,
    provider,
    forwardToDealRoom,
    captureThread,
    lastSyncAt: config.last_sync_at ?? null,
  };
}

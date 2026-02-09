import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUnreadCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alert_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000, // 30s for notifications
  });
};

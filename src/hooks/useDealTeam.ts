import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DealRoleType = "viewer" | "contributor" | "lead" | "approver" | "owner";

export function useDealTeam(dealId: string | undefined) {
  const { user } = useAuth();

  const { data: team, isLoading } = useQuery({
    queryKey: ["deal-team", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_team")
        .select("*")
        .eq("deal_id", dealId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealId,
  });

  const { data: dealOwner } = useQuery({
    queryKey: ["deal-owner", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("user_id")
        .eq("id", dealId!)
        .single();
      if (error) throw error;
      return data?.user_id as string;
    },
    enabled: !!dealId,
  });

  const isOwner = !!user && dealOwner === user.id;
  const membership = team?.find((m: any) => m.user_id === user?.id);
  const assignedRole = membership?.role as DealRoleType | undefined;

  // Owner always gets full access
  const effectiveRole: DealRoleType = isOwner ? "owner" : (assignedRole ?? "viewer");

  const canViewAllocation = effectiveRole === "owner" || effectiveRole === "lead" || effectiveRole === "approver";
  const canManageTeam = effectiveRole === "owner" || effectiveRole === "lead" || effectiveRole === "approver";

  return {
    team: team ?? [],
    effectiveRole,
    isOwner,
    canViewAllocation,
    canManageTeam,
    isLoading,
  };
}

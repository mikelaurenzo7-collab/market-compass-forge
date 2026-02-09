import { supabase } from "@/integrations/supabase/client";

export const logActivity = async ({
  userId,
  action,
  entityType,
  entityId,
  entityName,
  detail,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  detail?: string;
}) => {
  try {
    await supabase.from("team_activity").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
      detail: detail ?? null,
    });
  } catch (e) {
    console.warn("Failed to log activity:", e);
  }
};

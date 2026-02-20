"use server";

import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStatus } from "@/types/deal";

/**
 * Server Actions for pipeline state management.
 * Used by the Kanban board to persist drag-and-drop changes.
 */

export async function getPipelineDeals(): Promise<{
  deals: Deal[];
  error: string | null;
}> {
  const supabase = createClient();

  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { deals: [], error: error.message };
  }

  return { deals: (deals ?? []) as Deal[], error: null };
}

export async function moveDeal(
  dealId: string,
  newStatus: DealStatus
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("deals")
    .update({ status: newStatus })
    .eq("id", dealId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

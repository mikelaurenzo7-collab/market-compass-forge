"use server";

import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStatus } from "@/types/deal";

/**
 * Server Actions for Deal CRUD operations.
 * These run on the server and can be called directly from Client Components.
 */

export async function createDeal(data: {
  name: string;
  target_company: string;
}): Promise<{ deal: Deal | null; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { deal: null, error: "Not authenticated" };
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      name: data.name,
      target_company: data.target_company,
      status: "Teaser",
      sponsor_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return { deal: null, error: error.message };
  }

  return { deal: deal as Deal, error: null };
}

export async function updateDealStatus(
  dealId: string,
  status: DealStatus
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("deals")
    .update({ status })
    .eq("id", dealId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getDeal(
  dealId: string
): Promise<{ deal: Deal | null; error: string | null }> {
  const supabase = createClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();

  if (error) {
    return { deal: null, error: error.message };
  }

  return { deal: deal as Deal, error: null };
}

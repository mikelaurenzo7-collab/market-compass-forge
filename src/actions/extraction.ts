"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExtractionResult } from "@/types/extraction";

/**
 * Server Actions for AI document extraction.
 * Orchestrates the upload → classify → extract → store pipeline.
 */

export async function submitExtraction(
  dealId: string,
  fileName: string,
  fileBase64: string
): Promise<{ result: ExtractionResult | null; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { result: null, error: "Not authenticated" };
  }

  // Create extraction log entry
  const { data: log, error: logError } = await supabase
    .from("extraction_logs")
    .insert({
      deal_id: dealId,
      document_type: "unknown",
      file_name: fileName,
      status: "queued",
    })
    .select()
    .single();

  if (logError) {
    return { result: null, error: logError.message };
  }

  // TODO: Phase 5 — call /api/ai/extract with the actual file data,
  // then update the extraction_logs row with results.

  return {
    result: {
      id: log.id,
      deal_id: dealId,
      document_type: "unknown",
      file_name: fileName,
      status: "queued",
      opco_data: null,
      propco_data: null,
      confidence_score: 0,
      error_message: null,
      created_at: log.created_at,
      completed_at: null,
    },
    error: null,
  };
}

export async function getExtractionStatus(
  extractionId: string
): Promise<{ result: ExtractionResult | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("extraction_logs")
    .select("*")
    .eq("id", extractionId)
    .single();

  if (error) {
    return { result: null, error: error.message };
  }

  return {
    result: data as unknown as ExtractionResult,
    error: null,
  };
}

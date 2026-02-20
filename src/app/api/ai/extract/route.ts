import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/ai/extract
 * Receives a document (base64), classifies it, and extracts structured OpCo/PropCo data.
 * In production, this calls OpenAI or Anthropic with domain-specific prompts.
 */

const extractionSchema = z.object({
  deal_id: z.string().uuid(),
  file_name: z.string(),
  file_base64: z.string(),
  document_type: z.enum(["CIM", "rent_roll", "ESA", "unknown"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = extractionSchema.parse(body);

    // TODO: Replace with actual AI API calls in Phase 5
    // 1. Classify document type if not provided
    // 2. Extract OpCo data (financials) via extract-cim.ts
    // 3. Extract PropCo data (physical assets) via extract-rent-roll.ts or extract-esa.ts
    // 4. Store results in Supabase extraction_logs table

    return NextResponse.json({
      id: crypto.randomUUID(),
      deal_id: payload.deal_id,
      document_type: payload.document_type ?? "unknown",
      file_name: payload.file_name,
      status: "complete",
      opco_data: null,
      propco_data: null,
      confidence_score: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[AI Extract] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error during extraction" },
      { status: 500 }
    );
  }
}

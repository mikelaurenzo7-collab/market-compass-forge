import { CIM_EXTRACTION_PROMPT } from "./prompts";
import type { FinancialDataOpCo } from "@/types/deal";

/**
 * Extracts financial (OpCo) data from a CIM document using AI.
 * In production, calls Anthropic or OpenAI with the CIM extraction prompt.
 */
export async function extractCIM(
  documentText: string
): Promise<Partial<FinancialDataOpCo>> {
  // TODO: Phase 5 — wire to actual AI API
  // const response = await fetch("https://api.anthropic.com/v1/messages", { ... });

  console.log(
    "[extract-cim] Would extract from",
    documentText.length,
    "chars using prompt:",
    CIM_EXTRACTION_PROMPT.substring(0, 80)
  );

  return {
    ttm_revenue: 0,
    adjusted_ebitda: 0,
    ebitda_addbacks: [],
    debt_profile: [],
  };
}

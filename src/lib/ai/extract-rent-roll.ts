import { RENT_ROLL_EXTRACTION_PROMPT } from "./prompts";
import type { PhysicalAssetPropCo } from "@/types/deal";

/**
 * Extracts physical asset (PropCo) lease data from a rent roll using AI.
 */
export async function extractRentRoll(
  documentText: string
): Promise<Partial<PhysicalAssetPropCo>> {
  // TODO: Phase 5 — wire to actual AI API
  console.log(
    "[extract-rent-roll] Would extract from",
    documentText.length,
    "chars using prompt:",
    RENT_ROLL_EXTRACTION_PROMPT.substring(0, 80)
  );

  return {
    property_addresses: [],
    lease_structure: [],
  };
}

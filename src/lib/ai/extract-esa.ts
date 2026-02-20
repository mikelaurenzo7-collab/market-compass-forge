import { ESA_EXTRACTION_PROMPT } from "./prompts";
import type { PhysicalAssetPropCo } from "@/types/deal";

/**
 * Extracts environmental risk (PropCo) data from an Environmental Site Assessment.
 */
export async function extractESA(
  documentText: string
): Promise<Pick<PhysicalAssetPropCo, "deferred_maintenance_flags" | "environmental_risks">> {
  // TODO: Phase 5 — wire to actual AI API
  console.log(
    "[extract-esa] Would extract from",
    documentText.length,
    "chars using prompt:",
    ESA_EXTRACTION_PROMPT.substring(0, 80)
  );

  return {
    deferred_maintenance_flags: [],
    environmental_risks: [],
  };
}

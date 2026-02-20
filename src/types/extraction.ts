import type { FinancialDataOpCo, PhysicalAssetPropCo } from "./deal";

export type DocumentType = "CIM" | "rent_roll" | "ESA" | "unknown";

export type ExtractionStatus =
  | "queued"
  | "uploading"
  | "extracting_financials"
  | "extracting_assets"
  | "verifying"
  | "complete"
  | "error";

/** Simulated extraction progress steps shown in the AI Upload Zone */
export const EXTRACTION_STEPS: { status: ExtractionStatus; label: string }[] = [
  { status: "uploading", label: "Uploading document..." },
  { status: "extracting_financials", label: "Extracting Cap Tables & EBITDA..." },
  { status: "extracting_assets", label: "Analyzing Rent Rolls & Lease Terms..." },
  { status: "verifying", label: "Verifying Property Lines & Environmental..." },
  { status: "complete", label: "Extraction complete" },
];

/** Result of a single AI extraction job */
export interface ExtractionResult {
  id: string;
  deal_id: string;
  document_type: DocumentType;
  file_name: string;
  status: ExtractionStatus;
  opco_data: Partial<FinancialDataOpCo> | null;
  propco_data: Partial<PhysicalAssetPropCo> | null;
  confidence_score: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/** Payload for the extraction API route */
export interface ExtractionRequest {
  deal_id: string;
  file_name: string;
  file_base64: string;
  document_type?: DocumentType;
}

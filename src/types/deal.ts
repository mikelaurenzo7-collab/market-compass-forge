/**
 * Core data structures for Laurenzo OS.
 * These map 1:1 to the Supabase database schema.
 */

export type DealStatus = "Teaser" | "Diligence" | "LOI" | "Closed";

export interface Deal {
  id: string;
  name: string;
  status: DealStatus;
  target_company: string;
  created_at: string;
  sponsor_id: string;
}

export interface EbitdaAddback {
  label: string;
  amount: number;
  category: "one_time" | "non_recurring" | "owner_related" | "pro_forma";
}

export interface DebtTranche {
  lender: string;
  type: "senior" | "mezzanine" | "revolver" | "seller_note";
  principal: number;
  rate: number;
  maturity_date: string;
}

/** Operating Company financials — left panel of the OpCo/PropCo split */
export interface FinancialDataOpCo {
  deal_id: string;
  ttm_revenue: number;
  adjusted_ebitda: number;
  ebitda_addbacks: EbitdaAddback[];
  debt_profile: DebtTranche[];
}

export interface LeaseStructure {
  tenant: string;
  lease_type: "NNN" | "gross" | "modified_gross" | "ground";
  annual_rent: number;
  expiry_date: string;
  renewal_options: number;
}

export interface DeferredMaintenanceFlag {
  system: string;
  severity: "low" | "medium" | "high" | "critical";
  estimated_cost: number;
  description: string;
}

export interface EnvironmentalRisk {
  type: string;
  phase: "Phase I" | "Phase II" | "Remediation";
  status: "clear" | "flagged" | "in_review" | "remediation_required";
  description: string;
}

/** Physical Asset / Real Estate liabilities — right panel of the OpCo/PropCo split */
export interface PhysicalAssetPropCo {
  deal_id: string;
  property_addresses: string[];
  lease_structure: LeaseStructure[];
  deferred_maintenance_flags: DeferredMaintenanceFlag[];
  environmental_risks: EnvironmentalRisk[];
}

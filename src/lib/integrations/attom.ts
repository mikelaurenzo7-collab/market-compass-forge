/**
 * ATTOM Data API client stub.
 * In production, this calls the ATTOM Property API for:
 *   - Property valuations (AVM)
 *   - Tax assessments
 *   - Ownership history
 *   - Building/lot details
 */

export interface AttomPropertyDetail {
  estimated_value: number | null;
  tax_assessment: number | null;
  year_built: number | null;
  lot_size_sqft: number | null;
  building_size_sqft: number | null;
  ownership_history: {
    owner: string;
    purchase_date: string;
    purchase_price: number;
  }[];
}

export async function fetchPropertyDetail(
  address: string
): Promise<AttomPropertyDetail> {
  const apiKey = process.env.ATTOM_API_KEY;

  if (!apiKey) {
    console.warn("[attom] ATTOM_API_KEY not configured — returning stub data");
    return {
      estimated_value: null,
      tax_assessment: null,
      year_built: null,
      lot_size_sqft: null,
      building_size_sqft: null,
      ownership_history: [],
    };
  }

  // TODO: Implement actual ATTOM API call
  // const response = await fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address=${encodeURIComponent(address)}`, {
  //   headers: { "apikey": apiKey, "Accept": "application/json" },
  // });

  throw new Error("ATTOM API integration not yet implemented");
}

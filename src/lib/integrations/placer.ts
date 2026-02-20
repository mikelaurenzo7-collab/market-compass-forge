/**
 * Placer.ai API client stub.
 * In production, this calls the Placer.ai API for:
 *   - Foot traffic data
 *   - Visitor demographics
 *   - Trade area analysis
 *   - Competitive intelligence
 */

export interface PlacerFootTraffic {
  monthly_visits: number | null;
  avg_dwell_time_minutes: number | null;
  peak_hours: { hour: number; visits: number }[];
  demographics: {
    median_household_income: number | null;
    median_age: number | null;
    population_density: number | null;
  } | null;
  trade_area_radius_miles: number | null;
}

export async function fetchFootTraffic(
  lat: number,
  lng: number
): Promise<PlacerFootTraffic> {
  const apiKey = process.env.PLACER_API_KEY;

  if (!apiKey) {
    console.warn("[placer] PLACER_API_KEY not configured — returning stub data");
    return {
      monthly_visits: null,
      avg_dwell_time_minutes: null,
      peak_hours: [],
      demographics: null,
      trade_area_radius_miles: null,
    };
  }

  // TODO: Implement actual Placer.ai API call
  throw new Error("Placer.ai API integration not yet implemented");
}

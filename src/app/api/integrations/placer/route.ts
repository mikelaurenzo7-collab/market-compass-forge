import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/placer?lat=...&lng=...
 * Stub for Placer.ai geospatial foot traffic API.
 * Returns visitor counts, demographics, and trade area data.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing 'lat' and 'lng' query parameters" },
      { status: 400 }
    );
  }

  // TODO: Implement actual Placer.ai API call using src/lib/integrations/placer.ts
  // const apiKey = process.env.PLACER_API_KEY;

  return NextResponse.json({
    source: "placer",
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    status: "stub",
    data: {
      monthly_visits: null,
      avg_dwell_time_minutes: null,
      peak_hours: [],
      demographics: null,
      trade_area_radius_miles: null,
    },
    message: "Placer.ai API integration pending — configure PLACER_API_KEY in .env.local",
  });
}

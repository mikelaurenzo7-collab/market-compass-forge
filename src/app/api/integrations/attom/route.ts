import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/attom?address=...
 * Stub for ATTOM Data property detail API.
 * Returns property valuation, tax history, and ownership details.
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing 'address' query parameter" },
      { status: 400 }
    );
  }

  // TODO: Implement actual ATTOM API call using src/lib/integrations/attom.ts
  // const apiKey = process.env.ATTOM_API_KEY;

  return NextResponse.json({
    source: "attom",
    address,
    status: "stub",
    data: {
      estimated_value: null,
      tax_assessment: null,
      year_built: null,
      lot_size_sqft: null,
      building_size_sqft: null,
      ownership_history: [],
    },
    message: "ATTOM API integration pending — configure ATTOM_API_KEY in .env.local",
  });
}

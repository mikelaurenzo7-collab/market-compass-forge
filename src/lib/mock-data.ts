import type { Deal, FinancialDataOpCo, PhysicalAssetPropCo } from "@/types/deal";

/**
 * Realistic mock data for lower-middle-market PE deals.
 * Used when Supabase is not configured or during development.
 */

export const MOCK_DEALS: Deal[] = [
  {
    id: "d-001",
    name: "Project Alpine",
    status: "Diligence",
    target_company: "Alpine Healthcare Partners",
    created_at: "2025-11-15T10:00:00Z",
    sponsor_id: "mock-user",
  },
  {
    id: "d-002",
    name: "Project Meridian",
    status: "LOI",
    target_company: "Meridian Logistics Group",
    created_at: "2025-10-02T14:30:00Z",
    sponsor_id: "mock-user",
  },
  {
    id: "d-003",
    name: "Project Coastal",
    status: "Teaser",
    target_company: "Coastal Property Holdings",
    created_at: "2026-01-20T09:00:00Z",
    sponsor_id: "mock-user",
  },
  {
    id: "d-004",
    name: "Project Vertex",
    status: "Closed",
    target_company: "Vertex Manufacturing Corp",
    created_at: "2025-06-10T08:00:00Z",
    sponsor_id: "mock-user",
  },
  {
    id: "d-005",
    name: "Project Summit",
    status: "Teaser",
    target_company: "Summit Hospitality Group",
    created_at: "2026-02-05T11:00:00Z",
    sponsor_id: "mock-user",
  },
  {
    id: "d-006",
    name: "Project Ironbridge",
    status: "Diligence",
    target_company: "Ironbridge Capital Solutions",
    created_at: "2025-12-01T16:00:00Z",
    sponsor_id: "mock-user",
  },
];

export const MOCK_OPCO_DATA: Record<string, FinancialDataOpCo> = {
  "d-001": {
    deal_id: "d-001",
    ttm_revenue: 42_500_000,
    adjusted_ebitda: 8_750_000,
    ebitda_addbacks: [
      { label: "Owner compensation above market", amount: 850_000, category: "owner_related" },
      { label: "One-time legal settlement", amount: 425_000, category: "one_time" },
      { label: "Non-recurring consulting fees", amount: 275_000, category: "non_recurring" },
      { label: "Pro forma rent adjustment", amount: 180_000, category: "pro_forma" },
    ],
    debt_profile: [
      { lender: "First National Bank", type: "senior", principal: 15_000_000, rate: 6.75, maturity_date: "2028-06-15" },
      { lender: "Mezzanine Partners LLC", type: "mezzanine", principal: 5_000_000, rate: 12.5, maturity_date: "2029-06-15" },
      { lender: "Revolver Facility", type: "revolver", principal: 2_500_000, rate: 7.25, maturity_date: "2027-06-15" },
    ],
  },
  "d-002": {
    deal_id: "d-002",
    ttm_revenue: 68_200_000,
    adjusted_ebitda: 12_450_000,
    ebitda_addbacks: [
      { label: "Founder salary normalization", amount: 1_200_000, category: "owner_related" },
      { label: "Warehouse relocation costs", amount: 890_000, category: "one_time" },
      { label: "ERP implementation write-off", amount: 650_000, category: "non_recurring" },
      { label: "Pro forma fleet optimization", amount: 420_000, category: "pro_forma" },
      { label: "COVID-related supply chain disruption", amount: 380_000, category: "one_time" },
    ],
    debt_profile: [
      { lender: "JPMorgan Chase", type: "senior", principal: 28_000_000, rate: 5.95, maturity_date: "2029-03-01" },
      { lender: "Seller Note", type: "seller_note", principal: 8_000_000, rate: 8.0, maturity_date: "2030-03-01" },
    ],
  },
  "d-003": {
    deal_id: "d-003",
    ttm_revenue: 18_900_000,
    adjusted_ebitda: 5_200_000,
    ebitda_addbacks: [
      { label: "Property management internalization", amount: 340_000, category: "pro_forma" },
      { label: "Non-recurring legal costs", amount: 165_000, category: "non_recurring" },
    ],
    debt_profile: [
      { lender: "Regional Credit Union", type: "senior", principal: 8_500_000, rate: 7.10, maturity_date: "2028-09-01" },
    ],
  },
  "d-004": {
    deal_id: "d-004",
    ttm_revenue: 95_000_000,
    adjusted_ebitda: 18_200_000,
    ebitda_addbacks: [
      { label: "Owner aircraft expenses", amount: 450_000, category: "owner_related" },
      { label: "Factory consolidation", amount: 1_800_000, category: "one_time" },
      { label: "Deferred maintenance catch-up", amount: 920_000, category: "non_recurring" },
      { label: "Pro forma raw material savings", amount: 1_100_000, category: "pro_forma" },
    ],
    debt_profile: [
      { lender: "Bank of America", type: "senior", principal: 42_000_000, rate: 5.50, maturity_date: "2030-01-15" },
      { lender: "Ares Capital", type: "mezzanine", principal: 15_000_000, rate: 11.0, maturity_date: "2031-01-15" },
      { lender: "ABL Revolver", type: "revolver", principal: 8_000_000, rate: 6.25, maturity_date: "2028-01-15" },
      { lender: "Seller Note (Deferred)", type: "seller_note", principal: 5_000_000, rate: 7.0, maturity_date: "2032-01-15" },
    ],
  },
  "d-005": {
    deal_id: "d-005",
    ttm_revenue: 31_400_000,
    adjusted_ebitda: 7_800_000,
    ebitda_addbacks: [
      { label: "Management fee normalization", amount: 560_000, category: "owner_related" },
      { label: "Pre-opening expenses (2 properties)", amount: 1_250_000, category: "one_time" },
      { label: "Pro forma RevPAR improvement", amount: 680_000, category: "pro_forma" },
    ],
    debt_profile: [
      { lender: "Wells Fargo CMBS", type: "senior", principal: 22_000_000, rate: 6.40, maturity_date: "2029-08-01" },
    ],
  },
  "d-006": {
    deal_id: "d-006",
    ttm_revenue: 55_800_000,
    adjusted_ebitda: 11_200_000,
    ebitda_addbacks: [
      { label: "Regulatory compliance one-time", amount: 780_000, category: "one_time" },
      { label: "Founder personal expenses", amount: 620_000, category: "owner_related" },
      { label: "Technology platform migration", amount: 1_400_000, category: "non_recurring" },
      { label: "Pro forma headcount optimization", amount: 850_000, category: "pro_forma" },
    ],
    debt_profile: [
      { lender: "Goldman Sachs", type: "senior", principal: 25_000_000, rate: 6.15, maturity_date: "2029-12-01" },
      { lender: "Golub Capital", type: "mezzanine", principal: 10_000_000, rate: 13.0, maturity_date: "2030-12-01" },
    ],
  },
};

export const MOCK_PROPCO_DATA: Record<string, PhysicalAssetPropCo> = {
  "d-001": {
    deal_id: "d-001",
    property_addresses: [
      "1200 Medical Center Dr, Nashville, TN 37203",
      "4500 Healthcare Blvd, Franklin, TN 37067",
      "890 Clinic Way, Murfreesboro, TN 37129",
    ],
    lease_structure: [
      { tenant: "Alpine Primary Care", lease_type: "NNN", annual_rent: 1_680_000, expiry_date: "2032-12-31", renewal_options: 2 },
      { tenant: "MedFirst Urgent Care", lease_type: "NNN", annual_rent: 720_000, expiry_date: "2029-06-30", renewal_options: 3 },
      { tenant: "LabCorp Diagnostics", lease_type: "modified_gross", annual_rent: 480_000, expiry_date: "2031-03-31", renewal_options: 1 },
    ],
    deferred_maintenance_flags: [
      { system: "HVAC", severity: "medium", estimated_cost: 185_000, description: "Rooftop units at Nashville location nearing end of useful life (15+ years)" },
      { system: "Parking Lot", severity: "low", estimated_cost: 45_000, description: "Asphalt resurfacing needed at Franklin location" },
    ],
    environmental_risks: [
      { type: "Asbestos", phase: "Phase I", status: "clear", description: "Phase I ESA completed — no asbestos-containing materials identified" },
      { type: "Underground Storage Tank", phase: "Phase I", status: "clear", description: "No USTs identified on any property" },
    ],
  },
  "d-002": {
    deal_id: "d-002",
    property_addresses: [
      "2800 Distribution Pkwy, Memphis, TN 38118",
      "15600 Intermodal Dr, Chicago, IL 60638",
      "7200 Commerce Way, Dallas, TX 75247",
      "3100 Logistics Center Rd, Atlanta, GA 30336",
    ],
    lease_structure: [
      { tenant: "Meridian Logistics (HQ)", lease_type: "NNN", annual_rent: 2_400_000, expiry_date: "2034-06-30", renewal_options: 3 },
      { tenant: "Meridian Chicago Operations", lease_type: "NNN", annual_rent: 1_800_000, expiry_date: "2031-12-31", renewal_options: 2 },
      { tenant: "Meridian Dallas Hub", lease_type: "modified_gross", annual_rent: 1_200_000, expiry_date: "2030-09-30", renewal_options: 2 },
      { tenant: "Third-party sublease — FedEx", lease_type: "NNN", annual_rent: 960_000, expiry_date: "2029-03-31", renewal_options: 1 },
    ],
    deferred_maintenance_flags: [
      { system: "Loading Docks", severity: "high", estimated_cost: 420_000, description: "Dock levelers at Memphis facility require replacement (8 of 24 units)" },
      { system: "Roof", severity: "medium", estimated_cost: 280_000, description: "Chicago warehouse roof showing signs of ponding; membrane integrity compromised" },
      { system: "Fire Suppression", severity: "high", estimated_cost: 195_000, description: "Dallas sprinkler system needs ESFR upgrade for current rack heights" },
    ],
    environmental_risks: [
      { type: "Soil Contamination", phase: "Phase II", status: "in_review", description: "Elevated petroleum hydrocarbons detected near former fueling area at Memphis site" },
      { type: "Wetlands", phase: "Phase I", status: "flagged", description: "Potential jurisdictional wetlands on 2.3 acres of Atlanta parcel — Army Corps review pending" },
    ],
  },
  "d-003": {
    deal_id: "d-003",
    property_addresses: [
      "500 Ocean View Ave, Santa Monica, CA 90401",
      "1250 Pacific Coast Hwy, Malibu, CA 90265",
    ],
    lease_structure: [
      { tenant: "Whole Foods Market", lease_type: "NNN", annual_rent: 1_100_000, expiry_date: "2033-08-31", renewal_options: 3 },
      { tenant: "SoulCycle Studio", lease_type: "gross", annual_rent: 420_000, expiry_date: "2028-12-31", renewal_options: 1 },
      { tenant: "Mixed-use residential (24 units)", lease_type: "gross", annual_rent: 2_160_000, expiry_date: "2026-12-31", renewal_options: 0 },
    ],
    deferred_maintenance_flags: [
      { system: "Elevator", severity: "critical", estimated_cost: 340_000, description: "Passenger elevator at Ocean View requires modernization — code compliance deadline Q3 2026" },
      { system: "Seismic Retrofit", severity: "high", estimated_cost: 890_000, description: "Soft-story retrofit required under LA ordinance for PCH building" },
    ],
    environmental_risks: [
      { type: "Lead Paint", phase: "Phase I", status: "flagged", description: "Pre-1978 construction at both properties — lead-based paint presumed present" },
      { type: "Coastal Erosion", phase: "Phase I", status: "in_review", description: "PCH property within coastal hazard zone — FEMA flood zone reassessment pending" },
    ],
  },
  "d-004": {
    deal_id: "d-004",
    property_addresses: [
      "8900 Industrial Pkwy, Toledo, OH 43612",
      "1600 Manufacturing Dr, Detroit, MI 48209",
      "5400 Precision Way, Columbus, OH 43228",
    ],
    lease_structure: [
      { tenant: "Vertex Manufacturing (owner-occupied)", lease_type: "NNN", annual_rent: 3_200_000, expiry_date: "2035-01-15", renewal_options: 4 },
      { tenant: "Vertex Detroit Operations", lease_type: "NNN", annual_rent: 1_500_000, expiry_date: "2033-01-15", renewal_options: 2 },
      { tenant: "Precision Machining sublease", lease_type: "modified_gross", annual_rent: 680_000, expiry_date: "2029-06-30", renewal_options: 1 },
    ],
    deferred_maintenance_flags: [
      { system: "Roof", severity: "low", estimated_cost: 125_000, description: "Toledo facility roof in good condition — minor flashing repairs needed" },
      { system: "Electrical", severity: "medium", estimated_cost: 310_000, description: "Detroit facility needs main switchgear upgrade (1987 vintage)" },
    ],
    environmental_risks: [
      { type: "PCB Contamination", phase: "Phase II", status: "remediation_required", description: "Legacy PCB contamination in Detroit facility transformer area — remediation plan approved, estimated cost $420K" },
      { type: "Underground Storage Tank", phase: "Remediation", status: "remediation_required", description: "Two decommissioned USTs at Toledo — removal and soil remediation in progress" },
    ],
  },
  "d-005": {
    deal_id: "d-005",
    property_addresses: [
      "100 Resort Blvd, Scottsdale, AZ 85251",
      "2400 Convention Center Dr, Phoenix, AZ 85004",
      "7800 Desert Ridge Pkwy, Phoenix, AZ 85054",
    ],
    lease_structure: [
      { tenant: "Summit Scottsdale Resort (flag: Marriott)", lease_type: "ground", annual_rent: 1_800_000, expiry_date: "2049-12-31", renewal_options: 2 },
      { tenant: "Summit Convention Hotel (flag: Hilton)", lease_type: "NNN", annual_rent: 2_100_000, expiry_date: "2038-06-30", renewal_options: 3 },
      { tenant: "Summit Select (flag: IHG)", lease_type: "modified_gross", annual_rent: 960_000, expiry_date: "2032-12-31", renewal_options: 2 },
    ],
    deferred_maintenance_flags: [
      { system: "Pool/Spa", severity: "medium", estimated_cost: 220_000, description: "Scottsdale resort pool deck resurfacing and equipment upgrade needed" },
      { system: "FF&E", severity: "high", estimated_cost: 1_800_000, description: "Convention hotel FF&E below brand standards — PIP required within 18 months" },
      { system: "HVAC", severity: "medium", estimated_cost: 450_000, description: "Desert Ridge property chillers at 80% capacity — replacement recommended within 3 years" },
    ],
    environmental_risks: [
      { type: "Radon", phase: "Phase I", status: "clear", description: "Radon testing completed — all readings below EPA action level" },
    ],
  },
  "d-006": {
    deal_id: "d-006",
    property_addresses: [
      "300 Financial Center, Charlotte, NC 28202",
      "1800 Peachtree St NW, Atlanta, GA 30309",
    ],
    lease_structure: [
      { tenant: "Ironbridge Capital Solutions (HQ)", lease_type: "gross", annual_rent: 1_450_000, expiry_date: "2030-12-31", renewal_options: 2 },
      { tenant: "Ironbridge Atlanta Office", lease_type: "gross", annual_rent: 890_000, expiry_date: "2029-06-30", renewal_options: 1 },
      { tenant: "Sublease — Deloitte", lease_type: "modified_gross", annual_rent: 620_000, expiry_date: "2028-03-31", renewal_options: 1 },
    ],
    deferred_maintenance_flags: [
      { system: "Building Envelope", severity: "low", estimated_cost: 95_000, description: "Minor caulking and sealant replacement on Charlotte tower curtain wall" },
    ],
    environmental_risks: [
      { type: "Asbestos", phase: "Phase I", status: "flagged", description: "ACM identified in Charlotte building floor tiles (non-friable, managed in place)" },
    ],
  },
};

/** Quarterly revenue data for charts */
export const MOCK_REVENUE_QUARTERLY: Record<string, { quarter: string; revenue: number }[]> = {
  "d-001": [
    { quarter: "Q1 2025", revenue: 9_800_000 },
    { quarter: "Q2 2025", revenue: 10_200_000 },
    { quarter: "Q3 2025", revenue: 10_900_000 },
    { quarter: "Q4 2025", revenue: 11_600_000 },
  ],
  "d-002": [
    { quarter: "Q1 2025", revenue: 15_400_000 },
    { quarter: "Q2 2025", revenue: 16_800_000 },
    { quarter: "Q3 2025", revenue: 17_200_000 },
    { quarter: "Q4 2025", revenue: 18_800_000 },
  ],
  "d-003": [
    { quarter: "Q1 2025", revenue: 4_200_000 },
    { quarter: "Q2 2025", revenue: 4_500_000 },
    { quarter: "Q3 2025", revenue: 4_800_000 },
    { quarter: "Q4 2025", revenue: 5_400_000 },
  ],
  "d-004": [
    { quarter: "Q1 2025", revenue: 22_000_000 },
    { quarter: "Q2 2025", revenue: 23_500_000 },
    { quarter: "Q3 2025", revenue: 24_200_000 },
    { quarter: "Q4 2025", revenue: 25_300_000 },
  ],
  "d-005": [
    { quarter: "Q1 2025", revenue: 6_800_000 },
    { quarter: "Q2 2025", revenue: 7_400_000 },
    { quarter: "Q3 2025", revenue: 8_900_000 },
    { quarter: "Q4 2025", revenue: 8_300_000 },
  ],
  "d-006": [
    { quarter: "Q1 2025", revenue: 12_800_000 },
    { quarter: "Q2 2025", revenue: 13_500_000 },
    { quarter: "Q3 2025", revenue: 14_200_000 },
    { quarter: "Q4 2025", revenue: 15_300_000 },
  ],
};

/** Helper to get mock data for a deal */
export function getMockDeal(dealId: string) {
  const deal = MOCK_DEALS.find((d) => d.id === dealId);
  if (!deal) return null;
  return {
    deal,
    opco: MOCK_OPCO_DATA[dealId] ?? null,
    propco: MOCK_PROPCO_DATA[dealId] ?? null,
    revenueQuarterly: MOCK_REVENUE_QUARTERLY[dealId] ?? [],
  };
}

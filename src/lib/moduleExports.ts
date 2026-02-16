// Standardized export packs for distressed assets and real estate modules

import { ClaimStackEntry, calcRecoveryRange, LEGAL_STAGES } from "./underwriting";

// ─── Distressed Asset Memo Export ────────────────────────────────────
interface DistressedExportData {
  name: string;
  asset_type?: string | null;
  distress_type?: string | null;
  status: string;
  sector?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  asking_price?: number | null;
  estimated_value?: number | null;
  discount_pct?: number | null;
  description?: string | null;
  legal_stage?: string | null;
  legal_timeline?: any[];
  claim_stack?: ClaimStackEntry[];
  recovery_low_pct?: number | null;
  recovery_high_pct?: number | null;
  process_milestones?: any[];
  key_metrics?: Record<string, any> | null;
  source?: string | null;
  listed_date?: string | null;
  contact_info?: string | null;
}

export function exportDistressedMemo(asset: DistressedExportData) {
  const fmtCurrency = (v?: number | null) => v ? `$${(v / 1e6).toFixed(1)}M` : "N/A";
  const legalLabel = LEGAL_STAGES.find(s => s.key === asset.legal_stage)?.label ?? asset.legal_stage ?? "Unknown";

  const claimStack = (asset.claim_stack ?? []) as ClaimStackEntry[];
  const recovery = claimStack.length > 0 && asset.estimated_value
    ? calcRecoveryRange(claimStack, asset.estimated_value)
    : null;

  let content = `DISTRESSED ASSET MEMO
${"=".repeat(60)}
Asset: ${asset.name}
Date: ${new Date().toISOString().split("T")[0]}

OVERVIEW
${"─".repeat(40)}
Type: ${asset.asset_type?.replace("_", " ") ?? "N/A"}
Distress Type: ${asset.distress_type?.replace("_", " ") ?? "N/A"}
Sector: ${asset.sector ?? "N/A"}
Location: ${asset.location_city ?? ""}, ${asset.location_state ?? ""}
Status: ${asset.status}
Legal Stage: ${legalLabel}

VALUATION
${"─".repeat(40)}
Asking Price: ${fmtCurrency(asset.asking_price)}
Estimated Value: ${fmtCurrency(asset.estimated_value)}
Discount: ${asset.discount_pct ?? "N/A"}%
`;

  if (recovery) {
    content += `
RECOVERY ANALYSIS
${"─".repeat(40)}
Recovery Range: ${recovery.low}% – ${recovery.high}%
Claim Waterfall:
${recovery.waterfall.map(w => `  ${w.class}: ${fmtCurrency(w.recovery)} (${w.pct}% recovery)`).join("\n")}
`;
  }

  if (claimStack.length > 0) {
    content += `
CLAIM STACK
${"─".repeat(40)}
${claimStack.map(c => `  Priority ${c.priority}: ${c.class} – $${(c.amount / 1e6).toFixed(1)}M ${c.secured ? "(Secured)" : "(Unsecured)"} – Est. ${c.recovery_est_pct}% recovery`).join("\n")}
`;
  }

  const milestones = asset.process_milestones ?? [];
  if (milestones.length > 0) {
    content += `
PROCESS MILESTONES
${"─".repeat(40)}
${milestones.map((m: any) => `  ${m.status === "completed" ? "✓" : "○"} ${m.label}: ${m.completed_date ?? m.target_date ?? "TBD"}`).join("\n")}
`;
  }

  const timeline = asset.legal_timeline ?? [];
  if (timeline.length > 0) {
    content += `
LEGAL TIMELINE
${"─".repeat(40)}
${timeline.map((t: any) => `  ${t.date}: ${t.stage} – ${t.description ?? ""}`).join("\n")}
`;
  }

  if (asset.description) {
    content += `
DESCRIPTION
${"─".repeat(40)}
${asset.description}
`;
  }

  if (asset.key_metrics && Object.keys(asset.key_metrics).length > 0) {
    content += `
KEY METRICS
${"─".repeat(40)}
${Object.entries(asset.key_metrics).map(([k, v]) => `  ${k.replace(/_/g, " ")}: ${v}`).join("\n")}
`;
  }

  content += `
SOURCE APPENDIX
${"─".repeat(40)}
Source: ${asset.source ?? "N/A"}
Listed: ${asset.listed_date ?? "N/A"}
Contact: ${asset.contact_info ?? "N/A"}
Export Date: ${new Date().toISOString()}
`;

  downloadText(content, `distressed-memo-${slugify(asset.name)}`);
}

// ─── Real Estate Underwriting Pack ──────────────────────────────────
interface REExportData {
  property_name: string;
  property_type?: string | null;
  city: string;
  state: string;
  address?: string | null;
  asking_price?: number | null;
  estimated_cap_rate?: number | null;
  noi?: number | null;
  size_sf?: number | null;
  units?: number | null;
  year_built?: number | null;
  occupancy_pct?: number | null;
  loan_amount?: number | null;
  interest_rate?: number | null;
  loan_term_years?: number | null;
  amortization_years?: number | null;
  opex_ratio?: number | null;
  rent_growth_pct?: number | null;
  exit_cap_rate?: number | null;
  hold_years?: number | null;
  description?: string | null;
  source_network?: string | null;
  listed_date?: string | null;
  // Computed fields from UI
  dscr?: number;
  maxLoan?: number;
  ltv?: number;
}

export function exportREUnderwritingPack(listing: REExportData) {
  const fmtCurrency = (v?: number | null) => v ? `$${v.toLocaleString()}` : "N/A";

  let content = `REAL ESTATE UNDERWRITING PACK
${"=".repeat(60)}
Property: ${listing.property_name}
Date: ${new Date().toISOString().split("T")[0]}

PROPERTY OVERVIEW
${"─".repeat(40)}
Type: ${listing.property_type ?? "N/A"}
Address: ${listing.address ?? `${listing.city}, ${listing.state}`}
Size: ${listing.size_sf ? `${listing.size_sf.toLocaleString()} SF` : listing.units ? `${listing.units} units` : "N/A"}
Year Built: ${listing.year_built ?? "N/A"}
Occupancy: ${listing.occupancy_pct ?? 95}%

PRICING
${"─".repeat(40)}
Asking Price: ${fmtCurrency(listing.asking_price)}
Cap Rate: ${listing.estimated_cap_rate ? `${listing.estimated_cap_rate}%` : "N/A"}
NOI: ${fmtCurrency(listing.noi)}

ASSUMPTIONS
${"─".repeat(40)}
Loan Amount: ${fmtCurrency(listing.loan_amount)}
Interest Rate: ${listing.interest_rate ?? "N/A"}%
Loan Term: ${listing.loan_term_years ?? "N/A"} years
Amortization: ${listing.amortization_years ?? 30} years
OpEx Ratio: ${((listing.opex_ratio ?? 0.4) * 100).toFixed(0)}%
Rent Growth: ${listing.rent_growth_pct ?? 2.0}%/yr
Exit Cap Rate: ${listing.exit_cap_rate ?? "N/A"}%
Hold Period: ${listing.hold_years ?? 5} years

DEBT ANALYSIS
${"─".repeat(40)}
DSCR: ${listing.dscr?.toFixed(2) ?? "N/A"}x
Max Loan (constrained): ${fmtCurrency(listing.maxLoan)}
LTV: ${listing.ltv ?? "N/A"}%
`;

  if (listing.description) {
    content += `
DESCRIPTION
${"─".repeat(40)}
${listing.description}
`;
  }

  content += `
SOURCE APPENDIX
${"─".repeat(40)}
Source Network: ${listing.source_network ?? "N/A"}
Listed: ${listing.listed_date ?? "N/A"}
Export Date: ${new Date().toISOString()}
`;

  downloadText(content, `re-underwriting-${slugify(listing.property_name)}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// CRE Underwriting Calculation Engine

export interface UnderwritingInputs {
  askingPrice: number;
  noi: number;
  occupancyPct: number;
  loanAmount: number;
  interestRate: number; // annual %
  loanTermYears: number;
  amortizationYears: number;
  opexRatio: number; // 0–1
  rentGrowthPct: number; // annual %
  exitCapRate: number; // %
  holdYears: number;
}

export interface DSCRResult {
  dscr: number;
  annualDebtService: number;
  monthlyPayment: number;
  maxLoanAtTarget: number; // loan amount at 1.25x DSCR
  rating: "strong" | "adequate" | "weak";
}

export interface DebtSizingResult {
  maxLoanLTV: number; // at 75% LTV
  maxLoanDSCR: number; // at 1.25x DSCR
  constrainingFactor: "ltv" | "dscr";
  maxLoan: number;
  ltv: number;
}

export interface CapRateSensitivity {
  capRate: number;
  impliedValue: number;
  spreadToBenchmark: number;
  valueChange: number; // vs base
}

export interface OccupancyStress {
  occupancy: number;
  effectiveNOI: number;
  dscr: number;
  breachesCovenants: boolean;
}

export interface HoldScenario {
  year: number;
  noi: number;
  exitValue: number;
  equityMultiple: number;
  irr: number;
}

// Monthly payment for amortizing loan
export function calcMonthlyPayment(principal: number, annualRate: number, amortYears: number): number {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calcDSCR(inputs: Pick<UnderwritingInputs, "noi" | "loanAmount" | "interestRate" | "amortizationYears">): DSCRResult {
  const monthly = calcMonthlyPayment(inputs.loanAmount, inputs.interestRate, inputs.amortizationYears);
  const annualDS = monthly * 12;
  const dscr = annualDS > 0 ? inputs.noi / annualDS : Infinity;

  // Max loan at 1.25x DSCR target
  const targetDS = inputs.noi / 1.25;
  const r = inputs.interestRate / 100 / 12;
  const n = inputs.amortizationYears * 12;
  const maxLoan = r > 0
    ? targetDS / 12 * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
    : targetDS / 12 * n;

  return {
    dscr: Math.round(dscr * 100) / 100,
    annualDebtService: Math.round(annualDS),
    monthlyPayment: Math.round(monthly),
    maxLoanAtTarget: Math.round(maxLoan),
    rating: dscr >= 1.4 ? "strong" : dscr >= 1.2 ? "adequate" : "weak",
  };
}

export function calcDebtSizing(inputs: Pick<UnderwritingInputs, "askingPrice" | "noi" | "loanAmount" | "interestRate" | "amortizationYears">): DebtSizingResult {
  const maxLTV = inputs.askingPrice * 0.75;
  const { maxLoanAtTarget } = calcDSCR(inputs);
  const maxLoan = Math.min(maxLTV, maxLoanAtTarget);

  return {
    maxLoanLTV: Math.round(maxLTV),
    maxLoanDSCR: Math.round(maxLoanAtTarget),
    constrainingFactor: maxLTV <= maxLoanAtTarget ? "ltv" : "dscr",
    maxLoan: Math.round(maxLoan),
    ltv: inputs.askingPrice > 0 ? Math.round(inputs.loanAmount / inputs.askingPrice * 1000) / 10 : 0,
  };
}

export function calcCapRateSensitivity(noi: number, baseCapRate: number, benchmarkCapRate: number): CapRateSensitivity[] {
  const baseValue = baseCapRate > 0 ? noi / (baseCapRate / 100) : 0;
  const steps = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  return steps.map((delta) => {
    const cr = baseCapRate + delta;
    const implied = cr > 0 ? noi / (cr / 100) : 0;
    return {
      capRate: Math.round(cr * 10) / 10,
      impliedValue: Math.round(implied),
      spreadToBenchmark: Math.round((cr - benchmarkCapRate) * 10) / 10,
      valueChange: Math.round(implied - baseValue),
    };
  });
}

export function calcOccupancyStress(
  noi: number,
  baseOccupancy: number,
  loanAmount: number,
  interestRate: number,
  amortYears: number,
  dscrCovenant = 1.2
): OccupancyStress[] {
  const steps = [100, 95, 90, 85, 80, 75, 70, 65, 60];
  return steps.map((occ) => {
    const factor = baseOccupancy > 0 ? occ / baseOccupancy : 1;
    const effNOI = Math.round(noi * factor);
    const { dscr } = calcDSCR({ noi: effNOI, loanAmount, interestRate, amortizationYears: amortYears });
    return {
      occupancy: occ,
      effectiveNOI: effNOI,
      dscr,
      breachesCovenants: dscr < dscrCovenant,
    };
  });
}

export function calcHoldScenarios(inputs: UnderwritingInputs): HoldScenario[] {
  const equity = inputs.askingPrice - inputs.loanAmount;
  if (equity <= 0) return [];

  const scenarios: HoldScenario[] = [];
  for (let yr = 1; yr <= Math.max(inputs.holdYears, 10); yr++) {
    const projNOI = Math.round(inputs.noi * Math.pow(1 + inputs.rentGrowthPct / 100, yr));
    const exitVal = inputs.exitCapRate > 0 ? Math.round(projNOI / (inputs.exitCapRate / 100)) : 0;

    // Simplified remaining loan balance (amortizing)
    const r = inputs.interestRate / 100 / 12;
    const n = inputs.amortizationYears * 12;
    const paid = yr * 12;
    let remaining = inputs.loanAmount;
    if (r > 0 && paid < n) {
      remaining = inputs.loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1);
    } else if (paid >= n) {
      remaining = 0;
    }

    const netProceeds = exitVal - remaining;
    const totalCashFlow = scenarios.reduce((s, sc) => s + sc.noi, 0) + projNOI; // cumulative NOI approximation
    const equityMultiple = equity > 0 ? Math.round((netProceeds + totalCashFlow) / equity * 100) / 100 : 0;

    // Simple IRR approximation (geometric)
    const totalReturn = netProceeds + totalCashFlow - equity;
    const irr = equity > 0 ? Math.round((Math.pow(1 + totalReturn / equity, 1 / yr) - 1) * 10000) / 100 : 0;

    scenarios.push({ year: yr, noi: projNOI, exitValue: exitVal, equityMultiple, irr });
  }
  return scenarios;
}

// Distressed asset recovery calculations
export interface ClaimStackEntry {
  class: string;
  amount: number;
  priority: number;
  secured: boolean;
  recovery_est_pct: number;
}

export function calcRecoveryRange(claimStack: ClaimStackEntry[], estimatedValue: number): { low: number; high: number; waterfall: { class: string; recovery: number; pct: number }[] } {
  const sorted = [...claimStack].sort((a, b) => a.priority - b.priority);
  const totalClaims = sorted.reduce((s, c) => s + c.amount, 0);
  
  // Low scenario: 70% of estimated value
  const lowPool = estimatedValue * 0.7;
  // High scenario: 110% of estimated value
  const highPool = estimatedValue * 1.1;

  const waterfall: { class: string; recovery: number; pct: number }[] = [];
  let remaining = (lowPool + highPool) / 2; // mid-case

  for (const claim of sorted) {
    const payout = Math.min(claim.amount, remaining);
    remaining -= payout;
    waterfall.push({
      class: claim.class,
      recovery: Math.round(payout),
      pct: claim.amount > 0 ? Math.round(payout / claim.amount * 100) : 0,
    });
  }

  return {
    low: totalClaims > 0 ? Math.round(lowPool / totalClaims * 100) : 0,
    high: totalClaims > 0 ? Math.round(highPool / totalClaims * 100) : 0,
    waterfall,
  };
}

export const LEGAL_STAGES = [
  { key: "pre_filing", label: "Pre-Filing", order: 0 },
  { key: "chapter_11", label: "Chapter 11 Filed", order: 1 },
  { key: "chapter_7", label: "Chapter 7 Filed", order: 1 },
  { key: "receivership", label: "Receivership", order: 1 },
  { key: "plan_confirmed", label: "Plan Confirmed", order: 2 },
  { key: "emerged", label: "Emerged", order: 3 },
  { key: "liquidated", label: "Liquidated", order: 3 },
] as const;

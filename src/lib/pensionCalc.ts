/**
 * Pension projection + Feriepenge calculator
 *
 * Pure calculations, no React. Used by PensionCheck and FerieCheck components.
 */
import type { ExtractedPayslip } from "./payslipTypes";

// ── Pension Projection ──

export interface PensionInput {
  monthlyEmployee: number;
  monthlyEmployer: number;
  currentAge: number;
  retirementAge?: number;       // default 68
  currentSavings?: number;      // existing pension savings
  expectedReturn?: number;      // annual return, default 0.05 (5%)
}

export interface PensionProjection {
  /** Total projected pension at retirement */
  projectedTotal: number;
  /** Monthly payout over 20 years */
  monthlyPayout: number;
  /** What % of current net salary the payout replaces */
  replacementRate: number;
  /** Health indicator */
  health: "red" | "amber" | "green";
  /** Years until retirement */
  yearsToRetirement: number;
  /** Total contributions (no growth) */
  totalContributions: number;
  /** Growth from returns */
  investmentGrowth: number;
  /** Monthly total contribution */
  monthlyTotal: number;
}

export function projectPension(input: PensionInput, monthlyNet: number): PensionProjection {
  const retirementAge = input.retirementAge ?? 68;
  const currentSavings = input.currentSavings ?? 0;
  const annualReturn = input.expectedReturn ?? 0.05;
  const monthlyReturn = annualReturn / 12;

  const yearsToRetirement = Math.max(0, retirementAge - input.currentAge);
  const months = yearsToRetirement * 12;

  const monthlyTotal = input.monthlyEmployee + input.monthlyEmployer;

  // Future Value = currentSavings × (1+r)^n + monthlyContribution × [((1+r)^n - 1) / r]
  let projectedTotal: number;
  if (monthlyReturn === 0 || months === 0) {
    projectedTotal = currentSavings + monthlyTotal * months;
  } else {
    const compoundFactor = Math.pow(1 + monthlyReturn, months);
    projectedTotal =
      currentSavings * compoundFactor +
      monthlyTotal * ((compoundFactor - 1) / monthlyReturn);
  }

  projectedTotal = Math.round(projectedTotal);

  const totalContributions = currentSavings + monthlyTotal * months;
  const investmentGrowth = projectedTotal - totalContributions;

  // Monthly payout over 20 years (simple annuity)
  const payoutYears = 20;
  const payoutMonths = payoutYears * 12;
  let monthlyPayout: number;
  if (monthlyReturn === 0) {
    monthlyPayout = projectedTotal / payoutMonths;
  } else {
    // PMT formula: PV × r / (1 - (1+r)^-n)
    monthlyPayout = projectedTotal * monthlyReturn / (1 - Math.pow(1 + monthlyReturn, -payoutMonths));
  }
  monthlyPayout = Math.round(monthlyPayout);

  const replacementRate = monthlyNet > 0 ? Math.round((monthlyPayout / monthlyNet) * 100) : 0;

  let health: "red" | "amber" | "green";
  if (replacementRate < 50) health = "red";
  else if (replacementRate < 70) health = "amber";
  else health = "green";

  return {
    projectedTotal,
    monthlyPayout,
    replacementRate,
    health,
    yearsToRetirement,
    totalContributions: Math.round(totalContributions),
    investmentGrowth: Math.round(investmentGrowth),
    monthlyTotal,
  };
}

export function pensionInputFromPayslip(p: ExtractedPayslip, currentAge: number): PensionInput {
  return {
    monthlyEmployee: p.pensionEmployee,
    monthlyEmployer: p.pensionEmployer,
    currentAge,
  };
}

// ── Feriepenge Calculator ──

export interface FeriepengeResult {
  /** Monthly accrual (from payslip or 12.5% of brutto) */
  monthlyAccrual: number;
  /** Days accrued per month (2.08) */
  daysPerMonth: number;
  /** Annual total feriepenge */
  annualTotal: number;
  /** Kr per holiday day */
  krPerDay: number;
  /** Total annual holiday days (25) */
  totalDays: number;
  /** Warning about expiry (show Sept-Dec) */
  showExpiryWarning: boolean;
}

export function calculateFeriepenge(p: ExtractedPayslip): FeriepengeResult {
  const monthlyAccrual = p.feriepengeHensaet && p.feriepengeHensaet > 0
    ? p.feriepengeHensaet
    : Math.round(p.bruttolon * 0.125);

  const annualTotal = monthlyAccrual * 12;
  const totalDays = 25; // 5 weeks
  const daysPerMonth = 2.08;
  const krPerDay = totalDays > 0 ? Math.round(annualTotal / totalDays) : 0;

  // Show expiry warning Sept-Dec
  const month = new Date().getMonth(); // 0-indexed
  const showExpiryWarning = month >= 8; // September = 8

  return {
    monthlyAccrual,
    daysPerMonth,
    annualTotal,
    krPerDay,
    totalDays,
    showExpiryWarning,
  };
}

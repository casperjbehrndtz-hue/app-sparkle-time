/**
 * Danish tax engine — 2026 rates
 *
 * Pure calculation logic, no React. Used by SkatCheck and Jobskifte.
 */
import type { ExtractedPayslip } from "./payslipTypes";

// ── 2026 Tax Rates ──
export const TAX_RATES = {
  AM_RATE: 0.08,
  PERSONFRADRAG: 54_100,        // kr/år
  BUNDSKAT: 0.1209,
  TOPSKAT_RATE: 0.15,
  TOPSKAT_GRENSE: 588_900,      // årlig A-indkomst over denne
  KIRKESKAT_GNS: 0.0071,
  KOMMUNESKAT_GNS: 0.2516,
  ATP_MONTHLY: 99,
} as const;

// ── Kommune tax rates 2026 (top 30 + common) ──
const KOMMUNE_SKAT: Record<string, number> = {
  "København": 0.2356,
  "Frederiksberg": 0.2280,
  "Aarhus": 0.2558,
  "Odense": 0.2580,
  "Aalborg": 0.2560,
  "Esbjerg": 0.2590,
  "Randers": 0.2600,
  "Kolding": 0.2530,
  "Horsens": 0.2570,
  "Vejle": 0.2500,
  "Roskilde": 0.2510,
  "Herning": 0.2560,
  "Silkeborg": 0.2560,
  "Næstved": 0.2600,
  "Fredericia": 0.2580,
  "Viborg": 0.2600,
  "Køge": 0.2520,
  "Holstebro": 0.2570,
  "Slagelse": 0.2600,
  "Svendborg": 0.2610,
  "Helsingør": 0.2520,
  "Hillerød": 0.2510,
  "Holbæk": 0.2580,
  "Sønderborg": 0.2590,
  "Lyngby-Taarbæk": 0.2340,
  "Gentofte": 0.2300,
  "Gladsaxe": 0.2380,
  "Ballerup": 0.2600,
  "Hvidovre": 0.2520,
  "Greve": 0.2410,
};

export function getKommuneSkat(municipality?: string): number {
  if (!municipality) return TAX_RATES.KOMMUNESKAT_GNS;
  // Try exact match first, then partial
  if (KOMMUNE_SKAT[municipality]) return KOMMUNE_SKAT[municipality];
  const lower = municipality.toLowerCase();
  for (const [name, rate] of Object.entries(KOMMUNE_SKAT)) {
    if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
      return rate;
    }
  }
  return TAX_RATES.KOMMUNESKAT_GNS;
}

// ── Types ──
export interface TaxInput {
  monthlyGross: number;
  pensionEmployee: number;
  pensionEmployer: number;
  atp: number;
  municipality?: string;
  churchTax: boolean;
  /** Override personfradrag if known from payslip */
  personfradragOverride?: number;
}

export interface TaxResult {
  // Annual
  annualGross: number;
  amBidrag: number;
  aIndkomst: number;
  bundskat: number;
  topskat: number;
  kommuneskat: number;
  kirkeskat: number;
  totalSkat: number;
  annualNet: number;

  // Monthly
  monthlyNet: number;
  monthlyTax: number;
  monthlyAmBidrag: number;

  // Rates
  effectiveTaxRate: number;
  marginalRate: number;
  kommuneskatRate: number;

  // Pension
  annualPensionTotal: number;
  totalCompensation: number;  // annualGross + pensionEmployer*12
}

export function calculateAnnualTax(input: TaxInput): TaxResult {
  const annualGross = input.monthlyGross * 12;
  const annualPensionEmp = input.pensionEmployee * 12;
  const annualAtp = input.atp * 12;

  // 1. AM-grundlag = brutto - employee pension - ATP
  const amGrundlag = annualGross - annualPensionEmp - annualAtp;

  // 2. AM-bidrag = 8%
  const amBidrag = Math.round(amGrundlag * TAX_RATES.AM_RATE);

  // 3. A-indkomst = AM-grundlag - AM-bidrag
  const aIndkomst = amGrundlag - amBidrag;

  // 4. Personfradrag
  const personfradrag = input.personfradragOverride
    ? input.personfradragOverride * 12
    : TAX_RATES.PERSONFRADRAG;

  // 5. Skattepligtig indkomst
  const skattepligtig = Math.max(0, aIndkomst - personfradrag);

  // 6. Kommune + kirkeskat
  const kommuneRate = getKommuneSkat(input.municipality);
  const kommuneskat = Math.round(skattepligtig * kommuneRate);
  const kirkeskat = input.churchTax ? Math.round(skattepligtig * TAX_RATES.KIRKESKAT_GNS) : 0;

  // 7. Bundskat
  const bundskat = Math.round(skattepligtig * TAX_RATES.BUNDSKAT);

  // 8. Topskat (over grænsen, beregnet på A-indkomst MINUS personfradrag)
  const topBase = Math.max(0, aIndkomst - TAX_RATES.TOPSKAT_GRENSE);
  const topskat = Math.round(topBase * TAX_RATES.TOPSKAT_RATE);

  // 9. Total skat
  const totalSkat = amBidrag + bundskat + topskat + kommuneskat + kirkeskat + annualAtp;

  // 10. Netto
  const annualNet = annualGross - annualPensionEmp - totalSkat;

  const effectiveTaxRate = annualGross > 0 ? (totalSkat / annualGross) * 100 : 0;

  // Marginal rate = what you pay on next krone earned
  const isTopSkat = aIndkomst > TAX_RATES.TOPSKAT_GRENSE;
  const marginalRate = (1 - TAX_RATES.AM_RATE) *
    (kommuneRate + TAX_RATES.BUNDSKAT + (isTopSkat ? TAX_RATES.TOPSKAT_RATE : 0) + (input.churchTax ? TAX_RATES.KIRKESKAT_GNS : 0))
    + TAX_RATES.AM_RATE;

  const annualPensionTotal = (input.pensionEmployee + input.pensionEmployer) * 12;

  return {
    annualGross,
    amBidrag,
    aIndkomst,
    bundskat,
    topskat,
    kommuneskat,
    kirkeskat,
    totalSkat,
    annualNet,
    monthlyNet: Math.round(annualNet / 12),
    monthlyTax: Math.round(totalSkat / 12),
    monthlyAmBidrag: Math.round(amBidrag / 12),
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    marginalRate: Math.round(marginalRate * 1000) / 10,
    kommuneskatRate: Math.round(kommuneRate * 10000) / 100,
    annualPensionTotal,
    totalCompensation: annualGross + input.pensionEmployer * 12,
  };
}

// ── Convenience: payslip → tax input ──
export function taxInputFromPayslip(p: ExtractedPayslip): TaxInput {
  return {
    monthlyGross: p.bruttolon,
    pensionEmployee: p.pensionEmployee,
    pensionEmployer: p.pensionEmployer,
    atp: p.atp,
    municipality: p.municipality,
    churchTax: false, // conservative default — can't know from payslip
    personfradragOverride: p.personfradrag > 0 ? p.personfradrag : undefined,
  };
}

// ── Restskat estimering ──
export interface RestskatEstimate {
  /** Positive = you owe SKAT. Negative = you get money back. */
  difference: number;
  /** Annual tax from our calculation */
  calculatedAnnualTax: number;
  /** Annual tax implied by the payslip's trækprocent */
  payslipImpliedTax: number;
  /** Status for UI */
  status: "owes" | "refund" | "ok";
  /** Human-friendly monthly impact */
  monthlyImpact: number;
}

export function estimateRestskat(p: ExtractedPayslip): RestskatEstimate {
  const taxInput = taxInputFromPayslip(p);
  const calculated = calculateAnnualTax(taxInput);

  // What the payslip trækprocent implies annually
  // trækprocent applies to A-indkomst after personfradrag
  const personfradragAnnual = p.personfradrag > 0 ? p.personfradrag * 12 : TAX_RATES.PERSONFRADRAG;
  const aIndkomst = calculated.aIndkomst;
  const skattepligtigPayslip = Math.max(0, aIndkomst - personfradragAnnual);

  // The trækprocent from the payslip includes kommuneskat + bundskat + kirkeskat
  // AM-bidrag is separate (always 8%)
  const payslipImpliedIncomeTax = Math.round(skattepligtigPayslip * (p.traekkort / 100));
  const payslipImpliedTax = calculated.amBidrag + payslipImpliedIncomeTax + p.atp * 12;

  const difference = calculated.totalSkat - payslipImpliedTax;
  const monthlyImpact = Math.round(difference / 12);

  let status: "owes" | "refund" | "ok";
  if (difference > 1200) status = "owes";
  else if (difference < -1200) status = "refund";
  else status = "ok";

  return {
    difference: Math.round(difference),
    calculatedAnnualTax: calculated.totalSkat,
    payslipImpliedTax,
    status,
    monthlyImpact,
  };
}

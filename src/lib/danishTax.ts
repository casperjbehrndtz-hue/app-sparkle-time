/**
 * Danish tax engine — 2026 rates
 *
 * Pure calculation logic, no React. Used by SkatCheck and Jobskifte.
 *
 * 2026 tax reform: bundskat + mellemskat + topskat + top-topskat
 * Source: skat.dk, skm.dk, Statistics Denmark (DST)
 */
import type { ExtractedPayslip } from "./payslipTypes";

// ── 2026 Tax Rates (post-reform) ──
export const TAX_RATES = {
  AM_RATE: 0.08,
  PERSONFRADRAG: 54_100,             // kr/år
  BUNDSKAT: 0.1201,                  // 12.01%
  MELLEMSKAT_RATE: 0.075,            // 7.5%
  MELLEMSKAT_GRENSE: 641_200,        // årlig A-indkomst over denne
  TOPSKAT_RATE: 0.075,               // 7.5%
  TOPSKAT_GRENSE: 777_900,           // årlig A-indkomst over denne
  TOPTOPSKAT_RATE: 0.05,             // 5%
  TOPTOPSKAT_GRENSE: 2_592_700,      // årlig A-indkomst over denne
  BESKAEFTIGELSESFRADRAG_RATE: 0.1275, // 12.75%
  BESKAEFTIGELSESFRADRAG_MAX: 63_300,  // kr/år
  KIRKESKAT_GNS: 0.0087,            // landsgennemsnit 2026
  KOMMUNESKAT_GNS: 0.2505,          // landsgennemsnit 2026
  ATP_MONTHLY: 99,
} as const;

// ── All 98 municipalities — 2026 rates (source: DST PSKAT table, Skatteministeriet) ──
const KOMMUNE_DATA: Record<string, { kom: number; kirke: number }> = {
  "Aabenraa":          { kom: 0.2560, kirke: 0.0095 },
  "Aalborg":           { kom: 0.2560, kirke: 0.0098 },
  "Aarhus":            { kom: 0.2452, kirke: 0.0074 },
  "Albertslund":       { kom: 0.2560, kirke: 0.0080 },
  "Allerød":           { kom: 0.2530, kirke: 0.0058 },
  "Assens":            { kom: 0.2610, kirke: 0.0098 },
  "Ballerup":          { kom: 0.2550, kirke: 0.0075 },
  "Billund":           { kom: 0.2400, kirke: 0.0089 },
  "Bornholm":          { kom: 0.2620, kirke: 0.0093 },
  "Brøndby":           { kom: 0.2430, kirke: 0.0080 },
  "Brønderslev":       { kom: 0.2630, kirke: 0.0106 },
  "Dragør":            { kom: 0.2480, kirke: 0.0061 },
  "Egedal":            { kom: 0.2570, kirke: 0.0076 },
  "Esbjerg":           { kom: 0.2610, kirke: 0.0081 },
  "Faaborg-Midtfyn":   { kom: 0.2610, kirke: 0.0105 },
  "Fanø":              { kom: 0.2610, kirke: 0.0114 },
  "Favrskov":          { kom: 0.2570, kirke: 0.0096 },
  "Faxe":              { kom: 0.2580, kirke: 0.0108 },
  "Fredensborg":       { kom: 0.2530, kirke: 0.0064 },
  "Fredericia":        { kom: 0.2550, kirke: 0.0088 },
  "Frederiksberg":     { kom: 0.2450, kirke: 0.0050 },
  "Frederikshavn":     { kom: 0.2620, kirke: 0.0103 },
  "Frederikssund":     { kom: 0.2560, kirke: 0.0096 },
  "Furesø":            { kom: 0.2488, kirke: 0.0070 },
  "Gentofte":          { kom: 0.2414, kirke: 0.0038 },
  "Gladsaxe":          { kom: 0.2360, kirke: 0.0075 },
  "Glostrup":          { kom: 0.2460, kirke: 0.0080 },
  "Greve":             { kom: 0.2459, kirke: 0.0081 },
  "Gribskov":          { kom: 0.2540, kirke: 0.0085 },
  "Guldborgsund":      { kom: 0.2580, kirke: 0.0116 },
  "Haderslev":         { kom: 0.2630, kirke: 0.0095 },
  "Halsnæs":           { kom: 0.2570, kirke: 0.0085 },
  "Hedensted":         { kom: 0.2552, kirke: 0.0098 },
  "Helsingør":         { kom: 0.2582, kirke: 0.0063 },
  "Herlev":            { kom: 0.2370, kirke: 0.0080 },
  "Herning":           { kom: 0.2540, kirke: 0.0099 },
  "Hillerød":          { kom: 0.2560, kirke: 0.0069 },
  "Hjørring":          { kom: 0.2621, kirke: 0.0119 },
  "Holbæk":            { kom: 0.2530, kirke: 0.0096 },
  "Holstebro":         { kom: 0.2550, kirke: 0.0108 },
  "Horsens":           { kom: 0.2569, kirke: 0.0079 },
  "Hvidovre":          { kom: 0.2540, kirke: 0.0072 },
  "Høje-Taastrup":     { kom: 0.2460, kirke: 0.0080 },
  "Hørsholm":          { kom: 0.2370, kirke: 0.0062 },
  "Ikast-Brande":      { kom: 0.2510, kirke: 0.0097 },
  "Ishøj":             { kom: 0.2500, kirke: 0.0090 },
  "Jammerbugt":        { kom: 0.2570, kirke: 0.0120 },
  "Kalundborg":        { kom: 0.2420, kirke: 0.0101 },
  "Kerteminde":        { kom: 0.2610, kirke: 0.0098 },
  "Kolding":           { kom: 0.2550, kirke: 0.0092 },
  "København":         { kom: 0.2339, kirke: 0.0080 },
  "Køge":              { kom: 0.2526, kirke: 0.0087 },
  "Langeland":         { kom: 0.2630, kirke: 0.0114 },
  "Lejre":             { kom: 0.2531, kirke: 0.0105 },
  "Lemvig":            { kom: 0.2570, kirke: 0.0127 },
  "Lolland":           { kom: 0.2630, kirke: 0.0123 },
  "Lyngby-Taarbæk":    { kom: 0.2438, kirke: 0.0060 },
  "Læsø":              { kom: 0.2630, kirke: 0.0130 },
  "Mariagerfjord":     { kom: 0.2590, kirke: 0.0115 },
  "Middelfart":        { kom: 0.2580, kirke: 0.0090 },
  "Morsø":             { kom: 0.2580, kirke: 0.0120 },
  "Norddjurs":         { kom: 0.2600, kirke: 0.0100 },
  "Nordfyns":          { kom: 0.2600, kirke: 0.0104 },
  "Nyborg":            { kom: 0.2630, kirke: 0.0100 },
  "Næstved":           { kom: 0.2500, kirke: 0.0098 },
  "Odder":             { kom: 0.2510, kirke: 0.0095 },
  "Odense":            { kom: 0.2550, kirke: 0.0068 },
  "Odsherred":         { kom: 0.2630, kirke: 0.0098 },
  "Randers":           { kom: 0.2600, kirke: 0.0089 },
  "Rebild":            { kom: 0.2583, kirke: 0.0120 },
  "Ringkøbing-Skjern": { kom: 0.2500, kirke: 0.0105 },
  "Ringsted":          { kom: 0.2610, kirke: 0.0095 },
  "Roskilde":          { kom: 0.2520, kirke: 0.0084 },
  "Rudersdal":         { kom: 0.2347, kirke: 0.0057 },
  "Rødovre":           { kom: 0.2570, kirke: 0.0072 },
  "Samsø":             { kom: 0.2590, kirke: 0.0120 },
  "Silkeborg":         { kom: 0.2550, kirke: 0.0094 },
  "Skanderborg":       { kom: 0.2600, kirke: 0.0086 },
  "Skive":             { kom: 0.2550, kirke: 0.0109 },
  "Slagelse":          { kom: 0.2610, kirke: 0.0096 },
  "Solrød":            { kom: 0.2499, kirke: 0.0084 },
  "Sorø":              { kom: 0.2630, kirke: 0.0095 },
  "Stevns":            { kom: 0.2600, kirke: 0.0110 },
  "Struer":            { kom: 0.2530, kirke: 0.0120 },
  "Svendborg":         { kom: 0.2630, kirke: 0.0102 },
  "Syddjurs":          { kom: 0.2590, kirke: 0.0098 },
  "Sønderborg":        { kom: 0.2570, kirke: 0.0091 },
  "Thisted":           { kom: 0.2550, kirke: 0.0127 },
  "Tårnby":            { kom: 0.2410, kirke: 0.0061 },
  "Tønder":            { kom: 0.2530, kirke: 0.0116 },
  "Vallensbæk":        { kom: 0.2560, kirke: 0.0080 },
  "Varde":             { kom: 0.2510, kirke: 0.0095 },
  "Vejen":             { kom: 0.2580, kirke: 0.0106 },
  "Vejle":             { kom: 0.2340, kirke: 0.0089 },
  "Vesthimmerland":    { kom: 0.2630, kirke: 0.0118 },
  "Viborg":            { kom: 0.2550, kirke: 0.0093 },
  "Vordingborg":       { kom: 0.2630, kirke: 0.0102 },
  "Ærø":               { kom: 0.2610, kirke: 0.0107 },
};

export function getKommuneSkat(municipality?: string): number {
  if (!municipality) return TAX_RATES.KOMMUNESKAT_GNS;
  const data = findKommune(municipality);
  return data ? data.kom : TAX_RATES.KOMMUNESKAT_GNS;
}

export function getKirkeSkat(municipality?: string): number {
  if (!municipality) return TAX_RATES.KIRKESKAT_GNS;
  const data = findKommune(municipality);
  return data ? data.kirke : TAX_RATES.KIRKESKAT_GNS;
}

function findKommune(municipality: string): { kom: number; kirke: number } | undefined {
  // Exact match
  if (KOMMUNE_DATA[municipality]) return KOMMUNE_DATA[municipality];
  // Case-insensitive + partial match
  const lower = municipality.toLowerCase();
  for (const [name, data] of Object.entries(KOMMUNE_DATA)) {
    if (lower === name.toLowerCase()) return data;
  }
  for (const [name, data] of Object.entries(KOMMUNE_DATA)) {
    if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
      return data;
    }
  }
  return undefined;
}

/** List all municipality names (for dropdowns) */
export function getAllKommuner(): string[] {
  return Object.keys(KOMMUNE_DATA).sort((a, b) => a.localeCompare(b, "da"));
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
  beskaeftigelsesfradrag: number;
  bundskat: number;
  mellemskat: number;
  topskat: number;
  toptopskat: number;
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

  // 4. Beskæftigelsesfradrag: 12.75% of AM-grundlag, max 63,300 kr
  const beskaeftigelsesfradrag = Math.min(
    Math.round(amGrundlag * TAX_RATES.BESKAEFTIGELSESFRADRAG_RATE),
    TAX_RATES.BESKAEFTIGELSESFRADRAG_MAX,
  );

  // 5. Personfradrag
  const personfradrag = input.personfradragOverride
    ? input.personfradragOverride * 12
    : TAX_RATES.PERSONFRADRAG;

  // 6. Skattepligtig indkomst (for bundskat + kommune + kirke)
  //    Beskæftigelsesfradrag reduces the base for kommune/kirkeskat
  const skattepligtig = Math.max(0, aIndkomst - personfradrag);
  const skattepligtigKommune = Math.max(0, aIndkomst - personfradrag - beskaeftigelsesfradrag);

  // 7. Kommune + kirkeskat (on income after personfradrag + beskæftigelsesfradrag)
  const kommuneRate = getKommuneSkat(input.municipality);
  const kommuneskat = Math.round(skattepligtigKommune * kommuneRate);

  const kirkeRate = input.churchTax ? getKirkeSkat(input.municipality) : 0;
  const kirkeskat = Math.round(skattepligtigKommune * kirkeRate);

  // 8. Bundskat (on income after personfradrag, NOT after beskæftigelsesfradrag)
  const bundskat = Math.round(skattepligtig * TAX_RATES.BUNDSKAT);

  // 9. Mellemskat: 7.5% on A-indkomst over 641,200
  const mellemBase = Math.max(0, aIndkomst - TAX_RATES.MELLEMSKAT_GRENSE);
  const mellemskat = Math.round(mellemBase * TAX_RATES.MELLEMSKAT_RATE);

  // 10. Topskat: 7.5% on A-indkomst over 777,900
  const topBase = Math.max(0, aIndkomst - TAX_RATES.TOPSKAT_GRENSE);
  const topskat = Math.round(topBase * TAX_RATES.TOPSKAT_RATE);

  // 11. Top-topskat: 5% on A-indkomst over 2,592,700
  const toptopBase = Math.max(0, aIndkomst - TAX_RATES.TOPTOPSKAT_GRENSE);
  const toptopskat = Math.round(toptopBase * TAX_RATES.TOPTOPSKAT_RATE);

  // 12. Total skat
  const totalSkat = amBidrag + bundskat + mellemskat + topskat + toptopskat + kommuneskat + kirkeskat + annualAtp;

  // 13. Netto
  const annualNet = annualGross - annualPensionEmp - totalSkat;

  const effectiveTaxRate = annualGross > 0 ? (totalSkat / annualGross) * 100 : 0;

  // Marginal rate = what you pay on next krone earned
  const ismellem = aIndkomst > TAX_RATES.MELLEMSKAT_GRENSE;
  const isTop = aIndkomst > TAX_RATES.TOPSKAT_GRENSE;
  const isToptop = aIndkomst > TAX_RATES.TOPTOPSKAT_GRENSE;
  const marginalRate = TAX_RATES.AM_RATE +
    (1 - TAX_RATES.AM_RATE) * (
      kommuneRate + TAX_RATES.BUNDSKAT +
      (ismellem ? TAX_RATES.MELLEMSKAT_RATE : 0) +
      (isTop ? TAX_RATES.TOPSKAT_RATE : 0) +
      (isToptop ? TAX_RATES.TOPTOPSKAT_RATE : 0) +
      (input.churchTax ? kirkeRate : 0)
    );

  const annualPensionTotal = (input.pensionEmployee + input.pensionEmployer) * 12;

  return {
    annualGross,
    amBidrag,
    aIndkomst,
    beskaeftigelsesfradrag,
    bundskat,
    mellemskat,
    topskat,
    toptopskat,
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

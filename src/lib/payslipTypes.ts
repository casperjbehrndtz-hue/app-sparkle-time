import type { BudgetProfile } from "./types";

/** What Claude Vision extracts from a Danish payslip image */
export interface ExtractedPayslip {
  // Core
  bruttolon: number;
  nettolon: number;

  // Deductions (monthly)
  amBidrag: number;
  aSkat: number;
  atp: number;
  pensionEmployee: number;
  pensionEmployer: number;
  traekkort: number;        // trækprocent e.g. 37
  personfradrag: number;

  // Optional deductions
  fagforening?: number;
  sundhedsforsikring?: number;
  fritvalgKonto?: number;
  feriepengeHensaet?: number;

  // Pay components (grundløn, bonus, tillæg etc.)
  grundlon: number | null;
  payComponents: { name: string; amount: number }[];

  // Other deductions not covered above (e.g. gruppeliv, fitness, ulykke)
  otherDeductions: { name: string; amount: number }[];

  // Raw receipt lines — every line from the payslip in order
  receiptLines: { label: string; amount: string; type: "income" | "deduction" | "subtotal" | "info" | "redacted" }[];

  // Context (private — shown only to the user)
  employerName?: string;
  jobTitle?: string;
  municipality?: string;
  payPeriod?: string;
  payrollSystem?: string;

  // Anonymous context (safe to share)
  anonDescription: string;   // e.g. "Laborant i pharma-branchen, Storkøbenhavn"
  anonJobTitle?: string;     // e.g. "Laborant" (generic, no employer)
  anonIndustry?: string;     // e.g. "Pharma"
  anonRegion?: string;       // e.g. "Storkøbenhavn" (broad region, not city)

  // Quality
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

/** Map extracted payslip → partial BudgetProfile for onboarding pre-fill */
export function payslipToProfile(p: ExtractedPayslip): Partial<BudgetProfile> {
  const partial: Partial<BudgetProfile> = {
    income: p.nettolon,
    bruttolon: p.bruttolon,
  };

  // Union
  if (p.fagforening && p.fagforening > 0) {
    partial.hasUnion = true;
    partial.unionAmount = p.fagforening;
  }

  // Tax context — enables precise interest deductions + dagpenge calc
  if (p.traekkort > 0) partial.traekkort = p.traekkort;
  if (p.personfradrag > 0) partial.personfradrag = p.personfradrag;

  // Pension — if employee contributes, hint that user has savings mindset
  if (p.pensionEmployee > 0) partial.pensionEmployee = p.pensionEmployee;
  if (p.pensionEmployer > 0) partial.pensionEmployer = p.pensionEmployer;

  // Employer-paid health insurance — may overlap with private insurance
  if (p.sundhedsforsikring && p.sundhedsforsikring > 0) {
    partial.sundhedsforsikring = p.sundhedsforsikring;
  }

  // Hidden employer benefits
  if (p.feriepengeHensaet && p.feriepengeHensaet > 0) partial.feriepengeHensaet = p.feriepengeHensaet;
  if (p.fritvalgKonto && p.fritvalgKonto > 0) partial.fritvalgKonto = p.fritvalgKonto;

  // Income stability — grundløn vs brutto reveals variable pay risk
  if (p.grundlon && p.grundlon > 0 && p.bruttolon > 0) {
    partial.grundlon = p.grundlon;
    const variable = p.bruttolon - p.grundlon;
    partial.variableIncomePct = Math.round((variable / p.bruttolon) * 100);
  }

  // Industry + region — for personalized benchmarks
  if (p.anonIndustry) partial.anonIndustry = p.anonIndustry;
  if (p.anonRegion) partial.anonRegion = p.anonRegion;

  return partial;
}

/** All deduction line items for waterfall visualization */
export interface DeductionLine {
  key: string;
  i18nKey: string;
  amount: number;
  color: string;
}

/** Explanation + normalcy check for a deduction line */
export interface DeductionInsight {
  explanationKey: string;   // i18n key for "what is this?"
  normalRangeKey: string;   // i18n key for typical range
  status: "normal" | "high" | "low" | "info";
}

/** Get explanation and normalcy status for each deduction */
export function getDeductionInsights(p: ExtractedPayslip): Record<string, DeductionInsight> {
  const insights: Record<string, DeductionInsight> = {};
  const brutto = p.bruttolon;

  // AM-bidrag: always 8% of AM-grundlag (brutto - employee pension - ATP)
  if (p.amBidrag > 0) {
    const base = brutto - p.pensionEmployee - p.atp;
    const expectedAm = Math.round(base * 0.08);
    const diff = Math.abs(p.amBidrag - expectedAm);
    insights.amBidrag = {
      explanationKey: "payslip.explain.amBidrag",
      normalRangeKey: "payslip.range.amBidrag",
      status: diff < 50 ? "normal" : "info",
    };
  }

  // Pension: total (employee + employer) typically 12-17% of brutto
  if (p.pensionEmployee > 0 || p.pensionEmployer > 0) {
    const totalPension = p.pensionEmployee + (p.pensionEmployer || 0);
    const pensionPct = brutto > 0 ? (totalPension / brutto) * 100 : 0;
    insights.pension = {
      explanationKey: "payslip.explain.pension",
      normalRangeKey: "payslip.range.pension",
      status: pensionPct < 8 ? "low" : pensionPct > 20 ? "high" : "normal",
    };
  }

  // A-skat: trækprocent typically 35-42%
  if (p.aSkat > 0) {
    const traek = p.traekkort;
    insights.aSkat = {
      explanationKey: "payslip.explain.aSkat",
      normalRangeKey: "payslip.range.aSkat",
      status: traek > 0 ? (traek < 33 ? "low" : traek > 45 ? "high" : "normal") : "info",
    };
  }

  // ATP: fixed at ~99 kr/month for full-time
  if (p.atp > 0) {
    insights.atp = {
      explanationKey: "payslip.explain.atp",
      normalRangeKey: "payslip.range.atp",
      status: Math.abs(p.atp - 99) < 10 ? "normal" : "info",
    };
  }

  // Fagforening: typically 300-600 kr
  if (p.fagforening && p.fagforening > 0) {
    insights.fagforening = {
      explanationKey: "payslip.explain.fagforening",
      normalRangeKey: "payslip.range.fagforening",
      status: p.fagforening > 800 ? "high" : "normal",
    };
  }

  // Sundhedsforsikring: employer-paid, typically 50-200 kr
  if (p.sundhedsforsikring && p.sundhedsforsikring > 0) {
    insights.sundhed = {
      explanationKey: "payslip.explain.sundhedsforsikring",
      normalRangeKey: "payslip.range.sundhedsforsikring",
      status: "normal",
    };
  }

  // Fritvalg: typically 1-7% via overenskomst
  if (p.fritvalgKonto && p.fritvalgKonto > 0) {
    insights.fritvalg = {
      explanationKey: "payslip.explain.fritvalg",
      normalRangeKey: "payslip.range.fritvalg",
      status: "normal",
    };
  }

  // Feriepenge: 12.5% set aside
  if (p.feriepengeHensaet && p.feriepengeHensaet > 0) {
    insights.feriepenge = {
      explanationKey: "payslip.explain.feriepenge",
      normalRangeKey: "payslip.range.feriepenge",
      status: "normal",
    };
  }

  return insights;
}

// ─── Payslip Insights (new) ───────────────────────────
export interface PayslipInsights {
  effectiveTaxRate: number;      // reelt skattetryk i %
  marginalTaxRate: number;       // trækprocent
  annualGross: number;           // brutto × 12
  annualNet: number;             // netto × 12
  annualDeductions: number;      // fradrag × 12
  pensionTotal: number;          // employee + employer monthly
  pensionPct: number;            // total pension / brutto %
  pensionHealth: "low" | "ok" | "good";
  retentionPct: number;          // netto / brutto × 100
  personfradragMonthly: number;  // monthly personfradrag

  // SKAT-view: hvad ser SKAT?
  amGrundlag: number;            // brutto - pensionEmployee - atp
  aIndkomst: number;             // amGrundlag - amBidrag
  annualAmGrundlag: number;      // amGrundlag × 12
  annualAIndkomst: number;       // aIndkomst × 12
  hasOpsparingsNote: boolean;    // fritvalg/ferietillæg opspares
  opsparetMonthly: number;       // samlet opsparing pr. md
}

export function calculatePayslipInsights(p: ExtractedPayslip): PayslipInsights {
  const brutto = p.bruttolon || 1;
  const netto = p.nettolon || 0;
  const totalDeductions = brutto - netto;

  // Effective tax rate: only actual taxes (AM-bidrag + A-skat + ATP)
  // Pension is savings, not tax — exclude it so effective < trækprocent (makes sense to users)
  const taxOnly = p.amBidrag + p.aSkat + p.atp;
  const effectiveTaxRate = (taxOnly / brutto) * 100;

  const pensionTotal = p.pensionEmployee + p.pensionEmployer;
  const pensionPct = brutto > 0 ? (pensionTotal / brutto) * 100 : 0;

  let pensionHealth: "low" | "ok" | "good" = "ok";
  if (pensionPct < 12) pensionHealth = "low";
  else if (pensionPct >= 15) pensionHealth = "good";

  const personfradragMonthly = p.personfradrag > 0 ? p.personfradrag : Math.round(54_100 / 12);

  // SKAT-view
  const amGrundlag = brutto - p.pensionEmployee - p.atp;
  const aIndkomst = amGrundlag - p.amBidrag;
  const opsparetMonthly = (p.fritvalgKonto || 0) + (p.feriepengeHensaet || 0);

  return {
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    marginalTaxRate: p.traekkort,
    annualGross: brutto * 12,
    annualNet: netto * 12,
    annualDeductions: totalDeductions * 12,
    pensionTotal,
    pensionPct: Math.round(pensionPct * 10) / 10,
    pensionHealth,
    retentionPct: Math.round((netto / brutto) * 1000) / 10,
    personfradragMonthly,

    amGrundlag,
    aIndkomst,
    annualAmGrundlag: amGrundlag * 12,
    annualAIndkomst: aIndkomst * 12,
    hasOpsparingsNote: opsparetMonthly > 0,
    opsparetMonthly,
  };
}

export function getDeductionLines(p: ExtractedPayslip): DeductionLine[] {
  const lines: DeductionLine[] = [];

  if (p.amBidrag > 0)
    lines.push({ key: "amBidrag", i18nKey: "payslip.deductions.amBidrag", amount: p.amBidrag, color: "#ef4444" });
  if (p.pensionEmployee > 0)
    lines.push({ key: "pension", i18nKey: "payslip.deductions.pension", amount: p.pensionEmployee, color: "#f59e0b" });
  if (p.aSkat > 0)
    lines.push({ key: "aSkat", i18nKey: "payslip.deductions.aSkat", amount: p.aSkat, color: "#dc2626" });
  if (p.atp > 0)
    lines.push({ key: "atp", i18nKey: "payslip.deductions.atp", amount: p.atp, color: "#f87171" });
  if (p.fagforening && p.fagforening > 0)
    lines.push({ key: "fagforening", i18nKey: "payslip.deductions.union", amount: p.fagforening, color: "#a855f7" });
  if (p.sundhedsforsikring && p.sundhedsforsikring > 0)
    lines.push({ key: "sundhed", i18nKey: "payslip.deductions.healthIns", amount: p.sundhedsforsikring, color: "#ec4899" });
  if (p.fritvalgKonto && p.fritvalgKonto > 0)
    lines.push({ key: "fritvalg", i18nKey: "payslip.deductions.fritvalg", amount: p.fritvalgKonto, color: "#8b5cf6" });
  if (p.feriepengeHensaet && p.feriepengeHensaet > 0)
    lines.push({ key: "feriepenge", i18nKey: "payslip.deductions.feriepenge", amount: p.feriepengeHensaet, color: "#6366f1" });

  // Group other deductions under a single "Øvrige fradrag" line
  if (p.otherDeductions && p.otherDeductions.length > 0) {
    const otherTotal = p.otherDeductions.reduce((s, od) => s + od.amount, 0);
    if (otherTotal > 0) {
      lines.push({
        key: "other",
        i18nKey: "payslip.deductions.other",
        amount: otherTotal,
        color: "#64748b",
      });
    }
  }

  return lines;
}

/** Validate and sanitize AI response into ExtractedPayslip */
export function parsePayslipResponse(raw: unknown): ExtractedPayslip | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const num = (key: string, fallback = 0, max = 500000): number => {
    let v = r[key];
    // Handle string numbers (e.g. "45000" or "45.000" Danish format)
    if (typeof v === "string") {
      v = Number(v.replace(/\./g, "").replace(",", "."));
    }
    if (typeof v === "number" && isFinite(v) && v >= 0 && v <= max) return Math.round(v);
    return fallback;
  };

  const str = (key: string): string | undefined => {
    const v = r[key];
    return typeof v === "string" && v.length > 0 ? v.slice(0, 60) : undefined;
  };

  let bruttolon = num("bruttolon");
  let nettolon = num("nettolon");
  if (bruttolon <= 0) return null;

  const extraWarnings: string[] = [];

  // ── Fix accumulated values: any single deduction > brutto is wrong ──
  const deductionKeys = ["amBidrag", "aSkat", "atp", "pensionEmployee", "fagforening", "sundhedsforsikring", "fritvalgKonto", "feriepengeHensaet"] as const;
  for (const key of deductionKeys) {
    const val = num(key);
    if (val > bruttolon && val > 0) {
      (r as Record<string, unknown>)[key] = 0;
      extraWarnings.push(`${key} nulstillet — beløbet virkede akkumuleret.`);
    }
  }

  // Pension employer: typically 8-15% of brutto. If > 25%, it's accumulated.
  let pensionEmployer = num("pensionEmployer");
  if (pensionEmployer > bruttolon * 0.25 && bruttolon > 0) {
    pensionEmployer = Math.round(bruttolon * 0.12);
    (r as Record<string, unknown>)["pensionEmployer"] = pensionEmployer;
    extraWarnings.push("Arbejdsgiverpension rettet — virkede akkumuleret.");
  }

  // ── Deduplicate otherDeductions (same name → keep smallest = "Denne periode") ──
  if (Array.isArray(r["otherDeductions"])) {
    const ods = r["otherDeductions"] as Array<{ name?: string; amount?: number }>;
    const byName = new Map<string, { name: string; amount: number }>();
    for (const d of ods) {
      if (!d?.name || typeof d.amount !== "number" || d.amount <= 0) continue;
      // Skip if amount > brutto (accumulated)
      if (d.amount > bruttolon) continue;
      const key = d.name.toLowerCase().trim();
      const existing = byName.get(key);
      if (existing) {
        if (d.amount < existing.amount) byName.set(key, { name: d.name, amount: d.amount });
      } else {
        byName.set(key, { name: d.name, amount: d.amount });
      }
    }
    (r as Record<string, unknown>)["otherDeductions"] = Array.from(byName.values());
  }

  // ── Deduplicate payComponents (same name → keep smallest) ──
  if (Array.isArray(r["payComponents"])) {
    const pcs = r["payComponents"] as Array<{ name?: unknown; amount?: number }>;
    const byName = new Map<string, { name: string; amount: number }>();
    for (const pc of pcs) {
      if (!pc?.name || typeof pc.name !== "string" || typeof pc.amount !== "number" || pc.amount <= 0) continue;
      const key = pc.name.toLowerCase().trim();
      const existing = byName.get(key);
      if (existing) {
        if (pc.amount < existing.amount) byName.set(key, { name: pc.name, amount: pc.amount });
      } else {
        byName.set(key, { name: pc.name, amount: pc.amount });
      }
    }
    (r as Record<string, unknown>)["payComponents"] = Array.from(byName.values());
  }

  // ATP is mandatory for all Danish full-time employees (~99 kr/month)
  let atp = num("atp");
  if (atp === 0 && bruttolon >= 10000) {
    atp = 99;
    extraWarnings.push("ATP sat til 99 kr/md (standard fuldtid). Ret hvis deltid.");
  }

  // NOTE: Netto estimation and brutto/netto reconciliation is now handled
  // client-side by payslipReconciler.ts which uses three-way brutto
  // cross-validation. Parser only passes through the raw AI values.

  const confidence = r["confidence"];
  const validConfidence = extraWarnings.length > 0 ? "low" :
    (confidence === "high" || confidence === "medium" || confidence === "low"
    ? confidence : "low");

  const warnings = [
    ...extraWarnings,
    ...(Array.isArray(r["warnings"])
      ? (r["warnings"] as unknown[]).filter((w): w is string => typeof w === "string").slice(0, 5)
      : []),
  ];

  return {
    bruttolon,
    nettolon,
    amBidrag: num("amBidrag"),
    aSkat: num("aSkat"),
    atp,
    pensionEmployee: num("pensionEmployee"),
    pensionEmployer: num("pensionEmployer"),
    traekkort: num("traekkort", 0, 100),
    personfradrag: num("personfradrag", 0, 15000),
    fagforening: num("fagforening") || undefined,
    sundhedsforsikring: num("sundhedsforsikring") || undefined,
    fritvalgKonto: num("fritvalgKonto") || undefined,
    feriepengeHensaet: num("feriepengeHensaet") || undefined,
    employerName: str("employerName"),
    jobTitle: str("jobTitle"),
    municipality: str("municipality"),
    payPeriod: str("payPeriod"),
    payrollSystem: str("payrollSystem"),
    grundlon: (() => {
      const v = r["grundlon"];
      if (typeof v === "number" && isFinite(v) && v > 0 && v <= 500000) return Math.round(v);
      return null;
    })(),
    payComponents: Array.isArray(r["payComponents"])
      ? (r["payComponents"] as unknown[])
          .filter((d): d is { name: string; amount: number } =>
            !!d && typeof d === "object" &&
            typeof (d as Record<string, unknown>).name === "string" &&
            typeof (d as Record<string, unknown>).amount === "number" &&
            (d as Record<string, unknown>).amount > 0)
          .map(d => ({ name: String(d.name).slice(0, 40), amount: Math.round(d.amount) }))
          .slice(0, 10)
      : [],
    otherDeductions: Array.isArray(r["otherDeductions"])
      ? (r["otherDeductions"] as unknown[])
          .filter((d): d is { name: string; amount: number } =>
            !!d && typeof d === "object" &&
            typeof (d as Record<string, unknown>).name === "string" &&
            typeof (d as Record<string, unknown>).amount === "number" &&
            (d as Record<string, unknown>).amount > 0)
          .map(d => ({ name: String(d.name).slice(0, 40), amount: Math.round(d.amount) }))
          .slice(0, 10)
      : [],
    receiptLines: Array.isArray(r["receiptLines"])
      ? (r["receiptLines"] as unknown[])
          .filter((d): d is { label: string; amount: string; type: string } =>
            !!d && typeof d === "object" &&
            typeof (d as Record<string, unknown>).label === "string" &&
            typeof (d as Record<string, unknown>).amount === "string")
          .map(d => ({
            label: String(d.label).slice(0, 50),
            amount: String(d.amount).slice(0, 20),
            type: (["income", "deduction", "subtotal", "info", "redacted"].includes(d.type) ? d.type : "info") as "income" | "deduction" | "subtotal" | "info" | "redacted",
          }))
          .slice(0, 40)
      : [],
    anonDescription: str("anonDescription") || "Lønmodtager",
    anonJobTitle: str("anonJobTitle"),
    anonIndustry: str("anonIndustry"),
    anonRegion: str("anonRegion"),
    confidence: validConfidence,
    warnings,
  };
}

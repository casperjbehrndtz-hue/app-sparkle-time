import type { ExtractedPayslip } from "./payslipTypes";

// ─── Types ───────────────────────────────────────────

export interface ReconciliationDiagnostics {
  bruttoSource: "ai" | "am_derived" | "balance_derived";
  bruttoAi: number;
  bruttoAmDerived: number;      // (AM-bidrag / 0.08) + pensionEmployee + ATP
  bruttoBalanceDerived: number; // netto + sum(all deductions)
  balanceError: number;         // computedNetto - netto
  amBidragCheck: "pass" | "fixed";
  askatCheck: "pass" | "warn";
  isAtypicalMonth: boolean;     // fratrædelsesgodtgørelse, store bonusser, etc.
  estimatedNormalBrutto?: number; // grundløn-based estimate for typical month
  fixes: string[];
}

export interface ReconciliationResult {
  payslip: ExtractedPayslip;
  confidence: "high" | "medium" | "low";
  diagnostics: ReconciliationDiagnostics;
}

// ─── Tolerances ──────────────────────────────────────

const BRUTTO_TOLERANCE = 500;    // kr — covers rounding, small supplements
const AM_TOLERANCE = 50;         // kr — AM-bidrag should be near-exact
const BALANCE_TOLERANCE = 200;   // kr — netto vs computed netto
const ASKAT_WARN_PCT = 0.20;     // 20% — A-skat has many variables

// ─── Helpers ─────────────────────────────────────────

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function sumOtherDeductions(p: ExtractedPayslip): number {
  let total = 0;
  if (p.fagforening) total += p.fagforening;
  if (p.sundhedsforsikring) total += p.sundhedsforsikring;
  if (p.fritvalgKonto) total += p.fritvalgKonto;
  if (p.feriepengeHensaet) total += p.feriepengeHensaet;
  for (const d of p.otherDeductions) total += d.amount;
  return total;
}

function totalDeductions(p: ExtractedPayslip): number {
  return p.amBidrag + p.aSkat + p.atp + p.pensionEmployee + sumOtherDeductions(p);
}

// ─── One-time payment detection ─────────────────────

const ONE_TIME_KEYWORDS = [
  "fratrædelsesgodtgørelse", "fratrædelse", "severance",
  "bonus", "gratiale", "engangsvederlag", "engangsbeløb",
  "feriepenge", "feriefri", "feriegodtgørelse",
  "jubilæum", "anciennitet", "efterregulering",
  "overarbejde", "overtidsudbetaling",
];

function detectOneTimePayments(p: ExtractedPayslip): { isAtypical: boolean; oneTimeTotal: number; normalComponents: number } {
  let oneTimeTotal = 0;
  let normalTotal = 0;

  for (const comp of p.payComponents) {
    const lower = comp.name.toLowerCase();
    const isOneTime = ONE_TIME_KEYWORDS.some(kw => lower.includes(kw));
    if (isOneTime) {
      oneTimeTotal += comp.amount;
    } else {
      normalTotal += comp.amount;
    }
  }

  // Atypical if one-time payments exceed 50% of normal salary, or > 20,000 kr
  const isAtypical = oneTimeTotal > 20_000 || (normalTotal > 0 && oneTimeTotal > normalTotal * 0.5);
  return { isAtypical, oneTimeTotal, normalComponents: normalTotal };
}

// ─── Reconciliation Engine ───────────────────────────

export function reconcilePayslip(raw: ExtractedPayslip): ReconciliationResult {
  const p = { ...raw }; // shallow copy — we'll mutate fields
  const fixes: string[] = [];
  let confidence: "high" | "medium" | "low" = "high";

  // ── Step 0: Detect atypical month (one-time payments) ──
  const { isAtypical, oneTimeTotal, normalComponents } = detectOneTimePayments(p);
  let estimatedNormalBrutto: number | undefined;

  // ── Step 1: Anchor validation ──
  // ATP: should be ~99 for full-time. Default if missing.
  if (p.atp === 0 && p.bruttolon >= 10_000) {
    p.atp = 99;
    fixes.push("ATP sat til 99 kr/md (standard fuldtid).");
  }

  // Netto: most reliable anchor (large, bold "Til udbetaling")
  const nettoTrusted = p.nettolon > 0 && p.nettolon < 200_000;

  // AM-bidrag: trust if > 0
  const amTrusted = p.amBidrag > 0;

  // ── Step 2: Derive AM-grundlag from AM-bidrag (Danish law: always exactly 8%) ──
  const amGrundlagDerived = amTrusted ? Math.round(p.amBidrag / 0.08) : 0;

  // ── Step 3: Brutto Method A (from AM invariant) ──
  // brutto = AM-grundlag + pensionEmployee + ATP
  const bruttoAmDerived = amTrusted
    ? amGrundlagDerived + p.pensionEmployee + p.atp
    : 0;

  // ── Step 4: Brutto Method B (from balance: netto + all deductions) ──
  const allDed = totalDeductions(p);
  const bruttoBalanceDerived = nettoTrusted ? p.nettolon + allDed : 0;

  // ── Step 5: Three-way brutto comparison ──
  const bruttoAi = p.bruttolon;
  let bruttoFinal = bruttoAi;
  let bruttoSource: ReconciliationDiagnostics["bruttoSource"] = "ai";

  const hasA = bruttoAmDerived > 0;
  const hasB = bruttoBalanceDerived > 0;

  if (hasA && hasB) {
    const aiMatchA = near(bruttoAi, bruttoAmDerived, BRUTTO_TOLERANCE);
    const aiMatchB = near(bruttoAi, bruttoBalanceDerived, BRUTTO_TOLERANCE);
    const abMatch = near(bruttoAmDerived, bruttoBalanceDerived, BRUTTO_TOLERANCE);

    if (isAtypical) {
      // ── Atypical month: one-time payments present ──
      // Balance-derived is technically correct for THIS month.
      // But don't scare the user — explain the situation.
      bruttoFinal = bruttoBalanceDerived;
      bruttoSource = "balance_derived";
      confidence = "medium"; // not "low" — the data is fine, just unusual

      // Estimate what a normal month looks like
      if (p.grundlon && p.grundlon > 0) {
        estimatedNormalBrutto = p.grundlon;
      } else if (normalComponents > 0) {
        estimatedNormalBrutto = normalComponents;
      }

      // Don't add scary "AI's tal stemte ikke" — explain WHY
      const oneTimeNames = p.payComponents
        .filter(c => ONE_TIME_KEYWORDS.some(kw => c.name.toLowerCase().includes(kw)))
        .map(c => c.name)
        .slice(0, 3)
        .join(", ");
      fixes.push(
        `Denne lønseddel indeholder engangsposter (${oneTimeNames}: ${oneTimeTotal.toLocaleString("da-DK")} kr). Tallene afspejler denne måned, ikke din typiske løn.`
      );
    } else if (aiMatchA && aiMatchB) {
      // All three agree — HIGH confidence
      bruttoFinal = bruttoAi;
      bruttoSource = "ai";
    } else if (abMatch && !aiMatchA) {
      // A and B agree, AI is wrong — most common case (AI read AM-grundlag or Arbejdstimer)
      bruttoFinal = bruttoAmDerived;
      bruttoSource = "am_derived";
      confidence = "medium";
      fixes.push(
        `Bruttoløn rettet: ${bruttoAi.toLocaleString("da-DK")} → ${bruttoAmDerived.toLocaleString("da-DK")} kr (AI læste sandsynligvis AM-grundlag eller forkert kolonne).`
      );
    } else if (aiMatchA && !aiMatchB) {
      // AI and A agree, but B doesn't — missing deduction or netto wrong
      bruttoFinal = bruttoAi;
      bruttoSource = "ai";
      confidence = "medium";
      const gap = Math.abs(bruttoBalanceDerived - bruttoAi);
      fixes.push(
        `Lønsedlen balancerer ikke helt (forskel: ${gap.toLocaleString("da-DK")} kr). Der kan mangle et fradrag.`
      );
    } else if (aiMatchB && !aiMatchA) {
      // AI and B agree, but A doesn't — pension/ATP might be wrong
      bruttoFinal = bruttoAi;
      bruttoSource = "ai";
      confidence = "medium";
      fixes.push(
        `Pension eller ATP afviger fra forventet. Tjek venligst.`
      );
    } else {
      // None agree — use balance-derived (netto is most trusted)
      bruttoFinal = bruttoBalanceDerived;
      bruttoSource = "balance_derived";
      confidence = "low";
      fixes.push(
        `Bruttoløn beregnet fra netto + fradrag (${bruttoBalanceDerived.toLocaleString("da-DK")} kr). AI's tal (${bruttoAi.toLocaleString("da-DK")}) stemte ikke overens.`
      );
    }
  } else if (hasA && !hasB) {
    // Only Method A available (no trusted netto)
    if (!near(bruttoAi, bruttoAmDerived, BRUTTO_TOLERANCE)) {
      bruttoFinal = bruttoAmDerived;
      bruttoSource = "am_derived";
      confidence = "medium";
      fixes.push(
        `Bruttoløn rettet fra AM-bidrag: ${bruttoAi.toLocaleString("da-DK")} → ${bruttoAmDerived.toLocaleString("da-DK")} kr.`
      );
    }
  } else if (hasB && !hasA) {
    // Only Method B available (no AM-bidrag)
    if (!near(bruttoAi, bruttoBalanceDerived, BRUTTO_TOLERANCE)) {
      bruttoFinal = bruttoBalanceDerived;
      bruttoSource = "balance_derived";
      confidence = "medium";
      fixes.push(
        `Bruttoløn beregnet fra netto + fradrag: ${bruttoBalanceDerived.toLocaleString("da-DK")} kr.`
      );
    }
  }
  // else: neither A nor B available — trust AI (no basis for correction)

  p.bruttolon = bruttoFinal;

  // ── Step 6: Validate AM-bidrag against final brutto ──
  // Skip for atypical months — one-time payments may have different AM treatment
  let amBidragCheck: ReconciliationDiagnostics["amBidragCheck"] = "pass";
  if (!isAtypical) {
    const expectedAmGrundlag = bruttoFinal - p.pensionEmployee - p.atp;
    const expectedAm = Math.round(expectedAmGrundlag * 0.08);

    if (p.amBidrag > 0 && !near(p.amBidrag, expectedAm, AM_TOLERANCE)) {
      const oldAm = p.amBidrag;
      p.amBidrag = expectedAm;
      amBidragCheck = "fixed";
      fixes.push(
        `AM-bidrag rettet: ${oldAm.toLocaleString("da-DK")} → ${expectedAm.toLocaleString("da-DK")} kr (8% af ${expectedAmGrundlag.toLocaleString("da-DK")}).`
      );
      if (confidence === "high") confidence = "medium";
    }
  }

  // ── Step 7: Soft-check A-skat ──
  let askatCheck: ReconciliationDiagnostics["askatCheck"] = "pass";
  if (p.aSkat > 0 && p.traekkort > 0) {
    const personfradrag = p.personfradrag > 0 ? p.personfradrag : Math.round(54_100 / 12);
    const amGrundlag = bruttoFinal - p.pensionEmployee - p.atp;
    const taxBase = Math.max(0, amGrundlag - p.amBidrag - personfradrag);
    const expectedAskat = Math.round(taxBase * p.traekkort / 100);

    if (expectedAskat > 0 && Math.abs(p.aSkat - expectedAskat) / expectedAskat > ASKAT_WARN_PCT) {
      askatCheck = "warn";
      // Don't auto-fix — A-skat has too many variables (kirkeskat, topskat, etc.)
      // But do warn if it seems like an accumulated value
      if (p.aSkat > bruttoFinal * 0.5) {
        const oldAskat = p.aSkat;
        p.aSkat = expectedAskat;
        fixes.push(
          `A-skat rettet: ${oldAskat.toLocaleString("da-DK")} → ${expectedAskat.toLocaleString("da-DK")} kr (virkede akkumuleret).`
        );
        confidence = "low";
      }
    }
  }

  // ── Step 8: Final balance check ──
  const computedNetto = bruttoFinal - totalDeductions(p);
  const balanceError = nettoTrusted ? computedNetto - p.nettolon : 0;

  if (nettoTrusted && Math.abs(balanceError) > BALANCE_TOLERANCE) {
    // Balance doesn't work out — likely a missing or extra deduction
    if (confidence === "high") confidence = "medium";
  }

  // ── Step 9: Fix netto if clearly wrong ──
  if (p.nettolon <= 0 || p.nettolon > bruttoFinal) {
    const oldNetto = p.nettolon;
    if (allDed > 0) {
      p.nettolon = Math.max(0, bruttoFinal - totalDeductions(p));
      fixes.push(
        `Nettoløn beregnet fra brutto minus fradrag: ${p.nettolon.toLocaleString("da-DK")} kr.`
      );
    } else {
      p.nettolon = Math.round(bruttoFinal * 0.63);
      fixes.push(
        `Nettoløn estimeret til 63% af brutto (${p.nettolon.toLocaleString("da-DK")} kr). Ret venligst.`
      );
    }
    if (oldNetto !== p.nettolon) confidence = "low";
  }

  // ── Any fix caps confidence at medium ──
  if (fixes.length > 0 && confidence === "high") {
    confidence = "medium";
  }

  // ── Merge fixes into existing warnings ──
  p.warnings = [...fixes, ...p.warnings.filter(w => !fixes.some(f => f === w))];
  p.confidence = confidence;

  return {
    payslip: p,
    confidence,
    diagnostics: {
      bruttoSource,
      bruttoAi,
      bruttoAmDerived: bruttoAmDerived || bruttoAi,
      bruttoBalanceDerived: bruttoBalanceDerived || bruttoAi,
      balanceError: Math.round(balanceError),
      amBidragCheck,
      askatCheck,
      isAtypicalMonth: isAtypical,
      estimatedNormalBrutto,
      fixes,
    },
  };
}

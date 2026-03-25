import { describe, it, expect } from "vitest";
import { parsePayslipResponse } from "./payslipTypes";

describe("payslip sanity fixes", () => {
  // This test reproduces the exact broken output from production
  const makeBrokenInput = () => ({
    bruttolon: 2651,
    nettolon: 262,
    grundlon: 2000,
    payComponents: [
      { name: "Gage", amount: 2000 },
      { name: "Unplanned OT Fee", amount: 231 },
      { name: "Unplanned OT Fee", amount: 116 }, // dup from other column
      { name: "OT Weekday 1-2h", amount: 45 },
      { name: "OT Weekday 1-2h", amount: 45 }, // dup
      { name: "OT Weekday 3-4h", amount: 72 },
      { name: "OT Weekday 3-4h", amount: 72 }, // dup
      { name: "Tilkald", amount: 214 },
    ],
    amBidrag: 0,
    aSkat: 0,
    atp: 99,
    pensionEmployee: 0,
    pensionEmployer: 46608, // ACCUMULATED — should be ~12% of brutto
    traekkort: 0,
    personfradrag: 0,
    otherDeductions: [
      { name: "Regulering Gage", amount: 42 },
      { name: "Verdi af fri telefon", amount: 292 },
      { name: "Helbredsforsikring CBA", amount: 84 },
      { name: "Fritvalgspulje pens.ber.", amount: 21 },
      { name: "Fritvalgspulje pens.ber.", amount: 240 }, // dup
      { name: "Udbetal Fritvalgssaldo", amount: 21 },
      { name: "Udbetal Fritvalgssaldo", amount: 240 }, // dup
      { name: "Fritvalg til hensaet.(bel)", amount: 21 },
      { name: "Fritvalg til hensaet.(bel)", amount: 240 }, // dup
      { name: "Fritvalg til hensaet.(bel)", amount: 3674 }, // ACCUMULATED
    ],
    receiptLines: [],
    anonDescription: "Medarbejder",
    confidence: "low" as const,
    warnings: [],
  });

  it("fixes accumulated pensionEmployer", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    expect(result).not.toBeNull();
    // 46608 was clearly accumulated, should be capped to ~12% of brutto
    expect(result.pensionEmployer).toBeLessThan(2651);
    expect(result.pensionEmployer).toBe(Math.round(2651 * 0.12)); // 318
  });

  it("deduplicates payComponents (keeps smallest per name)", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    // Was 8 entries with duplicates, should be 5 unique names
    expect(result.payComponents.length).toBe(5);
    const otFee = result.payComponents.find((pc) => pc.name === "Unplanned OT Fee");
    expect(otFee).toBeDefined();
    expect(otFee!.amount).toBe(116); // smallest of 231/116
  });

  it("deduplicates otherDeductions (keeps smallest per name)", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    const names = result.otherDeductions.map((od) => od.name);
    const uniqueNames = new Set(names.map((n) => n.toLowerCase().trim()));
    expect(uniqueNames.size).toBe(names.length); // no duplicates

    // "Fritvalg til hensaet.(bel)" had 21, 240, 3674 — 3674 > brutto so removed, keep 21
    const fritvalg = result.otherDeductions.find((od) =>
      od.name.toLowerCase().includes("fritvalg til hensaet"),
    );
    expect(fritvalg).toBeDefined();
    expect(fritvalg!.amount).toBe(21);
  });

  it("removes otherDeductions with amount > bruttolon", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    for (const od of result.otherDeductions) {
      expect(od.amount).toBeLessThanOrEqual(result.bruttolon);
    }
  });

  // NOTE: Netto estimation is now handled by payslipReconciler.ts client-side.
  // Parser passes through the raw AI value.
  it("passes through nettolon as-is (reconciler handles fixes)", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    expect(result.nettolon).toBe(262); // raw AI value, reconciler fixes it
  });

  it("sets confidence to low when corrections were made", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    expect(result.confidence).toBe("low");
  });

  it("adds warnings about corrections", () => {
    const result = parsePayslipResponse(makeBrokenInput())!;
    expect(result.warnings.length).toBeGreaterThan(0);
    const hasPensionWarning = result.warnings.some((w) =>
      w.toLowerCase().includes("pension") || w.toLowerCase().includes("akkumuleret"),
    );
    expect(hasPensionWarning).toBe(true);
  });

  it("leaves valid payslips unchanged", () => {
    const validPayslip = {
      bruttolon: 35000,
      nettolon: 22000,
      amBidrag: 2800,
      aSkat: 8500,
      atp: 99,
      pensionEmployee: 1400,
      pensionEmployer: 2800,
      traekkort: 37,
      personfradrag: 4508,
      payComponents: [{ name: "Grundløn", amount: 35000 }],
      otherDeductions: [],
      receiptLines: [],
      anonDescription: "Kontormedarbejder",
      confidence: "high",
      warnings: [],
    };
    const result = parsePayslipResponse(validPayslip)!;
    expect(result.bruttolon).toBe(35000);
    expect(result.nettolon).toBe(22000);
    expect(result.pensionEmployer).toBe(2800);
    expect(result.confidence).toBe("high");
    expect(result.payComponents.length).toBe(1);
  });
});

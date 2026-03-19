import { describe, it, expect } from "vitest";
import { parsePayslipResponse } from "./payslipTypes";

// ── Helpers ──────────────────────────────────────────────
function validPayslip(overrides: Record<string, unknown> = {}) {
  return {
    bruttolon: 45000,
    nettolon: 28000,
    amBidrag: 3600,
    aSkat: 10500,
    atp: 99,
    pensionEmployee: 1500,
    pensionEmployer: 3000,
    traekkort: 37,
    personfradrag: 4508,
    grundlon: null,
    payComponents: [{ name: "Månedsløn", amount: 45000 }],
    otherDeductions: [],
    receiptLines: [],
    anonDescription: "Lønmodtager i privat sektor",
    confidence: "high",
    warnings: [],
    ...overrides,
  };
}

// ── Happy path ───────────────────────────────────────────
describe("parsePayslipResponse", () => {
  it("parses a valid payslip", () => {
    const result = parsePayslipResponse(validPayslip());
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(45000);
    expect(result!.nettolon).toBe(28000);
    expect(result!.amBidrag).toBe(3600);
  });

  // ── String numbers (AI returns "45000" instead of 45000) ──
  it("handles string numbers", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: "45000",
      nettolon: "28000",
      amBidrag: "3600",
    }));
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(45000);
    expect(result!.nettolon).toBe(28000);
  });

  // ── Danish formatted numbers ("45.000" = 45000) ──
  it("handles Danish dot-separated thousands", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: "45.000",
      nettolon: "28.000",
    }));
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(45000);
    expect(result!.nettolon).toBe(28000);
  });

  // ── Danish comma decimals ("45.000,50") ──
  it("handles Danish comma decimals", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: "45.000,50",
      nettolon: "28.123,75",
    }));
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(45001); // rounded
    expect(result!.nettolon).toBe(28124);
  });

  // ── Null / undefined / missing fields ──
  it("returns null if bruttolon is missing", () => {
    expect(parsePayslipResponse(validPayslip({ bruttolon: null }))).toBeNull();
  });

  it("estimates nettolon when missing", () => {
    const result = parsePayslipResponse(validPayslip({ nettolon: undefined }));
    expect(result).not.toBeNull();
    expect(result!.nettolon).toBe(Math.round(45000 * 0.63));
    expect(result!.confidence).toBe("low");
    expect(result!.warnings.some(w => w.includes("estimeret"))).toBe(true);
  });

  it("recovers when nettolon > bruttolon using deductions", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: 60000,
      nettolon: 130000, // AI read wrong field
      amBidrag: 4800,
      aSkat: 15000,
      atp: 99,
      pensionEmployee: 2000,
    }));
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(60000);
    // Should be calculated from deductions: 60000 - 4800 - 15000 - 99 - 2000
    expect(result!.nettolon).toBe(60000 - 4800 - 15000 - 99 - 2000);
    expect(result!.confidence).toBe("low");
    expect(result!.warnings.some(w => w.includes("beregnet ud fra fradrag"))).toBe(true);
  });

  it("estimates nettolon when > bruttolon and no deductions available", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: 40000,
      nettolon: 120000,
      amBidrag: 0,
      aSkat: 0,
      atp: 0,
      pensionEmployee: 0,
    }));
    expect(result).not.toBeNull();
    expect(result!.nettolon).toBe(Math.round(40000 * 0.63));
    expect(result!.warnings.some(w => w.includes("estimeret"))).toBe(true);
  });

  it("returns null for non-object input", () => {
    expect(parsePayslipResponse(null)).toBeNull();
    expect(parsePayslipResponse(undefined)).toBeNull();
    expect(parsePayslipResponse("string")).toBeNull();
    expect(parsePayslipResponse(42)).toBeNull();
  });

  // ── Defaults for missing optional fields ──
  it("defaults optional deductions to undefined", () => {
    const result = parsePayslipResponse(validPayslip({
      fagforening: undefined,
      sundhedsforsikring: undefined,
    }));
    expect(result).not.toBeNull();
    expect(result!.fagforening).toBeUndefined();
    expect(result!.sundhedsforsikring).toBeUndefined();
  });

  it("handles zero values for optional fields", () => {
    const result = parsePayslipResponse(validPayslip({
      fagforening: 0,
      sundhedsforsikring: 0,
    }));
    expect(result).not.toBeNull();
    // 0 || undefined = undefined — this is the existing behavior
    expect(result!.fagforening).toBeUndefined();
  });

  // ── Confidence ──
  it("defaults invalid confidence to 'low'", () => {
    const result = parsePayslipResponse(validPayslip({ confidence: "very_high" }));
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("low");
  });

  it("accepts valid confidence values", () => {
    expect(parsePayslipResponse(validPayslip({ confidence: "high" }))!.confidence).toBe("high");
    expect(parsePayslipResponse(validPayslip({ confidence: "medium" }))!.confidence).toBe("medium");
    expect(parsePayslipResponse(validPayslip({ confidence: "low" }))!.confidence).toBe("low");
  });

  // ── Warnings ──
  it("filters non-string warnings", () => {
    const result = parsePayslipResponse(validPayslip({
      warnings: ["ok warning", 42, null, "another"],
    }));
    expect(result).not.toBeNull();
    expect(result!.warnings).toEqual(["ok warning", "another"]);
  });

  it("limits warnings to 5", () => {
    const result = parsePayslipResponse(validPayslip({
      warnings: ["a", "b", "c", "d", "e", "f", "g"],
    }));
    expect(result!.warnings).toHaveLength(5);
  });

  // ── Clamping ──
  it("rejects negative bruttolon", () => {
    expect(parsePayslipResponse(validPayslip({ bruttolon: -5000 }))).toBeNull();
  });

  it("clamps traekkort to max 100", () => {
    const result = parsePayslipResponse(validPayslip({ traekkort: 150 }));
    expect(result).not.toBeNull();
    // num() with max=100 returns fallback 0 for values > 100
    expect(result!.traekkort).toBe(0);
  });

  // ── payComponents validation ──
  it("filters invalid payComponents", () => {
    const result = parsePayslipResponse(validPayslip({
      payComponents: [
        { name: "Månedsløn", amount: 40000 },
        { name: 123, amount: 5000 },          // invalid name
        { name: "Bonus", amount: -500 },       // negative
        null,
        "garbage",
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.payComponents).toHaveLength(1);
    expect(result!.payComponents[0].name).toBe("Månedsløn");
  });

  // ── otherDeductions validation ──
  it("filters invalid otherDeductions", () => {
    const result = parsePayslipResponse(validPayslip({
      otherDeductions: [
        { name: "Fitness", amount: 200 },
        { name: "Kantineordning", amount: -50 }, // negative — filtered
        42,                                       // not object — filtered
        null,                                     // null — filtered
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.otherDeductions).toHaveLength(1);
    expect(result!.otherDeductions[0].name).toBe("Fitness");
  });

  // ── receiptLines ──
  it("handles receiptLines with missing type", () => {
    const result = parsePayslipResponse(validPayslip({
      receiptLines: [
        { label: "Løn", amount: "45.000", type: "income" },
        { label: "Fradrag", amount: "-3.600" }, // missing type
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.receiptLines).toHaveLength(2);
    expect(result!.receiptLines[1].type).toBe("info"); // defaulted
  });

  // ── anonDescription default ──
  it("defaults anonDescription to 'Lønmodtager'", () => {
    const result = parsePayslipResponse(validPayslip({ anonDescription: undefined }));
    expect(result).not.toBeNull();
    expect(result!.anonDescription).toBe("Lønmodtager");
  });

  // ── Extreme but valid values ──
  it("accepts high salary", () => {
    const result = parsePayslipResponse(validPayslip({
      bruttolon: 150000,
      nettolon: 85000,
    }));
    expect(result).not.toBeNull();
    expect(result!.bruttolon).toBe(150000);
  });

  // ── Values above max are rejected ──
  it("rejects bruttolon above 500000", () => {
    // num() returns fallback 0 for values > max, then 0 <= 0 returns null
    expect(parsePayslipResponse(validPayslip({ bruttolon: 600000 }))).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateAnnualTax,
  getKommuneSkat,
  getKirkeSkat,
  getAllKommuner,
  estimateRestskat,
  taxInputFromPayslip,
  TAX_RATES,
  type TaxInput,
} from "./danishTax";
import type { ExtractedPayslip } from "./payslipTypes";

// Helper: a standard payslip for reuse
function makePayslip(overrides: Partial<ExtractedPayslip> = {}): ExtractedPayslip {
  return {
    bruttolon: 35000,
    nettolon: 22000,
    amBidrag: 2680,
    aSkat: 7800,
    atp: 99,
    pensionEmployee: 1400,
    pensionEmployer: 2800,
    traekkort: 37,
    personfradrag: 4508,
    grundlon: null,
    payComponents: [],
    otherDeductions: [],
    receiptLines: [],
    anonDescription: "Lønmodtager",
    confidence: "high",
    warnings: [],
    ...overrides,
  };
}

describe("calculateAnnualTax", () => {
  // 35,000 kr/month, 4% employee pension (1,400), 8% employer pension (2,800), 99 ATP, no church tax
  const input: TaxInput = {
    monthlyGross: 35000,
    pensionEmployee: 1400,
    pensionEmployer: 2800,
    atp: 99,
    municipality: "København",
    churchTax: false,
  };

  const result = calculateAnnualTax(input);

  it("calculates annual gross correctly", () => {
    expect(result.annualGross).toBe(35000 * 12);
  });

  it("calculates AM-bidrag as ~8% of (brutto - pension - ATP)", () => {
    const amGrundlag = (35000 - 1400 - 99) * 12;
    const expectedAm = Math.round(amGrundlag * 0.08);
    expect(result.amBidrag).toBe(expectedAm);
  });

  it("calculates A-indkomst as AM-grundlag minus AM-bidrag", () => {
    const amGrundlag = (35000 - 1400 - 99) * 12;
    const amBidrag = Math.round(amGrundlag * 0.08);
    expect(result.aIndkomst).toBe(amGrundlag - amBidrag);
  });

  it("calculates beskæftigelsesfradrag correctly", () => {
    const amGrundlag = (35000 - 1400 - 99) * 12;
    const expected = Math.min(
      Math.round(amGrundlag * TAX_RATES.BESKAEFTIGELSESFRADRAG_RATE),
      TAX_RATES.BESKAEFTIGELSESFRADRAG_MAX,
    );
    expect(result.beskaeftigelsesfradrag).toBe(expected);
  });

  it("does not apply mellemskat or topskat for 35,000 kr/month income", () => {
    // A-indkomst ~370k should be well below 641,200 (mellemskat) and 777,900 (topskat)
    expect(result.aIndkomst).toBeLessThan(TAX_RATES.MELLEMSKAT_GRENSE);
    expect(result.mellemskat).toBe(0);
    expect(result.topskat).toBe(0);
    expect(result.toptopskat).toBe(0);
  });

  it("uses København kommune rate (23.39%)", () => {
    expect(result.kommuneskatRate).toBe(23.39);
  });

  it("has no church tax", () => {
    expect(result.kirkeskat).toBe(0);
  });

  it("produces a reasonable monthly net (between 15k and 30k for 35k brutto)", () => {
    expect(result.monthlyNet).toBeGreaterThan(15000);
    expect(result.monthlyNet).toBeLessThan(30000);
  });

  it("calculates total compensation including employer pension", () => {
    expect(result.totalCompensation).toBe(35000 * 12 + 2800 * 12);
  });

  it("calculates annual pension total", () => {
    expect(result.annualPensionTotal).toBe((1400 + 2800) * 12);
  });
});

describe("mellemskat and topskat thresholds (2026 reform)", () => {
  it("applies mellemskat but not topskat for income between thresholds", () => {
    // 60,000/month, no pension → A-indkomst ~662k, above mellemskat (641,200) but below topskat (777,900)
    const input: TaxInput = {
      monthlyGross: 60000,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 0,
      churchTax: false,
    };
    const result = calculateAnnualTax(input);
    expect(result.aIndkomst).toBeGreaterThan(TAX_RATES.MELLEMSKAT_GRENSE);
    expect(result.aIndkomst).toBeLessThan(TAX_RATES.TOPSKAT_GRENSE);
    expect(result.mellemskat).toBeGreaterThan(0);
    expect(result.topskat).toBe(0);
    expect(result.toptopskat).toBe(0);
  });

  it("applies mellemskat and topskat for high income", () => {
    // 80,000/month, no pension → A-indkomst ~883k, above topskat (777,900)
    const input: TaxInput = {
      monthlyGross: 80000,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 0,
      churchTax: false,
    };
    const result = calculateAnnualTax(input);
    expect(result.aIndkomst).toBeGreaterThan(TAX_RATES.TOPSKAT_GRENSE);
    expect(result.mellemskat).toBeGreaterThan(0);
    expect(result.topskat).toBeGreaterThan(0);
    expect(result.toptopskat).toBe(0);

    // Verify topskat is 7.5% of (A-indkomst - grænse)
    const expectedTopBase = result.aIndkomst - TAX_RATES.TOPSKAT_GRENSE;
    expect(result.topskat).toBe(Math.round(expectedTopBase * 0.075));
  });

  it("does not apply any bracket taxes for low income", () => {
    const input: TaxInput = {
      monthlyGross: 30000,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 99,
      churchTax: false,
    };
    const result = calculateAnnualTax(input);
    expect(result.aIndkomst).toBeLessThan(TAX_RATES.MELLEMSKAT_GRENSE);
    expect(result.mellemskat).toBe(0);
    expect(result.topskat).toBe(0);
    expect(result.toptopskat).toBe(0);
  });
});

describe("getKommuneSkat", () => {
  it("returns correct rate for København", () => {
    expect(getKommuneSkat("København")).toBe(0.2339);
  });

  it("returns correct rate for case-insensitive match", () => {
    expect(getKommuneSkat("københavn")).toBe(0.2339);
  });

  it("falls back to average when municipality is unknown", () => {
    expect(getKommuneSkat("Ukendt By")).toBe(TAX_RATES.KOMMUNESKAT_GNS);
  });

  it("falls back to average when municipality is undefined", () => {
    expect(getKommuneSkat()).toBe(TAX_RATES.KOMMUNESKAT_GNS);
  });
});

describe("getKirkeSkat", () => {
  it("returns correct rate for København (0.80%)", () => {
    expect(getKirkeSkat("København")).toBe(0.0080);
  });

  it("returns correct rate for Læsø (highest: 1.30%)", () => {
    expect(getKirkeSkat("Læsø")).toBe(0.0130);
  });

  it("returns correct rate for Gentofte (lowest: 0.38%)", () => {
    expect(getKirkeSkat("Gentofte")).toBe(0.0038);
  });

  it("falls back to average when municipality is unknown", () => {
    expect(getKirkeSkat("Ukendt By")).toBe(TAX_RATES.KIRKESKAT_GNS);
  });
});

describe("getAllKommuner", () => {
  it("returns all 98 municipalities", () => {
    expect(getAllKommuner()).toHaveLength(98);
  });

  it("includes expected municipalities", () => {
    const kommuner = getAllKommuner();
    expect(kommuner).toContain("København");
    expect(kommuner).toContain("Aarhus");
    expect(kommuner).toContain("Læsø");
    expect(kommuner).toContain("Ærø");
  });
});

describe("estimateRestskat", () => {
  it("returns 'ok' when trækprocent closely matches calculated rate", () => {
    const input: TaxInput = {
      monthlyGross: 35000,
      pensionEmployee: 1400,
      pensionEmployer: 2800,
      atp: 99,
      churchTax: false,
    };
    const calc = calculateAnnualTax(input);

    // Compute what the trækprocent should be
    const personfradragAnnual = TAX_RATES.PERSONFRADRAG;
    const skattepligtig = Math.max(0, calc.aIndkomst - personfradragAnnual);
    const incomeTax = calc.bundskat + calc.kommuneskat + calc.kirkeskat;
    const impliedTrakPct = skattepligtig > 0 ? Math.round((incomeTax / skattepligtig) * 100) : 0;

    const payslip = makePayslip({
      traekkort: impliedTrakPct,
      personfradrag: 0, // use default
    });

    const estimate = estimateRestskat(payslip);
    expect(estimate.status).toBe("ok");
    expect(Math.abs(estimate.difference)).toBeLessThanOrEqual(1200);
  });

  it("returns 'owes' when trækprocent is too low", () => {
    const payslip = makePayslip({ traekkort: 20 }); // unrealistically low
    const estimate = estimateRestskat(payslip);
    expect(estimate.status).toBe("owes");
    expect(estimate.difference).toBeGreaterThan(1200);
  });

  it("returns 'refund' when trækprocent is too high", () => {
    const payslip = makePayslip({ traekkort: 55 }); // unrealistically high
    const estimate = estimateRestskat(payslip);
    expect(estimate.status).toBe("refund");
    expect(estimate.difference).toBeLessThan(-1200);
  });
});

describe("taxInputFromPayslip", () => {
  it("correctly maps ExtractedPayslip fields to TaxInput", () => {
    const payslip = makePayslip({
      municipality: "Aarhus",
      personfradrag: 4508,
    });

    const taxInput = taxInputFromPayslip(payslip);

    expect(taxInput.monthlyGross).toBe(35000);
    expect(taxInput.pensionEmployee).toBe(1400);
    expect(taxInput.pensionEmployer).toBe(2800);
    expect(taxInput.atp).toBe(99);
    expect(taxInput.municipality).toBe("Aarhus");
    expect(taxInput.churchTax).toBe(false);
    expect(taxInput.personfradragOverride).toBe(4508);
  });

  it("sets personfradragOverride to undefined when personfradrag is 0", () => {
    const payslip = makePayslip({ personfradrag: 0 });
    const taxInput = taxInputFromPayslip(payslip);
    expect(taxInput.personfradragOverride).toBeUndefined();
  });
});

describe("edge cases", () => {
  it("handles zero income without crashing", () => {
    const input: TaxInput = {
      monthlyGross: 0,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 0,
      churchTax: false,
    };
    const result = calculateAnnualTax(input);
    expect(result.annualGross).toBe(0);
    expect(result.amBidrag).toBe(0);
    expect(result.monthlyNet).toBe(0);
    expect(result.bundskat).toBe(0);
    expect(result.kommuneskat).toBe(0);
  });

  it("applies top-topskat for very high income (> 2,592,700 kr/year)", () => {
    // 250,000/month → ~2.76M A-indkomst, above top-topskat threshold
    const input: TaxInput = {
      monthlyGross: 250000,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 0,
      churchTax: false,
    };
    const result = calculateAnnualTax(input);
    expect(result.aIndkomst).toBeGreaterThan(TAX_RATES.TOPTOPSKAT_GRENSE);
    expect(result.mellemskat).toBeGreaterThan(0);
    expect(result.topskat).toBeGreaterThan(0);
    expect(result.toptopskat).toBeGreaterThan(0);

    // Verify top-topskat is 5% of (A-indkomst - grænse)
    const expectedBase = result.aIndkomst - TAX_RATES.TOPTOPSKAT_GRENSE;
    expect(result.toptopskat).toBe(Math.round(expectedBase * 0.05));
  });

  it("applies church tax when enabled", () => {
    const input: TaxInput = {
      monthlyGross: 35000,
      pensionEmployee: 1400,
      pensionEmployer: 2800,
      atp: 99,
      municipality: "København",
      churchTax: true,
    };
    const result = calculateAnnualTax(input);
    expect(result.kirkeskat).toBeGreaterThan(0);
    // Church tax for København is 0.80%, verify it's applied
    const expectedKirke = getKirkeSkat("København");
    expect(expectedKirke).toBe(0.0080);
    // Church tax reduces net income
    const noChurch = calculateAnnualTax({ ...input, churchTax: false });
    expect(result.monthlyNet).toBeLessThan(noChurch.monthlyNet);
  });

  it("handles high pension reducing taxable income", () => {
    const highPension: TaxInput = {
      monthlyGross: 50000,
      pensionEmployee: 10000, // 20% employee pension
      pensionEmployer: 5000,
      atp: 99,
      churchTax: false,
    };
    const noPension: TaxInput = {
      monthlyGross: 50000,
      pensionEmployee: 0,
      pensionEmployer: 0,
      atp: 99,
      churchTax: false,
    };
    const withPension = calculateAnnualTax(highPension);
    const without = calculateAnnualTax(noPension);
    // High pension should reduce AM-grundlag and thus AM-bidrag
    expect(withPension.amBidrag).toBeLessThan(without.amBidrag);
    // And reduce total tax
    expect(withPension.totalSkat).toBeLessThan(without.totalSkat);
  });

  it("calculates correctly for multiple municipalities", () => {
    const municipalities = ["Aarhus", "Odense", "Aalborg", "Frederiksberg", "Gentofte"];
    for (const muni of municipalities) {
      const input: TaxInput = {
        monthlyGross: 40000,
        pensionEmployee: 0,
        pensionEmployer: 0,
        atp: 99,
        municipality: muni,
        churchTax: false,
      };
      const result = calculateAnnualTax(input);
      expect(result.monthlyNet).toBeGreaterThan(20000);
      expect(result.monthlyNet).toBeLessThan(35000);
      expect(result.kommuneskatRate).toBeGreaterThan(20);
      expect(result.kommuneskatRate).toBeLessThan(28);
    }
  });
});

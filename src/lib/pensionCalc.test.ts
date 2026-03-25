import { describe, it, expect } from "vitest";
import {
  projectPension,
  calculateFeriepenge,
  type PensionInput,
} from "./pensionCalc";
import type { ExtractedPayslip } from "./payslipTypes";

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

describe("projectPension", () => {
  it("projects millions for age 30 with 2000+4000 monthly at 5% return", () => {
    const input: PensionInput = {
      monthlyEmployee: 2000,
      monthlyEmployer: 4000,
      currentAge: 30,
      retirementAge: 68,
      currentSavings: 0,
      expectedReturn: 0.05,
    };

    const result = projectPension(input, 22000);

    // 38 years of 6000/month at 5% should yield several million kr
    expect(result.projectedTotal).toBeGreaterThan(5_000_000);
    expect(result.projectedTotal).toBeLessThan(20_000_000);
    expect(result.yearsToRetirement).toBe(38);
    expect(result.monthlyTotal).toBe(6000);
    expect(result.monthlyPayout).toBeGreaterThan(0);
    expect(result.investmentGrowth).toBeGreaterThan(0);
  });

  it("includes investment growth that exceeds total contributions", () => {
    const input: PensionInput = {
      monthlyEmployee: 2000,
      monthlyEmployer: 4000,
      currentAge: 30,
      expectedReturn: 0.05,
    };

    const result = projectPension(input, 22000);
    // Over 38 years at 5%, compound growth should exceed contributions
    expect(result.investmentGrowth).toBeGreaterThan(result.totalContributions);
  });

  it("returns only currentSavings when age is 68 (0 years to retirement)", () => {
    const input: PensionInput = {
      monthlyEmployee: 2000,
      monthlyEmployer: 4000,
      currentAge: 68,
      retirementAge: 68,
      currentSavings: 2_000_000,
      expectedReturn: 0.05,
    };

    const result = projectPension(input, 22000);

    expect(result.yearsToRetirement).toBe(0);
    // With 0 months, projected = currentSavings + 0 contributions
    expect(result.projectedTotal).toBe(2_000_000);
    expect(result.investmentGrowth).toBe(0);
  });

  it("returns currentSavings + contributions when expectedReturn is 0", () => {
    const input: PensionInput = {
      monthlyEmployee: 1000,
      monthlyEmployer: 2000,
      currentAge: 58,
      retirementAge: 68,
      currentSavings: 500_000,
      expectedReturn: 0,
    };

    const result = projectPension(input, 20000);

    // 10 years * 12 months * 3000 = 360,000 + 500,000 = 860,000
    expect(result.projectedTotal).toBe(860_000);
    expect(result.investmentGrowth).toBe(0);
  });

  it("calculates replacement rate relative to net salary", () => {
    const input: PensionInput = {
      monthlyEmployee: 3000,
      monthlyEmployer: 6000,
      currentAge: 30,
      expectedReturn: 0.05,
    };

    const result = projectPension(input, 25000);
    // replacementRate should be a percentage
    expect(result.replacementRate).toBeGreaterThan(0);
    expect(result.replacementRate).toBeLessThan(500);
  });

  it("sets health to red when replacement rate is below 50%", () => {
    const input: PensionInput = {
      monthlyEmployee: 200,
      monthlyEmployer: 400,
      currentAge: 55,
      expectedReturn: 0.02,
    };

    const result = projectPension(input, 30000);
    expect(result.replacementRate).toBeLessThan(50);
    expect(result.health).toBe("red");
  });

  it("defaults retirementAge to 68 and expectedReturn to 5%", () => {
    const input: PensionInput = {
      monthlyEmployee: 2000,
      monthlyEmployer: 4000,
      currentAge: 30,
    };

    const result = projectPension(input, 22000);
    expect(result.yearsToRetirement).toBe(38);
    // Should match a 5% return projection
    const explicitInput: PensionInput = {
      ...input,
      retirementAge: 68,
      expectedReturn: 0.05,
    };
    const explicitResult = projectPension(explicitInput, 22000);
    expect(result.projectedTotal).toBe(explicitResult.projectedTotal);
  });
});

describe("calculateFeriepenge", () => {
  it("uses feriepengeHensaet from payslip when available", () => {
    const payslip = makePayslip({ feriepengeHensaet: 4500 });
    const result = calculateFeriepenge(payslip);

    expect(result.monthlyAccrual).toBe(4500);
    expect(result.annualTotal).toBe(4500 * 12);
  });

  it("calculates 12.5% of brutto when feriepengeHensaet is not set", () => {
    const payslip = makePayslip({ feriepengeHensaet: undefined });
    const result = calculateFeriepenge(payslip);

    expect(result.monthlyAccrual).toBe(Math.round(35000 * 0.125));
    expect(result.annualTotal).toBe(Math.round(35000 * 0.125) * 12);
  });

  it("calculates 12.5% of brutto when feriepengeHensaet is 0", () => {
    const payslip = makePayslip({ feriepengeHensaet: 0 });
    const result = calculateFeriepenge(payslip);

    expect(result.monthlyAccrual).toBe(Math.round(35000 * 0.125));
  });

  it("calculates krPerDay as annualTotal / 25", () => {
    const payslip = makePayslip({ feriepengeHensaet: 4000 });
    const result = calculateFeriepenge(payslip);

    expect(result.krPerDay).toBe(Math.round((4000 * 12) / 25));
    expect(result.totalDays).toBe(25);
  });

  it("reports 2.08 days accrued per month", () => {
    const payslip = makePayslip();
    const result = calculateFeriepenge(payslip);
    expect(result.daysPerMonth).toBe(2.08);
  });
});

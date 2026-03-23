import { describe, it, expect } from "vitest";
import { computeBudget, calcEjendomsvaerdiskat } from "./budgetCalculator";
import type { BudgetProfile } from "./types";

/** Minimal profile with sensible defaults — override as needed */
function makeProfile(overrides: Partial<BudgetProfile> = {}): BudgetProfile {
  return {
    householdType: "solo",
    income: 35000,
    partnerIncome: 0,
    additionalIncome: [],
    postalCode: "8000",
    housingType: "lejer",
    hasMortgage: false,
    rentAmount: 8000,
    mortgageAmount: 0,
    propertyValue: 0,
    interestRate: 0,
    hasChildren: false,
    childrenAges: [],
    hasNetflix: false,
    hasSpotify: false,
    hasHBO: false,
    hasViaplay: false,
    hasAppleTV: false,
    hasDisney: false,
    hasAmazonPrime: false,
    hasCar: false,
    carAmount: 0,
    carLoan: 0,
    carFuel: 0,
    carInsurance: 0,
    carTax: 0,
    carService: 0,
    hasInternet: true,
    hasInsurance: false,
    insuranceAmount: 0,
    hasUnion: false,
    unionAmount: 0,
    hasFitness: false,
    fitnessAmount: 0,
    hasPet: false,
    petAmount: 0,
    hasLoan: false,
    loanAmount: 0,
    hasSavings: false,
    savingsAmount: 0,
    foodAmount: 4500,
    leisureAmount: 1500,
    clothingAmount: 500,
    healthAmount: 350,
    restaurantAmount: 800,
    customExpenses: [],
    ...overrides,
  };
}

// ── Basic budget computation ──────────────────────────────
describe("computeBudget — basic", () => {
  it("computes correct totalIncome for solo with no extras", () => {
    const budget = computeBudget(makeProfile({ income: 35000 }));
    expect(budget.totalIncome).toBe(35000);
  });

  it("totalExpenses equals sum of all expense items", () => {
    const budget = computeBudget(makeProfile());
    const sumFixed = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const sumVar = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);
    expect(budget.totalExpenses).toBe(sumFixed + sumVar);
  });

  it("disposableIncome = totalIncome - totalExpenses", () => {
    const budget = computeBudget(makeProfile());
    expect(budget.disposableIncome).toBe(budget.totalIncome - budget.totalExpenses);
  });

  it("includes 5 variable expense categories", () => {
    const budget = computeBudget(makeProfile());
    expect(budget.variableExpenses).toHaveLength(5);
  });
});

// ── Housing types ─────────────────────────────────────────
describe("computeBudget — housing types", () => {
  it("renter: adds Husleje expense", () => {
    const budget = computeBudget(makeProfile({ housingType: "lejer", rentAmount: 9000 }));
    const husleje = budget.fixedExpenses.find(e => e.label === "Husleje");
    expect(husleje).toBeDefined();
    expect(husleje!.amount).toBe(9000);
  });

  it("owner with mortgage: adds Boliglån expense", () => {
    const budget = computeBudget(makeProfile({
      housingType: "ejer",
      mortgageAmount: 12000,
      propertyValue: 3000000,
    }));
    const loan = budget.fixedExpenses.find(e => e.label === "Boliglån");
    expect(loan).toBeDefined();
    expect(loan!.amount).toBe(12000);
  });

  it("owner without mortgage: no Boliglån expense", () => {
    const budget = computeBudget(makeProfile({
      housingType: "ejer",
      mortgageAmount: 0,
      propertyValue: 3000000,
    }));
    const loan = budget.fixedExpenses.find(e => e.label === "Boliglån");
    expect(loan).toBeUndefined();
  });

  it("owner gets ejendomsværdiskat and grundejerforening", () => {
    const budget = computeBudget(makeProfile({
      housingType: "ejer",
      mortgageAmount: 10000,
      propertyValue: 3000000,
    }));
    const propTax = budget.fixedExpenses.find(e => e.label === "Ejendomsværdiskat");
    const grundejer = budget.fixedExpenses.find(e => e.label.includes("Grundejerforening"));
    expect(propTax).toBeDefined();
    expect(propTax!.amount).toBeGreaterThan(0);
    expect(grundejer).toBeDefined();
  });

  it("andel: adds both boligafgift and andelslån when set", () => {
    const budget = computeBudget(makeProfile({
      housingType: "andel",
      rentAmount: 5000,
      mortgageAmount: 3000,
    }));
    const afgift = budget.fixedExpenses.find(e => e.label.includes("Boligafgift"));
    const loan = budget.fixedExpenses.find(e => e.label === "Andelslån");
    expect(afgift).toBeDefined();
    expect(afgift!.amount).toBe(5000);
    expect(loan).toBeDefined();
    expect(loan!.amount).toBe(3000);
  });
});

// ── Child benefits ────────────────────────────────────────
describe("computeBudget — children", () => {
  it("adds child benefit for 1 child (age 1)", () => {
    const profile = makeProfile({ hasChildren: true, childrenAges: [1] });
    const budget = computeBudget(profile);
    // Child benefit for age 0-2 is 1532 kr/month
    expect(budget.totalIncome).toBe(35000 + 1532);
  });

  it("adds child benefits for 2 children (ages 4 and 10)", () => {
    const profile = makeProfile({ hasChildren: true, childrenAges: [4, 10] });
    const budget = computeBudget(profile);
    // age 3-6: 1212, age 7-14: 954
    expect(budget.totalIncome).toBe(35000 + 1212 + 954);
  });

  it("adds childcare expenses for young children", () => {
    const profile = makeProfile({ hasChildren: true, childrenAges: [1, 4] });
    const budget = computeBudget(profile);
    const childExpenses = budget.fixedExpenses.filter(e => e.category === "Børn");
    expect(childExpenses.length).toBe(2);
    // Vuggestue (0-2) = 4500, Børnehave (3-5) = 2600
    expect(childExpenses[0].amount).toBe(4500);
    expect(childExpenses[1].amount).toBe(2600);
  });
});

// ── Car expenses ──────────────────────────────────────────
describe("computeBudget — transport", () => {
  it("without car: includes public transport", () => {
    const budget = computeBudget(makeProfile({ hasCar: false }));
    const transport = budget.fixedExpenses.find(e => e.label === "Offentlig transport");
    expect(transport).toBeDefined();
    expect(transport!.amount).toBe(600);
  });

  it("with car: includes fuel, insurance, tax as monthly amounts", () => {
    const budget = computeBudget(makeProfile({
      hasCar: true,
      carLoan: 3000,
      carFuel: 1500,
      carInsurance: 12000, // annual
      carTax: 6000,        // annual
      carService: 3000,    // biannual
    }));
    const labels = budget.fixedExpenses.filter(e => e.category === "Transport").map(e => e.label);
    expect(labels).toContain("Billån / leasing");
    expect(labels).toContain("Benzin / opladning");
    expect(labels.some(l => l.includes("Bilforsikring"))).toBe(true);
    expect(labels.some(l => l.includes("Vægtafgift"))).toBe(true);
    expect(labels.some(l => l.includes("Bilservice"))).toBe(true);

    // Insurance: 12000/12 = 1000, Tax: 6000/12 = 500, Service: 3000/6 = 500
    const insurance = budget.fixedExpenses.find(e => e.label.includes("Bilforsikring"));
    expect(insurance!.amount).toBe(1000);
    const tax = budget.fixedExpenses.find(e => e.label.includes("Vægtafgift"));
    expect(tax!.amount).toBe(500);
    const service = budget.fixedExpenses.find(e => e.label.includes("Bilservice"));
    expect(service!.amount).toBe(500);
  });
});

// ── Subscriptions ─────────────────────────────────────────
describe("computeBudget — subscriptions", () => {
  it("adds selected streaming subscriptions with correct prices", () => {
    const budget = computeBudget(makeProfile({
      hasNetflix: true,
      hasHBO: true,
      hasDisney: true,
    }));
    const subs = budget.fixedExpenses.filter(e => e.category === "Abonnementer");
    expect(subs).toHaveLength(3);
    const netflixItem = subs.find(e => e.label === "Netflix");
    expect(netflixItem!.amount).toBe(139);
    const hboItem = subs.find(e => e.label === "HBO Max");
    expect(hboItem!.amount).toBe(99);
    const disneyItem = subs.find(e => e.label === "Disney+");
    expect(disneyItem!.amount).toBe(89);
  });

  it("no subscriptions means no subscription expenses", () => {
    const budget = computeBudget(makeProfile());
    const subs = budget.fixedExpenses.filter(e => e.category === "Abonnementer");
    expect(subs).toHaveLength(0);
  });
});

// ── Edge cases ────────────────────────────────────────────
describe("computeBudget — edge cases", () => {
  it("zero income yields negative disposable", () => {
    const budget = computeBudget(makeProfile({ income: 0 }));
    expect(budget.totalIncome).toBe(0);
    expect(budget.disposableIncome).toBeLessThan(0);
  });

  it("very high income produces large disposable", () => {
    const budget = computeBudget(makeProfile({ income: 150000 }));
    expect(budget.disposableIncome).toBeGreaterThan(100000);
  });

  it("par household adds partner income", () => {
    const budget = computeBudget(makeProfile({
      householdType: "par",
      income: 30000,
      partnerIncome: 25000,
    }));
    expect(budget.totalIncome).toBe(55000);
  });
});

// ── Ejendomsværdiskat helper ──────────────────────────────
describe("calcEjendomsvaerdiskat", () => {
  it("returns fallback 800 for zero property value", () => {
    expect(calcEjendomsvaerdiskat(0)).toBe(800);
  });

  it("calculates correctly below threshold", () => {
    // 3M * 0.0051 = 15300 / 12 = 1275
    expect(calcEjendomsvaerdiskat(3000000)).toBe(1275);
  });

  it("calculates correctly above threshold", () => {
    // 9.2M * 0.0051 = 46920 + (10M - 9.2M) * 0.014 = 11200 → 58120 / 12 ≈ 4843
    expect(calcEjendomsvaerdiskat(10000000)).toBe(4843);
  });
});

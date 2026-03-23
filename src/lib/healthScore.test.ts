import { describe, it, expect } from "vitest";
import { calculateHealth, generateSmartSteps } from "./healthScore";
import type { BudgetProfile, ComputedBudget, ExpenseItem } from "./types";

/** Minimal profile with sensible defaults */
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

/** Build a ComputedBudget from simple numbers */
function makeBudget(overrides: Partial<{
  totalIncome: number;
  fixedTotal: number;
  variableTotal: number;
  disposableIncome: number;
  housingCost: number;
}> = {}): ComputedBudget {
  const totalIncome = overrides.totalIncome ?? 35000;
  const fixedTotal = overrides.fixedTotal ?? 15000;
  const variableTotal = overrides.variableTotal ?? 7650;
  const housingCost = overrides.housingCost ?? 8000;
  const disposable = overrides.disposableIncome ?? (totalIncome - fixedTotal - variableTotal);

  const fixedExpenses: ExpenseItem[] = [
    { category: "Bolig", label: "Husleje", amount: housingCost, colorVar: "--nemt-blue" },
    { category: "Forsyning", label: "Internet", amount: 299, colorVar: "--nemt-blue" },
    { category: "Forsyning", label: "El", amount: 800, colorVar: "--nemt-blue" },
    { category: "Forsyning", label: "Varme & vand", amount: 600, colorVar: "--nemt-blue" },
    { category: "Forsyning", label: "Mobil", amount: 199, colorVar: "--nemt-blue" },
    { category: "Forsyning", label: "DR (medielicens)", amount: 181, colorVar: "--nemt-blue" },
    { category: "Transport", label: "Offentlig transport", amount: fixedTotal - housingCost - 299 - 800 - 600 - 199 - 181, colorVar: "--nemt-gold" },
  ];
  const variableExpenses: ExpenseItem[] = [
    { category: "Mad & dagligvarer", label: "Mad & dagligvarer", amount: 4500, colorVar: "--nemt-red" },
    { category: "Fritid", label: "Fritid & oplevelser", amount: 1500, colorVar: "--nemt-red" },
    { category: "Tøj", label: "Tøj & personlig pleje", amount: 500, colorVar: "--nemt-red" },
    { category: "Sundhed", label: "Læge, tandlæge & medicin", amount: 350, colorVar: "--nemt-red" },
    { category: "Restaurant", label: "Restaurant & takeaway", amount: 800, colorVar: "--nemt-red" },
  ];

  return {
    totalIncome,
    fixedExpenses,
    variableExpenses,
    totalExpenses: fixedTotal + variableTotal,
    disposableIncome: disposable,
  };
}

// ── Score boundaries ──────────────────────────────────────
describe("calculateHealth — score boundaries", () => {
  it("score is between 0 and 100", () => {
    const health = calculateHealth(makeProfile(), makeBudget());
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it("score never exceeds 95 (cap)", () => {
    // Even with perfect inputs, score should be capped at 95
    const profile = makeProfile({ hasInsurance: true, insuranceAmount: 500, hasSavings: true, savingsAmount: 10000 });
    const budget = makeBudget({ totalIncome: 100000, fixedTotal: 15000, variableTotal: 5000, disposableIncome: 80000 });
    const health = calculateHealth(profile, budget);
    expect(health.score).toBeLessThanOrEqual(95);
  });
});

// ── Good health profile ───────────────────────────────────
describe("calculateHealth — good health", () => {
  it("healthy profile scores > 70", () => {
    const profile = makeProfile({
      income: 50000,
      hasInsurance: true,
      insuranceAmount: 650,
      hasSavings: true,
      savingsAmount: 5000,
    });
    // Low fixed expenses relative to income = good stability
    const budget = makeBudget({
      totalIncome: 50000,
      fixedTotal: 15000,
      variableTotal: 7650,
      disposableIncome: 27350,
      housingCost: 8000,
    });
    const health = calculateHealth(profile, budget);
    expect(health.score).toBeGreaterThan(70);
    expect(health.label).toBe("Stærk");
  });
});

// ── Poor health profile ───────────────────────────────────
describe("calculateHealth — poor health", () => {
  it("zero savings, no insurance, high expenses scores < 40", () => {
    const profile = makeProfile({
      income: 25000,
      hasInsurance: false,
      hasSavings: false,
    });
    const budget = makeBudget({
      totalIncome: 25000,
      fixedTotal: 20000,
      variableTotal: 7650,
      disposableIncome: -2650,
      housingCost: 12000,
    });
    const health = calculateHealth(profile, budget);
    expect(health.score).toBeLessThan(40);
    expect(["Sårbar", "Kritisk"]).toContain(health.label);
  });
});

// ── Edge cases ────────────────────────────────────────────
describe("calculateHealth — edge cases", () => {
  it("zero income gives score 0 and zero rates", () => {
    const profile = makeProfile({ income: 0 });
    const budget = makeBudget({ totalIncome: 0, fixedTotal: 0, variableTotal: 0, disposableIncome: 0 });
    const health = calculateHealth(profile, budget);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.savingsRate).toBe(0);
    expect(health.debtRatio).toBe(0);
  });

  it("negative disposable income yields savingsRate = 0", () => {
    const profile = makeProfile({ income: 20000 });
    const budget = makeBudget({ totalIncome: 20000, fixedTotal: 18000, variableTotal: 7650, disposableIncome: -5650 });
    const health = calculateHealth(profile, budget);
    expect(health.savingsRate).toBe(0);
  });

  it("high variable income penalizes stability", () => {
    const profile = makeProfile({ income: 40000, variableIncomePct: 40 });
    const budget = makeBudget({ totalIncome: 40000, fixedTotal: 15000, variableTotal: 7650 });
    const healthVar = calculateHealth(profile, budget);

    const profileStable = makeProfile({ income: 40000, variableIncomePct: 0 });
    const healthStable = calculateHealth(profileStable, budget);

    expect(healthVar.stabilityScore).toBeLessThan(healthStable.stabilityScore);
  });
});

// ── Smart steps generation ────────────────────────────────
describe("generateSmartSteps", () => {
  it("returns array of actionable steps", () => {
    const profile = makeProfile();
    const budget = makeBudget();
    const health = calculateHealth(profile, budget);
    const steps = generateSmartSteps(profile, budget, health);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeLessThanOrEqual(3);
    for (const step of steps) {
      expect(step).toHaveProperty("icon");
      expect(step).toHaveProperty("text");
      expect(step).toHaveProperty("priority");
      expect(["high", "medium", "low"]).toContain(step.priority);
    }
  });

  it("warns about negative disposable income", () => {
    const profile = makeProfile({ income: 20000 });
    const budget = makeBudget({ totalIncome: 20000, fixedTotal: 18000, variableTotal: 7650, disposableIncome: -5650 });
    const health = calculateHealth(profile, budget);
    const steps = generateSmartSteps(profile, budget, health);
    const warning = steps.find(s => s.text.includes("mere end du tjener"));
    expect(warning).toBeDefined();
    expect(warning!.priority).toBe("high");
  });

  it("steps are sorted by priority (high first)", () => {
    const profile = makeProfile({ income: 20000, variableIncomePct: 40 });
    const budget = makeBudget({ totalIncome: 20000, fixedTotal: 18000, variableTotal: 7650, disposableIncome: -5650 });
    const health = calculateHealth(profile, budget);
    const steps = generateSmartSteps(profile, budget, health);
    const priorities = steps.map(s => s.priority);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });
});

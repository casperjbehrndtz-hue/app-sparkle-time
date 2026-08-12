import type { BudgetProfile } from "./types";

const PARFINANS_BASE = "https://parfinans.dk";

/**
 * Subset of ParFinans CoupleInput we can derive from a NemtBudget BudgetProfile.
 * Annual net incomes (since NemtBudget stores monthly net), housing fields,
 * children ages, and a rough sharedExpenses estimate.
 */
interface ParFinansHandoffPayload {
  person1AnnualNet: number;
  person2AnnualNet: number;
  housingType: "renter" | "owner" | "coop";
  propertyValue: number;
  interestRate: number;
  hasMortgage: boolean;
  childrenAges: number[];
  sharedExpensesMonthly: number;
  source: "nemtbudget";
  v: 1;
}

function mapHousingType(t: BudgetProfile["housingType"]): ParFinansHandoffPayload["housingType"] {
  if (t === "ejer") return "owner";
  if (t === "andel") return "coop";
  return "renter";
}

function estimateSharedExpenses(p: BudgetProfile): number {
  let total = 0;
  // Housing
  if (p.housingType === "lejer") total += p.rentAmount || 0;
  else if (p.hasMortgage) total += p.mortgageAmount || 0;
  // Core household
  total += p.foodAmount || 0;
  total += p.leisureAmount || 0;
  total += p.clothingAmount || 0;
  total += p.healthAmount || 0;
  total += p.restaurantAmount || 0;
  // Utilities
  total += p.electricityAmount || 0;
  total += p.heatingAmount || 0;
  total += p.internetAmount || 0;
  total += p.drAmount || 0;
  // Car (if any)
  if (p.hasCar) {
    total += (p.carAmount || 0);
  }
  // Insurance + union
  if (p.hasInsurance) total += p.insuranceAmount || 0;
  return Math.round(total);
}

function encodePayload(payload: ParFinansHandoffPayload): string {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Build the cross-domain handoff URL to ParFinans `/beregner` with NemtBudget data prefilled.
 */
export function buildParFinansHandoffUrl(profile: BudgetProfile): string {
  const payload: ParFinansHandoffPayload = {
    person1AnnualNet: Math.max(0, Math.round((profile.income || 0) * 12)),
    person2AnnualNet: Math.max(0, Math.round((profile.partnerIncome || 0) * 12)),
    housingType: mapHousingType(profile.housingType),
    propertyValue: Math.max(0, Math.round(profile.propertyValue || 0)),
    interestRate: profile.interestRate || 4,
    hasMortgage: !!profile.hasMortgage,
    childrenAges: Array.isArray(profile.childrenAges) ? profile.childrenAges.filter((n) => typeof n === "number") : [],
    sharedExpensesMonthly: estimateSharedExpenses(profile),
    source: "nemtbudget",
    v: 1,
  };
  return `${PARFINANS_BASE}/beregner?prefill_nemtbudget=${encodePayload(payload)}`;
}

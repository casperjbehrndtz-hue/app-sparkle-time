import { z } from "zod";
import type { BudgetProfile } from "./types";

/**
 * Zod schema for validating BudgetProfile from localStorage.
 * Prevents crashes from corrupted or outdated stored data.
 */
export const budgetProfileSchema = z.object({
  householdType: z.enum(["solo", "par"]),
  income: z.number().min(0).max(500000).default(30000),
  partnerIncome: z.number().min(0).max(500000).default(0),
  additionalIncome: z.array(z.object({
    label: z.string().max(50),
    amount: z.number().min(0).max(500000),
    frequency: z.enum(["monthly", "quarterly", "biannual", "annual"]),
  })).max(20).default([]),
  postalCode: z.string().max(4).default(""),
  housingType: z.enum(["lejer", "ejer", "andel"]),
  hasMortgage: z.boolean().default(false),
  rentAmount: z.number().min(0).default(0),
  mortgageAmount: z.number().min(0).default(0),
  propertyValue: z.number().min(0).default(0),
  interestRate: z.number().min(0).default(4.0),
  hasChildren: z.boolean().default(false),
  childrenAges: z.array(z.number()).default([]),
  hasNetflix: z.boolean().default(false),
  hasSpotify: z.boolean().default(false),
  hasHBO: z.boolean().default(false),
  hasViaplay: z.boolean().default(false),
  hasAppleTV: z.boolean().default(false),
  hasDisney: z.boolean().default(false),
  hasAmazonPrime: z.boolean().default(false),
  hasCar: z.boolean().default(false),
  carAmount: z.number().min(0).default(0),
  carLoan: z.number().min(0).default(0),
  carFuel: z.number().min(0).default(0),
  carInsurance: z.number().min(0).default(0),
  carTax: z.number().min(0).default(0),
  carService: z.number().min(0).default(0),
  hasInternet: z.boolean().default(true),
  internetAmount: z.number().min(0).optional(),
  mobileAmount: z.number().min(0).optional(),
  electricityAmount: z.number().min(0).optional(),
  heatingAmount: z.number().min(0).optional(),
  drAmount: z.number().min(0).optional(),
  hasInsurance: z.boolean().default(false),
  insuranceAmount: z.number().min(0).default(0),
  hasUnion: z.boolean().default(false),
  unionAmount: z.number().min(0).default(0),
  hasFitness: z.boolean().default(false),
  fitnessAmount: z.number().min(0).default(0),
  hasPet: z.boolean().default(false),
  petAmount: z.number().min(0).default(0),
  hasLoan: z.boolean().default(false),
  loanAmount: z.number().min(0).default(0),
  hasSavings: z.boolean().default(false),
  savingsAmount: z.number().min(0).default(0),
  foodAmount: z.number().min(0).default(3500),
  leisureAmount: z.number().min(0).default(1500),
  clothingAmount: z.number().min(0).default(800),
  healthAmount: z.number().min(0).default(350),
  restaurantAmount: z.number().min(0).default(800),
  customExpenses: z.array(z.object({
    label: z.string().max(50),
    amount: z.number().min(0).max(100000),
    frequency: z.enum(["monthly", "quarterly", "biannual", "annual"]).default("monthly"),
  })).max(20).default([]),
});

/**
 * Safely parse a BudgetProfile from unknown data (e.g. localStorage).
 * Returns null if data is invalid.
 */
export function parseProfile(data: unknown): BudgetProfile | null {
  const result = budgetProfileSchema.safeParse(data);
  if (result.success) {
    return result.data as BudgetProfile;
  }
  console.warn("[parseProfile] Invalid profile data:", result.error.issues.slice(0, 3));
  return null;
}

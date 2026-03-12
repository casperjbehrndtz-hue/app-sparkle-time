import type { BudgetProfile } from "./types";

/**
 * Realistic demo profile: A Danish couple living in 2100 Copenhagen (Oesterbro).
 * Two incomes, two children (ages 4 and 8), homeowner with mortgage.
 */
export const demoProfile: BudgetProfile = {
  householdType: "par",
  income: 45000,
  partnerIncome: 38000,
  additionalIncome: [],
  postalCode: "2100",
  housingType: "ejer",
  hasMortgage: true,
  rentAmount: 0,
  mortgageAmount: 12500,
  propertyValue: 4200000,
  interestRate: 4.5,
  hasChildren: true,
  childrenAges: [4, 8],
  // Subscriptions
  hasNetflix: true,
  hasSpotify: true,
  hasHBO: false,
  hasViaplay: true,
  hasAppleTV: false,
  hasDisney: true,
  hasAmazonPrime: false,
  // Transport
  hasCar: true,
  carAmount: 0,
  carLoan: 3200,
  carFuel: 1800,
  carInsurance: 7200,
  carTax: 5400,
  carService: 4000,
  // Utilities
  hasInternet: true,
  // Insurance, union, fitness
  hasInsurance: true,
  insuranceAmount: 1800,
  hasUnion: true,
  unionAmount: 950,
  hasFitness: true,
  fitnessAmount: 598,
  // Pets & loans
  hasPet: false,
  petAmount: 0,
  hasLoan: false,
  loanAmount: 0,
  // Savings
  hasSavings: true,
  savingsAmount: 4000,
  // Variable expenses
  foodAmount: 6500,
  leisureAmount: 2500,
  clothingAmount: 1200,
  healthAmount: 600,
  restaurantAmount: 1800,
  // Custom
  customExpenses: [],
};

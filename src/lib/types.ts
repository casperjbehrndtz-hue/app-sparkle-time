export type HouseholdType = "solo" | "par";
export type HousingType = "lejer" | "ejer" | "andel";

export interface CustomExpense {
  label: string;
  amount: number;
}

export interface BudgetProfile {
  householdType: HouseholdType;
  income: number;
  partnerIncome: number;
  postalCode: string;
  housingType: HousingType;
  hasMortgage: boolean;
  rentAmount: number; // editable rent
  mortgageAmount: number; // editable mortgage estimate
  propertyValue: number; // estimated property value for ejer
  interestRate: number; // mortgage interest rate %
  hasChildren: boolean;
  childrenAges: number[];
  // Subscriptions
  hasNetflix: boolean;
  hasSpotify: boolean;
  hasHBO: boolean;
  hasViaplay: boolean;
  hasAppleTV: boolean;
  hasDisney: boolean;
  hasAmazonPrime: boolean;
  // Transport
  hasCar: boolean;
  carAmount: number;
  // Utilities
  hasInternet: boolean;
  // Insurance, union, fitness
  hasInsurance: boolean;
  insuranceAmount: number;
  hasUnion: boolean;
  unionAmount: number;
  hasFitness: boolean;
  fitnessAmount: number;
  // Custom
  customExpenses: CustomExpense[];
}

export interface ExpenseItem {
  category: string;
  label: string;
  amount: number;
  colorVar: string;
}

export interface ComputedBudget {
  totalIncome: number;
  fixedExpenses: ExpenseItem[];
  variableExpenses: ExpenseItem[];
  totalExpenses: number;
  disposableIncome: number;
}

export interface OptimizingAction {
  rank: number;
  handling: string;
  beskrivelse: string;
  besparelse_kr: number;
  cta_tekst: string;
  cta_url: string;
  category: string;
}

export type OnboardingStep =
  | "welcome"
  | "household"
  | "income"
  | "housing"
  | "children"
  | "expenses"
  | "review";

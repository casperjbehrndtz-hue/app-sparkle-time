export type HouseholdType = "solo" | "par";
export type HousingType = "lejer" | "ejer";

export interface BudgetProfile {
  householdType: HouseholdType;
  income: number;
  partnerIncome: number;
  postalCode: string;
  housingType: HousingType;
  hasMortgage: boolean;
  hasChildren: boolean;
  childrenAges: number[];
  // Subscriptions
  hasNetflix: boolean;
  hasSpotify: boolean;
  hasHBO: boolean;
  hasViaplay: boolean;
  hasAppleTV: boolean;
  hasCar: boolean;
  hasInternet: boolean;
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
  | "partnerIncome"
  | "housing"
  | "mortgage"
  | "children"
  | "childAges"
  | "subscriptions"
  | "car"
  | "done";

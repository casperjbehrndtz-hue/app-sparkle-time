export type HouseholdType = "solo" | "par";
export type HousingType = "lejer" | "ejer" | "andel";
export type PaymentFrequency = "monthly" | "quarterly" | "biannual" | "annual";

export interface CustomExpense {
  label: string;
  amount: number;
  frequency: PaymentFrequency;
}

export interface IncomeSource {
  label: string;
  amount: number;
  frequency: PaymentFrequency;
}

export interface BudgetProfile {
  householdType: HouseholdType;
  income: number;
  partnerIncome: number;
  additionalIncome: IncomeSource[];
  postalCode: string;
  housingType: HousingType;
  hasMortgage: boolean;
  rentAmount: number;
  mortgageAmount: number;
  propertyValue: number;
  interestRate: number;
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
  // Transport (detailed)
  hasCar: boolean;
  carAmount: number; // kept for backward compat — total if not detailed
  carLoan: number;
  carFuel: number;
  carInsurance: number; // annual
  carTax: number; // annual
  carService: number; // biannual
  // Utilities (override defaults)
  hasInternet: boolean;
  internetAmount?: number;
  mobileAmount?: number;
  electricityAmount?: number;
  heatingAmount?: number;
  drAmount?: number;
  // Insurance, union, fitness
  hasInsurance: boolean;
  insuranceAmount: number;
  hasUnion: boolean;
  unionAmount: number;
  hasFitness: boolean;
  fitnessAmount: number;
  // Pets & loans
  hasPet: boolean;
  petAmount: number;
  hasLoan: boolean;
  loanAmount: number;
  // Savings
  hasSavings: boolean;
  savingsAmount: number;
  // Variable expenses (user-editable)
  foodAmount: number;
  leisureAmount: number;
  clothingAmount: number;
  healthAmount: number;
  restaurantAmount: number;
  // Custom
  customExpenses: CustomExpense[];
  // Consent
  emailReminders?: boolean;
  // Payslip-derived context (enriches dashboard when available)
  bruttolon?: number;           // gross salary — enables personal dagpenge calc
  traekkort?: number;           // tax rate % — enables precise interest deduction
  personfradrag?: number;       // personal deduction kr/md
  pensionEmployee?: number;     // employee pension contribution
  pensionEmployer?: number;     // employer pension contribution
  sundhedsforsikring?: number;  // employer-paid health insurance
  grundlon?: number;            // base salary (null = unknown)
  variableIncomePct?: number;   // % of brutto that is variable (bonus, overtime)
  anonIndustry?: string;        // e.g. "IT", "Pharma" — for benchmarks
  anonRegion?: string;          // e.g. "Storkøbenhavn" — for benchmarks
  feriepengeHensaet?: number;   // vacation pay accrual
  fritvalgKonto?: number;       // flexible benefit account
}

export function frequencyToMonthly(amount: number, freq: PaymentFrequency): number {
  switch (freq) {
    case "monthly": return amount;
    case "quarterly": return Math.round(amount / 3);
    case "biannual": return Math.round(amount / 6);
    case "annual": return Math.round(amount / 12);
  }
}

export function frequencyLabel(freq: PaymentFrequency): string {
  switch (freq) {
    case "monthly": return "md.";
    case "quarterly": return "kvartal";
    case "biannual": return "halvår";
    case "annual": return "år";
  }
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
  | "household"
  | "income"
  | "housing"
  | "children"   // kept for backward compat with saved sessions
  | "expenses"   // kept for backward compat with saved sessions
  | "everyday"
  | "fixed"
  | "review";

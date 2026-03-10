import type { BudgetProfile } from "./types";

/**
 * Maps expense labels/categories to BudgetProfile fields for inline editing.
 * Returns the field key and reasonable slider constraints.
 */
export interface FieldMapping {
  field: keyof BudgetProfile;
  min: number;
  max: number;
  step: number;
}

const LABEL_MAP: Record<string, FieldMapping> = {
  // Housing
  "Boliglån": { field: "mortgageAmount", min: 0, max: 40000, step: 250 },
  "Husleje": { field: "rentAmount", min: 0, max: 30000, step: 250 },
  "Boligafgift (andel)": { field: "rentAmount", min: 0, max: 25000, step: 250 },
  "Andelslån": { field: "mortgageAmount", min: 0, max: 30000, step: 250 },

  // Transport
  "Billån / leasing": { field: "carLoan", min: 0, max: 10000, step: 100 },
  "Benzin / opladning": { field: "carFuel", min: 0, max: 5000, step: 50 },

  // Insurance & memberships
  "Forsikringer": { field: "insuranceAmount", min: 0, max: 5000, step: 50 },
  "Fagforening & A-kasse": { field: "unionAmount", min: 0, max: 3000, step: 50 },
  "Fitness / sport": { field: "fitnessAmount", min: 0, max: 2000, step: 50 },

  // Pets & Loans
  "Kæledyr (foder, dyrlæge, forsikring)": { field: "petAmount", min: 0, max: 3000, step: 50 },
  "Lån (SU-lån, forbrugslån etc.)": { field: "loanAmount", min: 0, max: 10000, step: 100 },

  // Savings
  "Opsparing / investering": { field: "savingsAmount", min: 0, max: 20000, step: 250 },

  // Variable
  "Mad & dagligvarer": { field: "foodAmount", min: 1000, max: 15000, step: 100 },
  "Fritid & oplevelser": { field: "leisureAmount", min: 0, max: 8000, step: 100 },
  "Tøj & personlig pleje": { field: "clothingAmount", min: 0, max: 5000, step: 50 },
  "Læge, tandlæge & medicin": { field: "healthAmount", min: 0, max: 3000, step: 50 },
  "Restaurant & takeaway": { field: "restaurantAmount", min: 0, max: 5000, step: 50 },
};

// Category-level mappings (for the top-expenses waterfall which groups by category)
const CATEGORY_MAP: Record<string, FieldMapping[]> = {
  "Mad & dagligvarer": [{ field: "foodAmount", min: 1000, max: 15000, step: 100 }],
  "Fritid": [{ field: "leisureAmount", min: 0, max: 8000, step: 100 }],
  "Tøj": [{ field: "clothingAmount", min: 0, max: 5000, step: 50 }],
  "Sundhed": [{ field: "healthAmount", min: 0, max: 3000, step: 50 }],
  "Restaurant": [{ field: "restaurantAmount", min: 0, max: 5000, step: 50 }],
};

/** Get field mapping for an expense label */
export function getFieldMapping(label: string): FieldMapping | null {
  return LABEL_MAP[label] ?? null;
}

/** Get field mappings for a category (used in grouped views) */
export function getCategoryMappings(category: string): FieldMapping[] | null {
  return CATEGORY_MAP[category] ?? null;
}

/** Income field mappings */
export const INCOME_MAPPINGS = {
  income: { field: "income" as keyof BudgetProfile, min: 10000, max: 80000, step: 500 },
  partnerIncome: { field: "partnerIncome" as keyof BudgetProfile, min: 0, max: 80000, step: 500 },
};

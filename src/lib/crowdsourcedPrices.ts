import { supabase } from "@/integrations/supabase/client";
import type { BudgetProfile } from "./types";

// ─── Types ─────────────────────────────────────────────────

interface PriceAverage {
  category: string;
  postal_code: string | null;
  household_type: string;
  avg_amount: number;
  median_amount: number;
  observation_count: number;
}

interface CrowdsourcedCache {
  data: Map<string, PriceAverage>;
  fetchedAt: number;
}

let cache: CrowdsourcedCache | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ─── Key helper ────────────────────────────────────────────

function key(category: string, postalCode: string | null, householdType: string): string {
  return `${category}|${postalCode || "*"}|${householdType}`;
}

// ─── Fetch averages ────────────────────────────────────────

export async function fetchCrowdsourcedAverages(): Promise<Map<string, PriceAverage>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  try {
    const { data, error } = await supabase.functions.invoke("crowdsourced-prices", {
      method: "GET",
    });

    if (error || !data?.averages) {
      console.warn("Could not fetch crowdsourced prices:", error);
      return cache?.data || new Map();
    }

    const map = new Map<string, PriceAverage>();
    for (const avg of data.averages as PriceAverage[]) {
      map.set(key(avg.category, avg.postal_code, avg.household_type), avg);
      // Also store without postal for fallback
      if (avg.postal_code) {
        const globalKey = key(avg.category, null, avg.household_type);
        if (!map.has(globalKey)) {
          map.set(globalKey, avg);
        }
      }
    }

    cache = { data: map, fetchedAt: Date.now() };
    return map;
  } catch {
    return cache?.data || new Map();
  }
}

// ─── Lookup a crowdsourced price ───────────────────────────

export function getCrowdsourcedPrice(
  averages: Map<string, PriceAverage>,
  category: string,
  postalCode: string | null,
  householdType: string
): { amount: number; count: number } | null {
  // Try postal-specific first
  const localAvg = averages.get(key(category, postalCode, householdType));
  if (localAvg && localAvg.observation_count >= 5) {
    return { amount: localAvg.median_amount, count: localAvg.observation_count };
  }

  // Fallback to national
  const globalAvg = averages.get(key(category, null, householdType));
  if (globalAvg && globalAvg.observation_count >= 10) {
    return { amount: globalAvg.median_amount, count: globalAvg.observation_count };
  }

  return null;
}

// ─── Submit observations after onboarding ──────────────────

export async function submitPriceObservations(profile: BudgetProfile): Promise<void> {
  const ht = profile.householdType;
  const pc = profile.postalCode || null;
  const observations: { category: string; postal_code: string | null; household_type: string; amount: number }[] = [];

  // Housing
  if (profile.housingType === "lejer" && profile.rentAmount > 0) {
    observations.push({ category: "rent", postal_code: pc, household_type: ht, amount: profile.rentAmount });
  }
  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    observations.push({ category: "mortgage", postal_code: pc, household_type: ht, amount: profile.mortgageAmount });
  }
  if (profile.housingType === "andel" && profile.rentAmount > 0) {
    observations.push({ category: "andel", postal_code: pc, household_type: ht, amount: profile.rentAmount });
  }

  // Insurance
  if (profile.hasInsurance && profile.insuranceAmount > 0) {
    observations.push({ category: "insurance", postal_code: null, household_type: ht, amount: profile.insuranceAmount });
  }

  // Car
  if (profile.hasCar) {
    if (profile.carLoan > 0) observations.push({ category: "car_loan", postal_code: null, household_type: ht, amount: profile.carLoan });
    if (profile.carFuel > 0) observations.push({ category: "car_fuel", postal_code: null, household_type: ht, amount: profile.carFuel });
    if (profile.carInsurance > 0) observations.push({ category: "car_insurance", postal_code: null, household_type: ht, amount: Math.round(profile.carInsurance / 12) });
  }

  // Union
  if (profile.hasUnion && profile.unionAmount > 0) {
    observations.push({ category: "union", postal_code: null, household_type: ht, amount: profile.unionAmount });
  }

  // Fitness
  if (profile.hasFitness && profile.fitnessAmount > 0) {
    observations.push({ category: "fitness", postal_code: null, household_type: ht, amount: profile.fitnessAmount });
  }

  // Pet
  if (profile.hasPet && profile.petAmount > 0) {
    observations.push({ category: "pet", postal_code: null, household_type: ht, amount: profile.petAmount });
  }

  if (observations.length === 0) return;

  try {
    await supabase.functions.invoke("crowdsourced-prices", {
      method: "POST",
      body: { observations },
    });
  } catch (err) {
    console.warn("Failed to submit crowdsourced prices:", err);
  }
}

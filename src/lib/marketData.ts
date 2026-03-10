import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────

export interface MarketData {
  timestamp: string;
  income: Record<string, number>;     // postal code → monthly disposable income
  electricity: {
    dk1: number;      // DKK/kWh spot (west)
    dk2: number;      // DKK/kWh spot (east)
    avgKwhDkk: number; // total price incl. transport+afgifter
  };
  mortgageRate: number;               // estimated 30-year fixed rate %
}

// ─── Cache ─────────────────────────────────────────────────

const CACHE_KEY = "kassen_market_data_v2";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedData {
  data: MarketData;
  fetchedAt: number;
}

let memCache: CachedData | null = null;

// ─── Fetch market data ────────────────────────────────────

export async function fetchMarketData(): Promise<MarketData | null> {
  // 1. Check memory cache
  if (memCache && Date.now() - memCache.fetchedAt < CACHE_TTL) {
    return memCache.data;
  }

  // 2. Check localStorage cache
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed: CachedData = JSON.parse(stored);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
        memCache = parsed;
        return parsed.data;
      }
    }
  } catch { /* ignore */ }

  // 3. Fetch from edge function
  try {
    const { data, error } = await supabase.functions.invoke("market-data", {
      method: "GET",
    });

    if (error || !data) {
      console.warn("Market data fetch failed:", error);
      return memCache?.data ?? null;
    }

    const marketData = data as MarketData;
    const cached: CachedData = { data: marketData, fetchedAt: Date.now() };
    memCache = cached;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch { /* storage full */ }

    return marketData;
  } catch (err) {
    console.warn("Market data error:", err);
    return memCache?.data ?? null;
  }
}

// ─── Lookup helpers ───────────────────────────────────────

/** Get live monthly electricity cost estimate */
export function getLiveElCost(data: MarketData | null, annualKwh: number): number | null {
  if (!data || !data.electricity.avgKwhDkk) return null;
  return Math.round((data.electricity.avgKwhDkk * annualKwh) / 12);
}

/** Get live electricity price per kWh (all-in) */
export function getLiveElPrice(data: MarketData | null): number | null {
  if (!data || !data.electricity.avgKwhDkk) return null;
  return data.electricity.avgKwhDkk;
}

/** Get live mortgage interest rate */
export function getLiveMortgageRate(data: MarketData | null): number | null {
  if (!data || !data.mortgageRate) return null;
  return data.mortgageRate;
}

/** Get average disposable income for a postal code area */
export function getLiveIncome(data: MarketData | null, postalCode: string): number | null {
  if (!data || !data.income || Object.keys(data.income).length === 0) return null;
  // Try exact postal code, then national average
  return data.income[postalCode] ?? data.income["000"] ?? null;
}

/** Check if market data has real values (not just fallbacks) */
export function hasLiveData(data: MarketData | null): {
  income: boolean;
  electricity: boolean;
  mortgageRate: boolean;
} {
  return {
    income: !!data && Object.keys(data.income).length > 5,
    electricity: !!data && data.electricity.avgKwhDkk > 0,
    mortgageRate: !!data && data.mortgageRate > 0 && data.mortgageRate !== 4.0,
  };
}

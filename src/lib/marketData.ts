import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────

export interface MarketData {
  timestamp: string;
  rent: Record<string, number>;       // municipality code → monthly rent (70m²)
  income: Record<string, number>;     // municipality code → monthly disposable income
  electricity: {
    dk1: number;      // DKK/kWh spot (west)
    dk2: number;      // DKK/kWh spot (east)
    avgKwhDkk: number; // total price incl. transport+afgifter
  };
  mortgageRate: number;               // 30-year fixed rate %
}

// ─── Cache ─────────────────────────────────────────────────

const CACHE_KEY = "kassen_market_data_v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedData {
  data: MarketData;
  fetchedAt: number;
}

let memCache: CachedData | null = null;

// ─── Postal code → municipality mapping (most common) ──────

const POSTAL_TO_MUNICIPALITY: Record<string, string> = {
  // København
  "1000": "101", "1100": "101", "1200": "101", "1300": "101",
  "1500": "101", "1600": "101", "1700": "101",
  "2100": "101", "2200": "101", "2300": "101", "2400": "101", "2450": "101",
  "2500": "101",
  // Frederiksberg
  "2000": "147",
  // Gentofte
  "2820": "157", "2900": "157", "2920": "157",
  // Lyngby-Taarbæk
  "2800": "173",
  // Gladsaxe
  "2860": "159",
  // Herlev
  "2730": "163",
  // Rødovre
  "2610": "175",
  // Hvidovre
  "2650": "167",
  // Brøndby
  "2605": "153",
  // Vallensbæk
  "2625": "187",
  // Albertslund
  "2620": "165",
  // Glostrup
  "2600": "161",
  // Taastrup / Høje-Taastrup
  "2630": "169",
  // Ballerup
  "2750": "151",
  // Greve
  "2670": "253",
  // Helsingør
  "3000": "217",
  // Hillerød
  "3400": "219",
  // Roskilde
  "4000": "265",
  // Køge
  "4600": "259",
  // Slagelse
  "4200": "329",
  // Næstved
  "4700": "370",
  // Odense
  "5000": "461", "5200": "461",
  // Svendborg
  "5700": "479",
  // Kolding
  "6000": "621",
  // Esbjerg
  "6700": "561",
  // Vejle
  "7100": "630",
  // Fredericia
  "7000": "607",
  // Herning
  "7400": "657",
  // Holstebro
  "7500": "661",
  // Aarhus
  "8000": "751", "8200": "751", "8210": "751", "8220": "751",
  // Silkeborg
  "8600": "740",
  // Horsens
  "8700": "615",
  // Viborg
  "8800": "791",
  // Randers
  "8900": "730",
  // Aalborg
  "9000": "851", "9200": "851", "9400": "851",
  // Hjørring
  "9800": "860",
  // Frederikshavn
  "9900": "813",
};

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

export function getMunicipalityCode(postalCode: string): string | null {
  return POSTAL_TO_MUNICIPALITY[postalCode] ?? null;
}

/** Get live rent estimate for a postal code (monthly, ~70m²) */
export function getLiveRent(data: MarketData | null, postalCode: string): number | null {
  if (!data) return null;
  const munCode = getMunicipalityCode(postalCode);
  if (!munCode) return null;
  return data.rent[munCode] ?? null;
}

/** Get live average income for a postal code (monthly) */
export function getLiveIncome(data: MarketData | null, postalCode: string): number | null {
  if (!data) return null;
  const munCode = getMunicipalityCode(postalCode);
  if (!munCode) return null;
  return data.income[munCode] ?? null;
}

/** Get live monthly electricity cost estimate */
export function getLiveElCost(data: MarketData | null, annualKwh: number): number | null {
  if (!data || !data.electricity.avgKwhDkk) return null;
  return Math.round((data.electricity.avgKwhDkk * annualKwh) / 12);
}

/** Get live mortgage interest rate */
export function getLiveMortgageRate(data: MarketData | null): number | null {
  if (!data || !data.mortgageRate) return null;
  return data.mortgageRate;
}

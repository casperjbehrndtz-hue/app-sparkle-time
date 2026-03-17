import { supabase } from "@/integrations/supabase/client";

// ─── DST Fallback Data (Danmarks Statistik 2025) ────────
interface DSTEntry { p25: number; median: number; p75: number }

export const DST_FALLBACK: Record<string, DSTEntry> = {
  "IT":                        { p25: 42000, median: 50000, p75: 62000 },
  "Finans":                    { p25: 40000, median: 52000, p75: 68000 },
  "Pharma":                    { p25: 45000, median: 55000, p75: 70000 },
  "Sundhed":                   { p25: 32000, median: 38000, p75: 45000 },
  "Undervisning":              { p25: 33000, median: 40000, p75: 47000 },
  "Offentlig administration":  { p25: 34000, median: 42000, p75: 50000 },
  "Byggeri":                   { p25: 32000, median: 39000, p75: 47000 },
  "Detail":                    { p25: 28000, median: 35000, p75: 43000 },
  "Transport":                 { p25: 30000, median: 36000, p75: 43000 },
  "Industri":                  { p25: 32000, median: 38000, p75: 46000 },
  "Rådgivning":                { p25: 40000, median: 48000, p75: 60000 },
  "Medie":                     { p25: 34000, median: 42000, p75: 52000 },
  "Jura":                      { p25: 38000, median: 48000, p75: 65000 },
  "Hotel og restauration":     { p25: 25000, median: 30000, p75: 36000 },
  "Landbrug":                  { p25: 28000, median: 34000, p75: 41000 },
  "Energi":                    { p25: 38000, median: 46000, p75: 56000 },
  "Kultur":                    { p25: 28000, median: 35000, p75: 43000 },
  "Social":                    { p25: 30000, median: 36000, p75: 42000 },
  "Alle":                      { p25: 32000, median: 40000, p75: 50000 },
};

export const DST_INDUSTRIES = Object.keys(DST_FALLBACK);

/** Find the best DST match for a given industry string */
function findDSTMatch(industry: string): DSTEntry {
  const lower = industry.toLowerCase();
  for (const [key, val] of Object.entries(DST_FALLBACK)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return val;
    }
  }
  return DST_FALLBACK["Alle"];
}

/** Get DST fallback percentiles for any industry */
export function getDSTFallback(industry: string): { p25: number; median: number; p75: number; source: string } {
  const match = findDSTMatch(industry);
  return { ...match, source: "DST 2025" };
}

interface SalaryObservation {
  industry: string;
  region: string;
  gross_monthly: number;
  net_monthly: number;
  tax_pct?: number;
  pension_pct?: number;
}

interface SalaryPercentiles {
  industry: string;
  region: string;
  sample_size: number;
  gross_p25: number;
  gross_median: number;
  gross_p75: number;
  net_median: number;
  avg_tax_pct: number;
  avg_pension_pct: number;
}

/** Submit an anonymized salary observation (fire-and-forget). */
export async function submitSalaryObservation(obs: SalaryObservation): Promise<void> {
  try {
    await supabase.from("salary_observations").insert({
      industry: obs.industry,
      region: obs.region,
      gross_monthly: obs.gross_monthly,
      net_monthly: obs.net_monthly,
      tax_pct: obs.tax_pct ?? null,
      pension_pct: obs.pension_pct ?? null,
    });
  } catch {
    // fire-and-forget — silently discard errors
  }
}

/** Look up salary percentiles for an industry and optional region. */
export async function getSalaryPercentiles(
  industry: string,
  region?: string,
): Promise<SalaryPercentiles | null> {
  let query = supabase
    .from("salary_percentiles")
    .select("*")
    .ilike("industry", industry);

  if (region) {
    query = query.eq("region", region);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error || !data) return null;

  return data as SalaryPercentiles;
}

/** Estimate which percentile (0–100) a value falls in given p25/median/p75. */
export function getPercentileRank(
  value: number,
  p25: number,
  median: number,
  p75: number,
): number {
  if (value <= p25) {
    return p25 === 0 ? 0 : Math.max(0, (value / p25) * 25);
  }
  if (value <= median) {
    return 25 + ((value - p25) / (median - p25)) * 25;
  }
  if (value <= p75) {
    return 50 + ((value - median) / (p75 - median)) * 25;
  }
  const above = 75 + ((value - p75) / (p75 - median)) * 25;
  return Math.min(95, above);
}

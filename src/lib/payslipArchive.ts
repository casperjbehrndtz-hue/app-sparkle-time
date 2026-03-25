/**
 * Payslip archive — localStorage-based, max 24 months
 *
 * Stores ONLY financial data — NO PII (name, address, CPR, employer).
 * "Din lønseddel forlader aldrig din enhed."
 */
import type { ExtractedPayslip } from "./payslipTypes";

const STORAGE_KEY = "nemtbudget_payslip_archive";
const MAX_ENTRIES = 24;

export interface ArchivedPayslip {
  id: string;
  /** YYYY-MM format */
  period: string;
  savedAt: string; // ISO date

  // Financial data only
  bruttolon: number;
  nettolon: number;
  amBidrag: number;
  aSkat: number;
  atp: number;
  pensionEmployee: number;
  pensionEmployer: number;
  traekkort: number;
  personfradrag: number;

  // Optional deductions
  fagforening?: number;
  sundhedsforsikring?: number;
  fritvalgKonto?: number;
  feriepengeHensaet?: number;

  // Anonymous context (safe)
  anonIndustry?: string;
  anonRegion?: string;
  anonJobTitle?: string;
}

export function archivePayslip(p: ExtractedPayslip): ArchivedPayslip {
  const archive = getArchive();

  const period = normalizePeriod(p.payPeriod);
  const id = `ps_${period}_${Date.now()}`;

  // Remove existing entry for same period (replace)
  const filtered = archive.filter(a => a.period !== period);

  const entry: ArchivedPayslip = {
    id,
    period,
    savedAt: new Date().toISOString(),
    bruttolon: p.bruttolon,
    nettolon: p.nettolon,
    amBidrag: p.amBidrag,
    aSkat: p.aSkat,
    atp: p.atp,
    pensionEmployee: p.pensionEmployee,
    pensionEmployer: p.pensionEmployer,
    traekkort: p.traekkort,
    personfradrag: p.personfradrag,
    fagforening: p.fagforening,
    sundhedsforsikring: p.sundhedsforsikring,
    fritvalgKonto: p.fritvalgKonto,
    feriepengeHensaet: p.feriepengeHensaet,
    anonIndustry: p.anonIndustry,
    anonRegion: p.anonRegion,
    anonJobTitle: p.anonJobTitle,
  };

  // Add new entry, keep max entries, sort by period descending
  filtered.push(entry);
  filtered.sort((a, b) => b.period.localeCompare(a.period));
  const trimmed = filtered.slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — remove oldest and retry
    const reduced = trimmed.slice(0, MAX_ENTRIES - 4);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
  }

  return entry;
}

export function getArchive(): ArchivedPayslip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e: unknown) =>
      e && typeof e === "object" && "id" in e && "bruttolon" in e
    ) as ArchivedPayslip[];
  } catch {
    return [];
  }
}

export function deleteFromArchive(id: string): void {
  const archive = getArchive().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

export function clearArchive(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface ArchiveStats {
  count: number;
  latestPeriod?: string;
  oldestPeriod?: string;
  avgBrutto?: number;
  avgNetto?: number;
  /** Brutto change from second-latest to latest (percentage) */
  latestChange?: number;
}

export function getArchiveStats(): ArchiveStats {
  const archive = getArchive();
  if (archive.length === 0) return { count: 0 };

  const sorted = [...archive].sort((a, b) => a.period.localeCompare(b.period));
  const avgBrutto = Math.round(sorted.reduce((s, a) => s + a.bruttolon, 0) / sorted.length);
  const avgNetto = Math.round(sorted.reduce((s, a) => s + a.nettolon, 0) / sorted.length);

  let latestChange: number | undefined;
  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2].bruttolon;
    const latest = sorted[sorted.length - 1].bruttolon;
    if (prev > 0) {
      latestChange = Math.round(((latest - prev) / prev) * 1000) / 10;
    }
  }

  return {
    count: archive.length,
    latestPeriod: sorted[sorted.length - 1].period,
    oldestPeriod: sorted[0].period,
    avgBrutto,
    avgNetto,
    latestChange,
  };
}

/** Normalize "marts 2026", "03/2026", "2026-03", etc. to "2026-03" */
export function normalizePeriod(raw?: string): string {
  if (!raw) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // Already YYYY-MM
  const isoMatch = raw.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // MM/YYYY or MM-YYYY
  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, "0")}`;

  // Danish month names
  const months: Record<string, string> = {
    januar: "01", februar: "02", marts: "03", april: "04",
    maj: "05", juni: "06", juli: "07", august: "08",
    september: "09", oktober: "10", november: "11", december: "12",
  };

  const lower = raw.toLowerCase();
  for (const [name, num] of Object.entries(months)) {
    if (lower.includes(name)) {
      const yearMatch = lower.match(/(\d{4})/);
      if (yearMatch) return `${yearMatch[1]}-${num}`;
    }
  }

  // Fallback
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

import type { BudgetProfile } from "./types";
import { matchMerchant, CATEGORY_EMOJIS } from "./merchantDatabase";

// ─── Core types ─────────────────────────────────────

export interface BankTransaction {
  dato: string;           // "YYYY-MM-DD"
  tekst: string;          // raw text from bank statement
  beløb: number;          // negative = expense, positive = income
  kategori: string;       // matches budget categories
  erAbonnement: boolean;
  merchantName?: string;  // cleaned/normalized merchant name
  originalKategori?: string; // Claude's category before client override
}

export interface BankStatementRaw {
  transaktioner: BankTransaction[];
  periodeStart: string | null;
  periodeSlut: string | null;
  startSaldo: number | null;
  slutSaldo: number | null;
  kontoNavn: string | null;
  bankNavn: string | null;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  truncated?: boolean;
}

// ─── Analysis types ─────────────────────────────────

export interface CategorySummary {
  kategori: string;
  emoji: string;
  total: number;          // sum of expenses (absolute value)
  count: number;
  pctOfTotal: number;     // percentage of total spending
  transactions: BankTransaction[];
}

export interface DetectedSubscription {
  name: string;
  amount: number;         // monthly amount (positive)
  kategori: string;
  occurrences: number;
  emoji: string;
}

export interface Pengesluger {
  kategori: string;
  emoji: string;
  total: number;
  pctOfTotal: number;
  insight: string;        // e.g. "Du bruger 4.200 kr/md på mad — 18% af dit forbrug"
}

export interface BudgetComparisonItem {
  kategori: string;
  emoji: string;
  actual: number;
  budgeted: number;
  diff: number;           // actual - budgeted (positive = overspending)
  status: "good" | "watch" | "over";
}

export interface StatementAnalysis {
  totalUdgifter: number;
  totalIndkomst: number;
  antalTransaktioner: number;
  periodeStart: string | null;
  periodeSlut: string | null;
  categories: CategorySummary[];
  pengeslugere: Pengesluger[];
  abonnementer: DetectedSubscription[];
  budgetComparison?: BudgetComparisonItem[];
  estimatedMonthly: number; // extrapolated to full month if partial period
}

// ─── Parse function ─────────────────────────────────

function safeNum(val: unknown): number {
  if (typeof val === "number" && isFinite(val)) return val;
  if (typeof val === "string") {
    // Handle Danish format: "1.234,56" → 1234.56
    const cleaned = val.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    if (isFinite(n)) return n;
  }
  return 0;
}

function safeStr(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function safeBool(val: unknown): boolean {
  return val === true || val === "true";
}

function safeDate(val: unknown): string | null {
  const s = safeStr(val);
  if (!s) return null;
  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Accept DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export function parseBankStatementResponse(raw: unknown): BankStatementRaw | null {
  if (!raw || typeof raw !== "object") return null;

  const r = raw as Record<string, unknown>;
  const rawTx = r["transaktioner"];
  if (!Array.isArray(rawTx) || rawTx.length === 0) return null;

  const transaktioner: BankTransaction[] = [];

  for (const item of rawTx) {
    if (!item || typeof item !== "object") continue;
    const tx = item as Record<string, unknown>;

    const tekst = safeStr(tx["tekst"]);
    const beløb = safeNum(tx["beløb"]);
    if (!tekst && beløb === 0) continue; // skip empty rows

    const dato = safeDate(tx["dato"]) || "";
    let kategori = safeStr(tx["kategori"]) || "Andet";
    let merchantName: string | undefined;
    let originalKategori: string | undefined;

    // Client-side merchant override
    const match = matchMerchant(tekst);
    if (match) {
      originalKategori = kategori;
      kategori = match.kategori;
      merchantName = match.cleanName;
    }

    transaktioner.push({
      dato,
      tekst,
      beløb,
      kategori,
      erAbonnement: safeBool(tx["erAbonnement"]),
      merchantName,
      originalKategori,
    });
  }

  if (transaktioner.length === 0) return null;

  const warnings: string[] = [];
  if (Array.isArray(r["warnings"])) {
    for (const w of r["warnings"]) {
      if (typeof w === "string") warnings.push(w);
    }
  }

  const startSaldo = r["startSaldo"] != null ? safeNum(r["startSaldo"]) : null;
  const slutSaldo = r["slutSaldo"] != null ? safeNum(r["slutSaldo"]) : null;

  // Balance validation
  if (startSaldo !== null && slutSaldo !== null) {
    const sumTx = transaktioner.reduce((s, t) => s + t.beløb, 0);
    const expected = startSaldo + sumTx;
    const diff = Math.abs(expected - slutSaldo);
    if (diff > 100) {
      warnings.push(
        `Saldo-tjek: Startsaldo + transaktioner = ${Math.round(expected).toLocaleString("da-DK")} kr, men slutsaldo er ${Math.round(slutSaldo).toLocaleString("da-DK")} kr (forskel: ${Math.round(diff).toLocaleString("da-DK")} kr). Der kan mangle transaktioner.`
      );
    }
  }

  const confidence = (r["confidence"] === "high" || r["confidence"] === "medium" || r["confidence"] === "low")
    ? r["confidence"] as "high" | "medium" | "low"
    : "low";

  return {
    transaktioner,
    periodeStart: safeDate(r["periodeStart"]),
    periodeSlut: safeDate(r["periodeSlut"]),
    startSaldo,
    slutSaldo,
    kontoNavn: safeStr(r["kontoNavn"]) || null,
    bankNavn: safeStr(r["bankNavn"]) || null,
    confidence: warnings.length > 0 && confidence === "high" ? "medium" : confidence,
    warnings,
    truncated: r["truncated"] === true,
  };
}

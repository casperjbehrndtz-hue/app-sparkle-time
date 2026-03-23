import type {
  BankStatementRaw,
  BankTransaction,
  CategorySummary,
  DetectedSubscription,
  Pengesluger,
  BudgetComparisonItem,
  StatementAnalysis,
} from "./bankStatementTypes";
import type { BudgetProfile } from "./types";
import { matchMerchant, getCategoryEmoji } from "./merchantDatabase";

// ─── Enrich transactions with merchant database ─────

function enrichTransactions(transactions: BankTransaction[]): BankTransaction[] {
  return transactions.map((tx) => {
    if (tx.merchantName) return tx; // already enriched (e.g. from CSV parser)

    const match = matchMerchant(tx.tekst);
    if (match) {
      return {
        ...tx,
        originalKategori: tx.kategori !== match.kategori ? tx.kategori : undefined,
        kategori: match.kategori,
        merchantName: match.cleanName,
      };
    }
    return tx;
  });
}

// ─── Group by category ──────────────────────────────

function groupByCategory(transactions: BankTransaction[]): CategorySummary[] {
  const expenses = transactions.filter((t) => t.beløb < 0);
  const totalSpend = expenses.reduce((s, t) => s + Math.abs(t.beløb), 0);

  const groups = new Map<string, BankTransaction[]>();
  for (const tx of expenses) {
    const key = tx.kategori;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const categories: CategorySummary[] = [];
  for (const [kategori, txs] of groups) {
    const total = txs.reduce((s, t) => s + Math.abs(t.beløb), 0);
    categories.push({
      kategori,
      emoji: getCategoryEmoji(kategori),
      total: Math.round(total),
      count: txs.length,
      pctOfTotal: totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0,
      transactions: txs,
    });
  }

  // Sort by total descending
  categories.sort((a, b) => b.total - a.total);
  return categories;
}

// ─── Find pengeslugere (top expense categories) ─────

function findPengeslugere(categories: CategorySummary[]): Pengesluger[] {
  // Skip income-like categories
  const expenseCategories = categories.filter(
    (c) => !["Løn", "Overførsel", "Opsparing"].includes(c.kategori)
  );

  return expenseCategories.slice(0, 5).map((c) => ({
    kategori: c.kategori,
    emoji: c.emoji,
    total: c.total,
    pctOfTotal: c.pctOfTotal,
    insight: `Du bruger ${c.total.toLocaleString("da-DK")} kr på ${c.kategori.toLowerCase()} — ${c.pctOfTotal}% af dit forbrug`,
  }));
}

// ─── Detect subscriptions (recurring same-amount) ───

function detectSubscriptions(transactions: BankTransaction[]): DetectedSubscription[] {
  const expenses = transactions.filter((t) => t.beløb < 0);

  // Group by rounded amount + similar merchant text
  const groups = new Map<string, { name: string; amount: number; kategori: string; count: number }>();

  for (const tx of expenses) {
    const amount = Math.abs(tx.beløb);
    // Skip very small or very large amounts (unlikely subscriptions)
    if (amount < 20 || amount > 3000) continue;

    const roundedAmount = Math.round(amount);
    const merchant = tx.merchantName || tx.tekst.slice(0, 30).trim();
    const key = `${roundedAmount}_${merchant.toLowerCase().slice(0, 15)}`;

    if (groups.has(key)) {
      groups.get(key)!.count++;
    } else {
      groups.set(key, {
        name: merchant,
        amount: roundedAmount,
        kategori: tx.kategori,
        count: 1,
      });
    }
  }

  // Also include AI-flagged subscriptions (single occurrence but erAbonnement=true)
  for (const tx of expenses) {
    if (!tx.erAbonnement) continue;
    const amount = Math.abs(tx.beløb);
    if (amount < 20 || amount > 3000) continue;

    const roundedAmount = Math.round(amount);
    const merchant = tx.merchantName || tx.tekst.slice(0, 30).trim();
    const key = `${roundedAmount}_${merchant.toLowerCase().slice(0, 15)}`;

    if (!groups.has(key)) {
      groups.set(key, {
        name: merchant,
        amount: roundedAmount,
        kategori: tx.kategori,
        count: 1,
      });
    }
  }

  const subs: DetectedSubscription[] = [];
  for (const [, g] of groups) {
    // Require 2+ occurrences OR AI flagged as subscription
    if (g.count >= 2 || transactions.some((t) => t.erAbonnement && Math.abs(t.beløb) === g.amount)) {
      subs.push({
        name: g.name,
        amount: g.amount,
        kategori: g.kategori,
        occurrences: g.count,
        emoji: getCategoryEmoji(g.kategori),
      });
    }
  }

  // Sort by amount descending, deduplicate by name
  subs.sort((a, b) => b.amount - a.amount);
  const seen = new Set<string>();
  return subs.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Compare to budget profile ──────────────────────

const CATEGORY_TO_PROFILE: Record<string, (p: BudgetProfile) => number> = {
  "Mad": (p) => p.foodAmount || 0,
  "Restaurant": (p) => p.restaurantAmount || 0,
  "Fritid": (p) => p.leisureAmount || 0,
  "Tøj": (p) => p.clothingAmount || 0,
  "Sundhed": (p) => p.healthAmount || 0,
  "Fitness": (p) => (p.hasFitness ? p.fitnessAmount || 299 : 0),
  "Forsikring": (p) => (p.hasInsurance ? p.insuranceAmount || 0 : 0),
  "Transport": (p) => {
    let total = 0;
    if (p.hasCar) {
      total += p.carFuel || 0;
      total += p.carLoan || 0;
      total += Math.round((p.carInsurance || 0) / 12);
      total += Math.round((p.carTax || 0) / 12);
    }
    return total;
  },
};

function compareToBudget(
  categories: CategorySummary[],
  profile: BudgetProfile,
  periodDays: number
): BudgetComparisonItem[] {
  const monthFactor = periodDays > 0 ? 30 / periodDays : 1;

  const items: BudgetComparisonItem[] = [];
  for (const cat of categories) {
    const getter = CATEGORY_TO_PROFILE[cat.kategori];
    if (!getter) continue;

    const budgeted = getter(profile);
    if (budgeted <= 0) continue;

    const actual = Math.round(cat.total * monthFactor);
    const diff = actual - budgeted;
    const pctOver = budgeted > 0 ? (diff / budgeted) * 100 : 0;

    let status: "good" | "watch" | "over";
    if (pctOver <= 5) status = "good";
    else if (pctOver <= 25) status = "watch";
    else status = "over";

    items.push({
      kategori: cat.kategori,
      emoji: cat.emoji,
      actual,
      budgeted,
      diff,
      status,
    });
  }

  // Sort: over first, then watch, then good
  const order = { over: 0, watch: 1, good: 2 };
  items.sort((a, b) => order[a.status] - order[b.status]);
  return items;
}

// ─── Estimate monthly total ─────────────────────────

function getPeriodDays(raw: BankStatementRaw): number {
  if (!raw.periodeStart || !raw.periodeSlut) {
    // Estimate from transaction dates
    const dates = raw.transaktioner.map((t) => t.dato).filter(Boolean).sort();
    if (dates.length < 2) return 30;
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.round(diff));
  }
  const start = new Date(raw.periodeStart);
  const end = new Date(raw.periodeSlut);
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff));
}

// ─── Main analysis function ─────────────────────────

export function analyzeStatement(
  raw: BankStatementRaw,
  profile?: BudgetProfile
): StatementAnalysis {
  const enriched = enrichTransactions(raw.transaktioner);
  const categories = groupByCategory(enriched);
  const pengeslugere = findPengeslugere(categories);
  const abonnementer = detectSubscriptions(enriched);

  const totalUdgifter = enriched
    .filter((t) => t.beløb < 0)
    .reduce((s, t) => s + Math.abs(t.beløb), 0);

  const totalIndkomst = enriched
    .filter((t) => t.beløb > 0)
    .reduce((s, t) => s + t.beløb, 0);

  const periodDays = getPeriodDays(raw);
  const monthFactor = periodDays > 0 ? 30 / periodDays : 1;
  const estimatedMonthly = Math.round(totalUdgifter * monthFactor);

  let budgetComparison: BudgetComparisonItem[] | undefined;
  if (profile) {
    budgetComparison = compareToBudget(categories, profile, periodDays);
  }

  return {
    totalUdgifter: Math.round(totalUdgifter),
    totalIndkomst: Math.round(totalIndkomst),
    antalTransaktioner: enriched.length,
    periodeStart: raw.periodeStart,
    periodeSlut: raw.periodeSlut,
    categories,
    pengeslugere,
    abonnementer,
    budgetComparison,
    estimatedMonthly,
  };
}

import type { ComputedBudget } from "./types";

export interface BudgetSnapshot {
  date: string; // ISO date string YYYY-MM-DD
  disposableIncome: number;
  totalIncome: number;
  totalExpenses: number;
  score: number;
}

const STORAGE_KEY = "kassen_snapshots";
const MAX_SNAPSHOTS = 50;

export function saveSnapshot(budget: ComputedBudget, score: number): void {
  const today = new Date().toISOString().slice(0, 10);
  const snapshots = getSnapshots();

  // Deduplicate by day — replace if same day
  const filtered = snapshots.filter((s) => s.date !== today);
  filtered.push({
    date: today,
    disposableIncome: budget.disposableIncome,
    totalIncome: budget.totalIncome,
    totalExpenses: budget.totalExpenses,
    score,
  });

  // Keep only last MAX_SNAPSHOTS
  const trimmed = filtered.slice(-MAX_SNAPSHOTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getSnapshots(): BudgetSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BudgetSnapshot[];
  } catch {
    return [];
  }
}

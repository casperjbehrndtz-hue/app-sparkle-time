import { formatKr } from "./budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "./types";

export interface HealthMetrics {
  score: number; // 0-100
  label: string;
  color: string;
  bufferMonths: number;
  debtRatio: number; // ydelse/indkomst i %
  savingsRate: number; // frihedstal/indkomst i %
  stabilityScore: number; // 0-100 baseret på baseline-afvigelse
  buckets: {
    drift: number;   // must-have: faste + nødvendigheder
    frihed: number;   // want: livsstil
    fremtid: number;  // build: opsparing/investering (estimeret)
    risiko: number;   // protect: forsikring + buffer
  };
  truths: {
    freeCashFlow: number;
    monthlyBaseline: number;
    bufferScore: string;
  };
}

export function calculateHealth(profile: BudgetProfile, budget: ComputedBudget): HealthMetrics {
  const totalIncome = budget.totalIncome;
  const freeCashFlow = budget.disposableIncome;
  const fixedTotal = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const variableTotal = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);

  // --- Buffer months ---
  const estimatedBuffer = totalIncome * 1;
  const bufferMonths = fixedTotal > 0 ? Math.round((estimatedBuffer / fixedTotal) * 10) / 10 : 0;

  // --- Debt ratio (exclude negative items like rentefradrag) ---
  const housingCost = budget.fixedExpenses
    .filter(e => e.category === "Bolig" && e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const debtRatio = totalIncome > 0 ? Math.round((housingCost / totalIncome) * 100) : 0;

  // --- Savings rate ---
  const savingsRate = totalIncome > 0 ? Math.round((Math.max(0, freeCashFlow) / totalIncome) * 100) : 0;

  // --- Stability ---
  const coverageRatio = totalIncome > 0 ? Math.min(fixedTotal / totalIncome, 1) : 1;
  let stabilityScore: number;
  if (coverageRatio <= 0.5) stabilityScore = 95;
  else if (coverageRatio <= 0.65) stabilityScore = 80;
  else if (coverageRatio <= 0.75) stabilityScore = 55;
  else stabilityScore = Math.max(10, 55 - (coverageRatio - 0.75) * 200);

  // --- 4 Buckets ---
  const insuranceCost = budget.fixedExpenses
    .filter(e => e.category === "Forsikring")
    .reduce((s, e) => s + e.amount, 0);

  const lifestyleCost = budget.variableExpenses
    .filter(e => ["Fritid", "Tøj"].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);

  const driftCost = fixedTotal - insuranceCost + (variableTotal - lifestyleCost);
  const estimatedSavings = Math.max(0, freeCashFlow * 0.5);

  const buckets = {
    drift: driftCost,
    frihed: lifestyleCost + Math.max(0, freeCashFlow * 0.3),
    fremtid: estimatedSavings,
    risiko: insuranceCost + Math.max(0, freeCashFlow * 0.2),
  };

  // --- Health Score (0-100) ---
  const bufferScore = Math.min(100, bufferMonths * 12);
  const debtScore = debtRatio <= 0 ? 40 : debtRatio <= 25 ? 90 : debtRatio <= 35 ? 70 : debtRatio <= 45 ? 45 : Math.max(0, 45 - (debtRatio - 45) * 2);
  const savingsScore = savingsRate >= 30 ? 85 : savingsRate >= 20 ? 95 : savingsRate >= 15 ? 80 : Math.min(75, savingsRate * 5);

  const hasInsuranceCheck = profile.hasInsurance ? 1 : 0;
  const hasSavingsCheck = savingsRate >= 10 ? 1 : 0;
  const hasBufferCheck = bufferMonths >= 3 ? 1 : 0;
  const diversityScore = Math.round(((hasInsuranceCheck + hasSavingsCheck + hasBufferCheck) / 3) * 100);

  const rawScore = Math.round(
    bufferScore * 0.20 +
    debtScore * 0.20 +
    savingsScore * 0.25 +
    stabilityScore * 0.15 +
    diversityScore * 0.20
  );
  const score = Math.min(92, rawScore);

  const label = score >= 75 ? "Stærk" : score >= 55 ? "OK" : score >= 35 ? "Sårbar" : "Kritisk";
  const color = score >= 75 ? "text-primary" : score >= 55 ? "text-kassen-gold" : "text-destructive";

  const bufferLabel = bufferMonths >= 6 ? "Stærk buffer" : bufferMonths >= 3 ? "Acceptabel" : "Sårbar";

  return {
    score, label, color, bufferMonths, debtRatio, savingsRate, stabilityScore, buckets,
    truths: { freeCashFlow, monthlyBaseline: fixedTotal, bufferScore: bufferLabel },
  };
}

export function generateSmartSteps(
  profile: BudgetProfile,
  budget: ComputedBudget,
  health: HealthMetrics
): { icon: string; text: string; priority: "high" | "medium" | "low" }[] {
  const steps: { icon: string; text: string; priority: "high" | "medium" | "low" }[] = [];

  if (budget.disposableIncome < 0) {
    steps.push({
      icon: "🚨",
      text: `Du bruger ${formatKr(Math.abs(budget.disposableIncome))} kr. mere end du tjener. Skær i de variable udgifter eller øg indkomsten.`,
      priority: "high",
    });
  }

  if (health.bufferMonths < 3) {
    steps.push({
      icon: "🛡️",
      text: `Din buffer dækker ca. ${health.bufferMonths} måned${health.bufferMonths !== 1 ? "er" : ""}. En udbredt tommelfingerregel er 3-6 måneders udgifter.`,
      priority: "high",
    });
  }

  if (health.debtRatio > 35) {
    steps.push({
      icon: "🏡",
      text: `Boligudgifter udgør ${health.debtRatio}% af indkomsten. Over 35% anbefales det at refinansiere eller reducere.`,
      priority: "medium",
    });
  }

  if (health.savingsRate < 10 && budget.disposableIncome > 0) {
    steps.push({
      icon: "📈",
      text: `Din opsparingsrate er ${health.savingsRate}%. Selv 500 kr./md. ekstra bygger ${formatKr(500 * 12)} kr./år i formue.`,
      priority: "medium",
    });
  }

  const streamingCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamingCount >= 3) {
    steps.push({
      icon: "📺",
      text: `${streamingCount} streamingtjenester — skær 1-2 og spar 150-300 kr./md.`,
      priority: "low",
    });
  }

  if (profile.hasInsurance && profile.insuranceAmount > 800) {
    steps.push({
      icon: "🛡️",
      text: `Forsikring koster ${formatKr(profile.insuranceAmount)} kr./md. Sammenlign hvert 2. år — gennemsnitlig besparelse: 200 kr./md.`,
      priority: "low",
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return steps
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3);
}

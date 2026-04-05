import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Repeat, BarChart3, ArrowRight, AlertTriangle, Scale, Check, Copy, HelpCircle } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import { TransactionList } from "./TransactionList";
import type { StatementAnalysis, BudgetComparisonItem } from "@/lib/bankStatementTypes";
import type { BankTransaction } from "@/lib/bankStatementTypes";

interface Props {
  analysis: StatementAnalysis;
  transactions: BankTransaction[];
  truncated?: boolean;
  onCreateBudget: () => void;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

function StatusBadge({ status, diff, lc, currencyLabel }: { status: "good" | "watch" | "over"; diff: number; lc: string; currencyLabel: string }) {
  const styles = {
    good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    watch: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    over: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status]}`}>
      {diff > 0 ? "+" : ""}{formatKr(diff, lc)} {currencyLabel}
    </span>
  );
}

function generateSummaryText(analysis: StatementAnalysis, t: (key: string) => string, lc: string, periodLabel: string | null): string {
  const lines: string[] = [];
  lines.push(`📊 ${t("pengetjek.share.title")}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (periodLabel) lines.push(`${t("pengetjek.share.period")}: ${periodLabel}`);
  lines.push(`${t("pengetjek.share.totalSpending")}: ${formatKr(analysis.totalUdgifter, lc)} ${t("pengetjek.currency")}`);
  lines.push(`${t("pengetjek.share.transactionCount")}: ${analysis.antalTransaktioner}`);
  lines.push("");

  const topCats = analysis.categories
    .filter((c) => !["Løn", "Overførsel"].includes(c.kategori))
    .slice(0, 5);
  if (topCats.length > 0) {
    lines.push(`${t("pengetjek.share.topCategories")}:`);
    topCats.forEach((cat, i) => {
      const pct = analysis.totalUdgifter > 0 ? Math.round((cat.total / analysis.totalUdgifter) * 100) : 0;
      lines.push(`${i + 1}. ${cat.kategori}: ${formatKr(cat.total, lc)} ${t("pengetjek.currency")} (${pct}%)`);
    });
    lines.push("");
  }

  if (analysis.abonnementer.length > 0) {
    const monthlyTotal = analysis.abonnementer.reduce((s, a) => s + a.amount, 0);
    lines.push(`${t("pengetjek.share.subscriptions")}: ${analysis.abonnementer.length} (${formatKr(monthlyTotal, lc)} ${t("pengetjek.currency")}/${t("pengetjek.perMonth")})`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("nemtbudget.nu/pengetjek");
  return lines.join("\n");
}

export function PengetjekResult({ analysis, transactions, truncated, onCreateBudget }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const [copied, setCopied] = useState(false);

  const periodLabel = useMemo(() => {
    if (!analysis.periodeStart || !analysis.periodeSlut) return null;
    const dlc = locale.currencyLocale || "da-DK";
    const start = new Date(analysis.periodeStart).toLocaleDateString(dlc, { day: "numeric", month: "short" });
    const end = new Date(analysis.periodeSlut).toLocaleDateString(dlc, { day: "numeric", month: "short", year: "numeric" });
    return `${start} — ${end}`;
  }, [analysis.periodeStart, analysis.periodeSlut, locale.currencyLocale]);

  // Max bar width for category breakdown
  const maxCatTotal = analysis.categories.length > 0 ? analysis.categories[0].total : 1;

  return (
    <div className="space-y-4">
      {/* ── Truncation warning ── */}
      {truncated && (
        <motion.div {...fadeUp(0)} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">{t("pengetjek.result.truncated")}</p>
        </motion.div>
      )}

      {/* ── Section 1: Hero ── */}
      <motion.div {...fadeUp(0.05)} className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
          {t("pengetjek.result.hero.spent")}
        </p>
        <p className="text-3xl font-display font-bold text-foreground">
          {formatKr(analysis.totalUdgifter, lc)} <span className="text-lg text-muted-foreground">{t("pengetjek.currency")}</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{analysis.antalTransaktioner} {t("pengetjek.result.hero.transactions")}</span>
          {periodLabel && (
            <>
              <span className="text-border">|</span>
              <span>{periodLabel}</span>
            </>
          )}
        </div>
        {analysis.totalIndkomst > 0 && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {t("pengetjek.result.hero.income").replace("{amount}", formatKr(analysis.totalIndkomst, lc))}
          </p>
        )}
        {/* Emotional framing: compare to Danish household average */}
        {(() => {
          const monthly = analysis.totalUdgifter;
          if (monthly > 25000) return <p className="text-[10px] text-muted-foreground/60 mt-1">{t("pengetjek.result.hero.aboveAverage")}</p>;
          if (monthly < 15000) return <p className="text-[10px] text-muted-foreground/60 mt-1">{t("pengetjek.result.hero.belowAverage")}</p>;
          return <p className="text-[10px] text-muted-foreground/60 mt-1">{t("pengetjek.result.hero.nearAverage")}</p>;
        })()}
      </motion.div>

      {/* ── Section 2: Pengeslugere ── */}
      {analysis.pengeslugere.length > 0 && (
        <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold">{t("pengetjek.result.pengeslugere.title")}</h3>
              <p className="text-[10px] text-muted-foreground">{t("pengetjek.result.pengeslugere.subtitle")}</p>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {analysis.pengeslugere.map((p, i) => (
              <motion.div
                key={p.kategori}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  i === 0
                    ? "bg-red-500/5 border-red-500/20"
                    : i === 1
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{p.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{p.kategori}</p>
                    <p className="text-[10px] text-muted-foreground">{p.pctOfTotal}% {t("pengetjek.result.pengeslugere.ofSpending")}</p>
                  </div>
                </div>
                <p className="text-sm font-bold font-mono tabular-nums">{formatKr(p.total, lc)} {t("pengetjek.currency")}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Section 3: Abonnementer fundet ── */}
      {analysis.abonnementer.length > 0 && (() => {
        const activeSubs = analysis.abonnementer.filter(s => s.occurrences >= 2);
        const forgottenSubs = analysis.abonnementer.filter(s => s.occurrences === 1);
        return (
          <>
            {activeSubs.length > 0 && (
              <motion.div {...fadeUp(0.2)} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">{t("pengetjek.result.subscriptions.title")}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {t("pengetjek.result.subscriptions.total").replace("{amount}", formatKr(
                        activeSubs.reduce((s, a) => s + a.amount, 0), lc
                      ))}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  {activeSubs.map((sub, i) => (
                    <div key={`${sub.name}-${i}`} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{sub.emoji}</span>
                        <span className="text-xs">{sub.name}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400">
                        -{formatKr(sub.amount, lc)} {t("pengetjek.currency")}/{t("pengetjek.perMonth")}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {forgottenSubs.length > 0 && (
              <motion.div {...fadeUp(0.25)} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t("pengetjek.result.forgotten.title")}</h3>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                      {t("pengetjek.result.forgotten.subtitle")}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  {forgottenSubs.map((sub, i) => (
                    <div key={`forgotten-${sub.name}-${i}`} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-amber-500/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{sub.emoji}</span>
                        <span className="text-xs">{sub.name}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        -{formatKr(sub.amount, lc)} {t("pengetjek.currency")}/{t("pengetjek.perMonth")}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {t("pengetjek.result.forgotten.savings").replace("{amount}", formatKr(
                        forgottenSubs.reduce((s, a) => s + a.amount, 0), lc
                      ))}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        );
      })()}

      {/* ── Section 4: Kategori-breakdown ── */}
      {analysis.categories.length > 0 && (
        <motion.div {...fadeUp(0.3)} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("pengetjek.result.categories.title")}</h3>
          </div>
          <div className="p-4 space-y-2">
            {analysis.categories
              .filter((c) => !["Løn", "Overførsel"].includes(c.kategori))
              .map((cat) => (
                <div key={cat.kategori} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span>{cat.kategori}</span>
                      <span className="text-muted-foreground/50">({cat.count})</span>
                    </span>
                    <span className="font-mono tabular-nums font-medium">{formatKr(cat.total, lc)} {t("pengetjek.currency")}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, (cat.total / maxCatTotal) * 100)}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* ── Section 5: Budget-sammenligning ── */}
      {analysis.budgetComparison && analysis.budgetComparison.length > 0 && (
        <motion.div {...fadeUp(0.35)} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("pengetjek.result.budget.title")}</h3>
          </div>
          <div className="p-4 space-y-2">
            {analysis.budgetComparison.map((item: BudgetComparisonItem) => (
              <div
                key={item.kategori}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  item.status === "good"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : item.status === "watch"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{item.kategori}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("pengetjek.result.budget.budgeted")}: {formatKr(item.budgeted, lc)} {t("pengetjek.currency")} → {t("pengetjek.result.budget.actual")}: {formatKr(item.actual, lc)} {t("pengetjek.currency")}
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.status} diff={item.diff} lc={lc} currencyLabel={t("pengetjek.currency")} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Section 6: Transaktionsliste ── */}
      <TransactionList transactions={transactions} />

      {/* ── Section 7: CTA ── */}
      <motion.button
        {...fadeUp(0.4)}
        onClick={onCreateBudget}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {t("pengetjek.result.cta")}
        <ArrowRight className="w-4 h-4" />
      </motion.button>

      {/* ── Copy summary ── */}
      <motion.button
        {...fadeUp(0.45)}
        onClick={async () => {
          const text = generateSummaryText(analysis, t, lc, periodLabel);
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
      >
        {copied ? (
          <><Check className="w-3.5 h-3.5" />{t("pengetjek.result.copied")}</>
        ) : (
          <><Copy className="w-3.5 h-3.5" />{t("pengetjek.result.copyShare")}</>
        )}
      </motion.button>
    </div>
  );
}

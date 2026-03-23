import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import { getCategoryEmoji } from "@/lib/merchantDatabase";
import type { BankTransaction } from "@/lib/bankStatementTypes";

interface Props {
  transactions: BankTransaction[];
}

export function TransactionList({ transactions }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;

  // Group by date
  const grouped = new Map<string, BankTransaction[]>();
  for (const tx of transactions) {
    const key = tx.dato || "Ukendt dato";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(tx);
  }
  const sortedDates = [...grouped.keys()].sort().reverse();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/20 transition-colors"
      >
        <span>{t("pengetjek.result.transactions.toggle")} ({transactions.length})</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3 max-h-[60vh] overflow-y-auto">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 sticky top-0 bg-card py-1">
                    {date !== "Ukendt dato"
                      ? new Date(date).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" })
                      : date}
                  </div>
                  <div className="space-y-0.5">
                    {grouped.get(date)!.map((tx, i) => (
                      <div
                        key={`${date}-${i}`}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm shrink-0">{getCategoryEmoji(tx.kategori)}</span>
                          <div className="min-w-0">
                            <p className="text-xs truncate text-foreground">
                              {tx.merchantName || tx.tekst}
                            </p>
                            <span className="text-[10px] text-muted-foreground/60">
                              {tx.kategori}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-mono tabular-nums shrink-0 ml-2 ${
                          tx.beløb < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {tx.beløb < 0 ? "-" : "+"}{formatKr(Math.abs(tx.beløb), lc)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

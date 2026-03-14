import { motion } from "framer-motion";
import type { HealthMetrics } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";

interface Props {
  health: HealthMetrics;
  totalIncome: number;
  totalExpenses: number;
}

export function ShareCard({ health, totalIncome, totalExpenses }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const scoreColor = health.score >= 75 ? "hsl(152, 55%, 40%)" : health.score >= 55 ? "hsl(38, 85%, 50%)" : "hsl(0, 72%, 51%)";
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden"
      style={{ background: "linear-gradient(145deg, hsl(150 20% 98%), hsl(152 30% 96%))" }}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-display font-black text-lg text-primary">{t("share.brandName")}</span>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">{t("share.economyCheck")}</span>
        </div>

        {/* Score + Key Metrics */}
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r={radius} fill="none" stroke="hsl(150, 8%, 91%)" strokeWidth="4" />
              <circle
                cx="38" cy="38" r={radius}
                fill="none" stroke={scoreColor} strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 38 38)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-black text-xl" style={{ color: scoreColor }}>{health.score}</span>
              <span className="text-[8px] text-muted-foreground uppercase">{health.label}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("share.freedomNumber")}</span>
              <span className="font-display font-bold">{formatKr(health.truths.freeCashFlow, lc)} kr.</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("share.savingsRate")}</span>
              <span className="font-display font-bold">{health.savingsRate}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("share.buffer")}</span>
              <span className="font-display font-bold">{health.bufferMonths} md.</span>
            </div>
          </div>
        </div>

        {/* Buckets bar */}
        <div>
          <div className="h-2.5 rounded-full overflow-hidden flex">
            {Object.entries(health.buckets).map(([key, val]) => {
              const total = Object.values(health.buckets).reduce((s, v) => s + v, 0);
              const colors: Record<string, string> = {
                drift: "hsl(213, 70%, 50%)",
                frihed: "hsl(38, 85%, 50%)",
                fremtid: "hsl(152, 55%, 40%)",
                risiko: "hsl(280, 50%, 55%)",
              };
              return (
                <div
                  key={key}
                  style={{ backgroundColor: colors[key], width: `${total > 0 ? (val / total) * 100 : 25}%` }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
            <span>⚙️ {t("share.bucketDrift")}</span><span>✨ {t("share.bucketFrihed")}</span><span>📈 {t("share.bucketFremtid")}</span><span>🛡️ {t("share.bucketRisiko")}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-primary/5 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{t("share.footer")}</span>
        <span className="text-[10px] font-semibold text-primary">{t("share.brandUrl")}</span>
      </div>
    </motion.div>
  );
}

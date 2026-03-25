import { useState, useMemo, useEffect } from "react";
import { PiggyBank, TrendingUp, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import { projectPension, pensionInputFromPayslip } from "@/lib/pensionCalc";
import type { ExtractedPayslip } from "@/lib/payslipTypes";

const AGE_STORAGE_KEY = "nemtbudget_user_age";

interface Props {
  payslip: ExtractedPayslip;
}

export function PensionCheck({ payslip }: Props) {
  const { t } = useI18n();
  const { currencyLocale: lc } = useLocale();

  const [age, setAge] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(AGE_STORAGE_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const [ageInput, setAgeInput] = useState(age?.toString() ?? "");

  useEffect(() => {
    if (age !== null && age >= 18 && age <= 80) {
      try { localStorage.setItem(AGE_STORAGE_KEY, String(age)); } catch { /* */ }
    }
  }, [age]);

  const monthlyTotal = payslip.pensionEmployee + payslip.pensionEmployer;

  const projection = useMemo(() => {
    if (age === null || age < 18 || age > 80) return null;
    const input = pensionInputFromPayslip(payslip, age);
    return projectPension(input, payslip.nettolon);
  }, [payslip, age]);

  const healthColors = {
    red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  };

  const handleAgeSubmit = () => {
    const parsed = parseInt(ageInput);
    if (parsed >= 18 && parsed <= 80) setAge(parsed);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <PiggyBank className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("payslip.pension.title")}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Monthly contribution summary */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.pension.monthlyContribution")}
            </p>
            <p className="text-lg font-bold tabular-nums">{formatKr(monthlyTotal, lc)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.pension.youEmployer")}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatKr(payslip.pensionEmployee, lc)} / {formatKr(payslip.pensionEmployer, lc)}
            </p>
          </div>
        </div>

        {/* Age input */}
        {age === null ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <label className="text-xs text-muted-foreground shrink-0">
              {t("payslip.pension.yourAge")}
            </label>
            <input
              type="number"
              min={18}
              max={80}
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAgeSubmit()}
              placeholder="fx 32"
              className="w-16 px-2 py-1 rounded-md border border-border bg-background text-sm text-center tabular-nums"
            />
            <button
              onClick={handleAgeSubmit}
              className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
            >
              {t("payslip.pension.calculate")}
            </button>
          </div>
        ) : projection && (
          <>
            {/* Health indicator */}
            <div className={`p-3 rounded-lg ${healthColors[projection.health].bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${healthColors[projection.health].text}`}>
                  {t("payslip.pension.replacementRate")}: {projection.replacementRate}%
                </span>
                <button
                  onClick={() => { setAge(null); setAgeInput(""); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {t("payslip.pension.changeAge")}
                </button>
              </div>
              {/* Bar */}
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${healthColors[projection.health].bar}`}
                  style={{ width: `${Math.min(100, projection.replacementRate)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-muted-foreground/60">
                <span>0%</span>
                <span>50%</span>
                <span>70%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Projection numbers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">
                  {t("payslip.pension.projectedAt").replace("{age}", String(68))}
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatKr(projection.projectedTotal, lc)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">
                  {t("payslip.pension.monthlyPayout")}
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatKr(projection.monthlyPayout, lc)}
                </p>
                <p className="text-[9px] text-muted-foreground">{t("payslip.pension.over20years")}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">
                  {t("payslip.pension.yearsToRetirement")}
                </p>
                <p className="text-sm font-bold tabular-nums">{projection.yearsToRetirement}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {t("payslip.pension.returns")}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatKr(projection.investmentGrowth, lc)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Contextual CTA based on pension health */}
        {projection && (
          <a
            href="https://www.borger.dk/pension-og-efterloen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {projection.health === "red"
              ? t("payslip.pension.ctaLow")
              : projection.health === "amber"
                ? t("payslip.pension.ctaMedium")
                : t("payslip.pension.ctaBoost")}
          </a>
        )}

        <p className="text-[10px] text-muted-foreground/50">
          {t("payslip.pension.disclaimer")}
        </p>
      </div>
    </div>
  );
}

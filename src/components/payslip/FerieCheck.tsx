import { useMemo } from "react";
import { Palmtree, AlertTriangle, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateFeriepenge } from "@/lib/pensionCalc";
import type { ExtractedPayslip } from "@/lib/payslipTypes";

interface Props {
  payslip: ExtractedPayslip;
}

export function FerieCheck({ payslip }: Props) {
  const { t } = useI18n();
  const { currencyLocale: lc } = useLocale();

  const ferie = useMemo(() => calculateFeriepenge(payslip), [payslip]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Palmtree className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("payslip.ferie.title")}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.ferie.monthly")}
            </p>
            <p className="text-sm font-bold tabular-nums">{formatKr(ferie.monthlyAccrual, lc)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.ferie.daysPerMonth")}
            </p>
            <p className="text-sm font-bold tabular-nums">{ferie.daysPerMonth}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.ferie.annual")}
            </p>
            <p className="text-sm font-bold tabular-nums">{formatKr(ferie.annualTotal, lc)}</p>
          </div>
        </div>

        {/* Per-day value */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {t("payslip.ferie.valuePerDay")}
          </span>
          <span className="text-xs font-bold tabular-nums">{formatKr(ferie.krPerDay, lc)}</span>
        </div>

        {/* Total days bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">
              {t("payslip.ferie.totalDays").replace("{days}", String(ferie.totalDays))}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Expiry warning */}
        {ferie.showExpiryWarning && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t("payslip.ferie.expiryWarning")}
            </p>
          </div>
        )}

        {/* CTA — borger.dk feriekonto */}
        <a
          href="https://www.borger.dk/arbejde-dagpenge-ferie/ferie-og-fridage/feriepenge"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          {t("payslip.ferie.ctaCheck")}
        </a>

        {/* How it works */}
        <div className="space-y-1.5 text-[10px] text-muted-foreground/60 leading-relaxed">
          <p>
            {payslip.feriepengeHensaet
              ? t("payslip.ferie.sourcePayslip")
              : t("payslip.ferie.sourceCalc")}
          </p>
          <p>
            {t("payslip.ferie.lawNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

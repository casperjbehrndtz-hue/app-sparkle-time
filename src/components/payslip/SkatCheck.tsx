import { useMemo } from "react";
import { Calculator, ExternalLink, AlertTriangle, Check, ArrowDownCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import { estimateRestskat, taxInputFromPayslip, calculateAnnualTax } from "@/lib/danishTax";
import type { ExtractedPayslip } from "@/lib/payslipTypes";

interface Props {
  payslip: ExtractedPayslip;
}

export function SkatCheck({ payslip }: Props) {
  const { t } = useI18n();
  const { currencyLocale: lc } = useLocale();

  const result = useMemo(() => estimateRestskat(payslip), [payslip]);
  const taxResult = useMemo(() => calculateAnnualTax(taxInputFromPayslip(payslip)), [payslip]);

  const statusConfig = {
    ok: {
      icon: Check,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800/50",
    },
    refund: {
      icon: ArrowDownCircle,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/50",
    },
    owes: {
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
    },
  };

  const cfg = statusConfig[result.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("payslip.skat.title")}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Status badge */}
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${cfg.color}`}>
              {result.status === "ok" && t("payslip.skat.statusOk")}
              {result.status === "refund" && t("payslip.skat.statusRefund").replace("{amount}", formatKr(Math.abs(result.difference), lc))}
              {result.status === "owes" && t("payslip.skat.statusOwes").replace("{amount}", formatKr(result.difference, lc))}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.status === "owes" && t("payslip.skat.hintOwes")}
              {result.status === "refund" && t("payslip.skat.hintRefund")}
              {result.status === "ok" && t("payslip.skat.hintOk")}
            </p>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.skat.effectiveRate")}
            </p>
            <p className="text-sm font-bold tabular-nums">{taxResult.effectiveTaxRate}%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.skat.marginalRate")}
            </p>
            <p className="text-sm font-bold tabular-nums">{taxResult.marginalRate}%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.skat.municipalTax")}
            </p>
            <p className="text-sm font-bold tabular-nums">
              {taxResult.kommuneskatRate}%
              {payslip.municipality && (
                <span className="text-[10px] text-muted-foreground ml-1">({payslip.municipality})</span>
              )}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              {t("payslip.skat.annualTotal")}
            </p>
            <p className="text-sm font-bold tabular-nums">{formatKr(taxResult.totalSkat, lc)}</p>
          </div>
        </div>

        {/* Contextual CTA based on status */}
        {result.status !== "ok" && (
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-primary">
            {result.status === "owes"
              ? t("payslip.skat.ctaOwes")
              : t("payslip.skat.ctaRefund")}
          </div>
        )}

        {/* SKAT link */}
        <a
          href="https://skat.dk/borger/tastselv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          {t("payslip.skat.openTastSelv")}
        </a>

        <p className="text-[10px] text-muted-foreground/50">
          {t("payslip.skat.disclaimer")}
        </p>
      </div>
    </div>
  );
}

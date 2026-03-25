import { useState, useMemo } from "react";
import { ArrowLeft, ArrowLeftRight, Briefcase, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { usePageMeta } from "@/hooks/usePageMeta";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateAnnualTax, type TaxInput, type TaxResult } from "@/lib/danishTax";
import { getArchive } from "@/lib/payslipArchive";

interface JobInput {
  monthlyGross: number;
  pensionEmployeePct: number;
  pensionEmployerPct: number;
  friTelefon: boolean;
  sundhedsforsikring: boolean;
  frokost: boolean;
}

const BENEFIT_VALUES = {
  friTelefon: 325,    // monthly taxable value
  sundhedsforsikring: 150,
  frokost: 600,       // monthly estimated value (not taxable)
};

function jobToTaxInput(job: JobInput): TaxInput {
  const pensionEmployee = Math.round(job.monthlyGross * job.pensionEmployeePct / 100);
  const pensionEmployer = Math.round(job.monthlyGross * job.pensionEmployerPct / 100);
  return {
    monthlyGross: job.monthlyGross,
    pensionEmployee,
    pensionEmployer,
    atp: 99,
    churchTax: false,
  };
}

function ComparisonRow({ label, current, offer }: { label: string; current: string; offer: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-right">{current}</span>
      <span className="text-xs font-semibold tabular-nums text-right">{offer}</span>
    </div>
  );
}

function NumberInput({ label, value, onChange, suffix, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
        />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

export default function Jobskifte() {
  const { t } = useI18n();
  const { currencyLocale: lc } = useLocale();

  usePageMeta(
    t("jobskifte.pageTitle"),
    t("jobskifte.pageMeta"),
  );

  // Pre-fill from archive
  const latestArchive = useMemo(() => {
    const archive = getArchive();
    return archive.length > 0 ? archive[0] : null;
  }, []);

  const [currentJob, setCurrentJob] = useState<JobInput>(() => ({
    monthlyGross: latestArchive?.bruttolon ?? 0,
    pensionEmployeePct: latestArchive ? Math.round((latestArchive.pensionEmployee / latestArchive.bruttolon) * 100) : 4,
    pensionEmployerPct: latestArchive ? Math.round((latestArchive.pensionEmployer / latestArchive.bruttolon) * 100) : 8,
    friTelefon: false,
    sundhedsforsikring: false,
    frokost: false,
  }));

  const [newOffer, setNewOffer] = useState<JobInput>({
    monthlyGross: 0,
    pensionEmployeePct: 4,
    pensionEmployerPct: 8,
    friTelefon: false,
    sundhedsforsikring: false,
    frokost: false,
  });

  const canCompare = currentJob.monthlyGross > 0 && newOffer.monthlyGross > 0;

  const comparison = useMemo(() => {
    if (!canCompare) return null;

    const currentTax = calculateAnnualTax(jobToTaxInput(currentJob));
    const offerTax = calculateAnnualTax(jobToTaxInput(newOffer));

    // Benefits value (monthly, non-taxable)
    const currentBenefits = (currentJob.frokost ? BENEFIT_VALUES.frokost : 0);
    const offerBenefits = (newOffer.frokost ? BENEFIT_VALUES.frokost : 0);

    const currentTotal = currentTax.annualNet + currentTax.annualPensionTotal + currentBenefits * 12;
    const offerTotal = offerTax.annualNet + offerTax.annualPensionTotal + offerBenefits * 12;

    return {
      currentTax,
      offerTax,
      currentBenefits,
      offerBenefits,
      currentTotal,
      offerTotal,
      diff: offerTotal - currentTotal,
      monthlyDiff: Math.round((offerTotal - currentTotal) / 12),
    };
  }, [currentJob, newOffer, canCompare]);

  const updateCurrent = (key: keyof JobInput, value: number | boolean) =>
    setCurrentJob(prev => ({ ...prev, [key]: value }));
  const updateOffer = (key: keyof JobInput, value: number | boolean) =>
    setNewOffer(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/lonseddel" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-display font-bold">
              {t("jobskifte.heading")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("jobskifte.subtitle")}
            </p>
          </div>
        </div>

        {/* Input sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current job */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t("jobskifte.currentJob")}</span>
            </div>
            {latestArchive && currentJob.monthlyGross > 0 && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {t("jobskifte.prefilledFromPayslip")}
              </p>
            )}
            <NumberInput
              label={t("jobskifte.grossPerMonth")}
              value={currentJob.monthlyGross}
              onChange={v => updateCurrent("monthlyGross", v)}
              suffix="kr"
              min={0}
              step={1000}
            />
            <NumberInput
              label={t("jobskifte.yourPensionPct")}
              value={currentJob.pensionEmployeePct}
              onChange={v => updateCurrent("pensionEmployeePct", v)}
              suffix="%"
              min={0}
              max={30}
            />
            <NumberInput
              label={t("jobskifte.employerPensionPct")}
              value={currentJob.pensionEmployerPct}
              onChange={v => updateCurrent("pensionEmployerPct", v)}
              suffix="%"
              min={0}
              max={30}
            />
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={currentJob.frokost} onChange={e => updateCurrent("frokost", e.target.checked)} className="rounded" />
                {t("jobskifte.lunchPlan")} <span className="text-muted-foreground">(~{formatKr(BENEFIT_VALUES.frokost, lc)}/md)</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={currentJob.sundhedsforsikring} onChange={e => updateCurrent("sundhedsforsikring", e.target.checked)} className="rounded" />
                {t("jobskifte.healthInsurance")}
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={currentJob.friTelefon} onChange={e => updateCurrent("friTelefon", e.target.checked)} className="rounded" />
                {t("jobskifte.companyPhone")}
              </label>
            </div>
          </div>

          {/* New offer */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{t("jobskifte.newOffer")}</span>
            </div>
            <NumberInput
              label={t("jobskifte.grossPerMonth")}
              value={newOffer.monthlyGross}
              onChange={v => updateOffer("monthlyGross", v)}
              suffix="kr"
              min={0}
              step={1000}
            />
            <NumberInput
              label={t("jobskifte.yourPensionPct")}
              value={newOffer.pensionEmployeePct}
              onChange={v => updateOffer("pensionEmployeePct", v)}
              suffix="%"
              min={0}
              max={30}
            />
            <NumberInput
              label={t("jobskifte.employerPensionPct")}
              value={newOffer.pensionEmployerPct}
              onChange={v => updateOffer("pensionEmployerPct", v)}
              suffix="%"
              min={0}
              max={30}
            />
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newOffer.frokost} onChange={e => updateOffer("frokost", e.target.checked)} className="rounded" />
                {t("jobskifte.lunchPlan")} <span className="text-muted-foreground">(~{formatKr(BENEFIT_VALUES.frokost, lc)}/md)</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newOffer.sundhedsforsikring} onChange={e => updateOffer("sundhedsforsikring", e.target.checked)} className="rounded" />
                {t("jobskifte.healthInsurance")}
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newOffer.friTelefon} onChange={e => updateOffer("friTelefon", e.target.checked)} className="rounded" />
                {t("jobskifte.companyPhone")}
              </label>
            </div>
          </div>
        </div>

        {/* Comparison result */}
        {comparison && (
          <div className="rounded-xl border border-border bg-card overflow-hidden space-y-0">
            {/* Verdict banner */}
            <div className={`p-4 text-center ${
              comparison.diff > 500 ? "bg-emerald-50 dark:bg-emerald-950/30" :
              comparison.diff < -500 ? "bg-red-50 dark:bg-red-950/30" :
              "bg-muted/30"
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {comparison.diff > 500 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : comparison.diff < -500 ? (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-lg font-bold ${
                  comparison.diff > 500 ? "text-emerald-600 dark:text-emerald-400" :
                  comparison.diff < -500 ? "text-red-600 dark:text-red-400" :
                  "text-foreground"
                }`}>
                  {comparison.diff > 0 ? "+" : ""}{formatKr(comparison.monthlyDiff, lc)}/md
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {comparison.diff > 500
                  ? t("jobskifte.verdictBetter")
                  : comparison.diff < -500
                    ? t("jobskifte.verdictWorse")
                    : t("jobskifte.verdictSame")}
              </p>
            </div>

            {/* Detailed comparison */}
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border mb-1">
                <span className="text-[10px] text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground text-right font-semibold">
                  {t("jobskifte.colCurrent")}
                </span>
                <span className="text-[10px] text-primary text-right font-semibold">
                  {t("jobskifte.colOffer")}
                </span>
              </div>

              <ComparisonRow
                label={t("jobskifte.rowGross")}
                current={formatKr(currentJob.monthlyGross, lc)}
                offer={formatKr(newOffer.monthlyGross, lc)}
              />
              <ComparisonRow
                label={t("jobskifte.rowNet")}
                current={formatKr(comparison.currentTax.monthlyNet, lc)}
                offer={formatKr(comparison.offerTax.monthlyNet, lc)}
              />
              <ComparisonRow
                label={t("jobskifte.rowPension")}
                current={formatKr(Math.round(comparison.currentTax.annualPensionTotal / 12), lc)}
                offer={formatKr(Math.round(comparison.offerTax.annualPensionTotal / 12), lc)}
              />
              <ComparisonRow
                label={t("jobskifte.rowTax")}
                current={formatKr(comparison.currentTax.monthlyTax, lc)}
                offer={formatKr(comparison.offerTax.monthlyTax, lc)}
              />
              <ComparisonRow
                label={t("jobskifte.rowEffectiveTax")}
                current={`${comparison.currentTax.effectiveTaxRate}%`}
                offer={`${comparison.offerTax.effectiveTaxRate}%`}
              />
              <ComparisonRow
                label={t("jobskifte.rowTotalComp")}
                current={formatKr(comparison.currentTotal, lc)}
                offer={formatKr(comparison.offerTotal, lc)}
              />
            </div>
          </div>
        )}

        {!canCompare && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <ArrowLeftRight className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("jobskifte.fillBothPrompt")}
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center">
          {t("jobskifte.disclaimer")}
        </p>
      </div>
    </div>
  );
}

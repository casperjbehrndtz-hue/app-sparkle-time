import { useState, useMemo } from "react";
import { Check, AlertTriangle, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import type { ExtractedPayslip } from "@/lib/payslipTypes";

interface Props {
  payslip: ExtractedPayslip;
  onConfirm: (confirmed: ExtractedPayslip) => void;
  onRetry: () => void;
}

interface EditableRow {
  key: string;
  label: string;
  value: number;
  type: "income" | "deduction" | "info" | "meta";
}

export function PayslipVerification({ payslip, onConfirm, onRetry }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const [editing, setEditing] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [showAllLines, setShowAllLines] = useState(false);

  const rows = useMemo((): EditableRow[] => {
    const r: EditableRow[] = [];

    // ── Income ──
    r.push({ key: "bruttolon", label: t("payslip.deductions.gross"), value: payslip.bruttolon, type: "income" });
    if (payslip.payComponents.length > 1) {
      for (const pc of payslip.payComponents) {
        r.push({ key: `pc_${pc.name}`, label: pc.name, value: pc.amount, type: "info" });
      }
    }

    // ── Deductions ──
    if (payslip.amBidrag > 0) r.push({ key: "amBidrag", label: t("payslip.deductions.amBidrag"), value: payslip.amBidrag, type: "deduction" });
    if (payslip.pensionEmployee > 0) r.push({ key: "pensionEmployee", label: "Pension (din andel)", value: payslip.pensionEmployee, type: "deduction" });
    if (payslip.pensionEmployer > 0) r.push({ key: "pensionEmployer", label: "Pension (arbejdsgiver)", value: payslip.pensionEmployer, type: "info" });
    if (payslip.aSkat > 0) r.push({ key: "aSkat", label: t("payslip.deductions.aSkat"), value: payslip.aSkat, type: "deduction" });
    if (payslip.atp > 0) r.push({ key: "atp", label: t("payslip.deductions.atp"), value: payslip.atp, type: "deduction" });
    if (payslip.fagforening) r.push({ key: "fagforening", label: t("payslip.deductions.union"), value: payslip.fagforening, type: "deduction" });
    if (payslip.sundhedsforsikring) r.push({ key: "sundhedsforsikring", label: t("payslip.deductions.healthIns"), value: payslip.sundhedsforsikring, type: "deduction" });
    if (payslip.feriepengeHensaet) r.push({ key: "feriepengeHensaet", label: t("payslip.deductions.feriepenge"), value: payslip.feriepengeHensaet, type: "deduction" });

    for (const od of payslip.otherDeductions) {
      r.push({ key: `od_${od.name}`, label: od.name, value: od.amount, type: "deduction" });
    }

    // ── Result ──
    r.push({ key: "nettolon", label: t("payslip.deductions.net"), value: payslip.nettolon, type: "income" });

    // ── Tax metadata ──
    if (payslip.traekkort > 0) r.push({ key: "traekkort", label: t("payslip.tax.traekprocent"), value: payslip.traekkort, type: "meta" });
    if (payslip.personfradrag > 0) r.push({ key: "personfradrag", label: t("payslip.tax.personfradrag"), value: payslip.personfradrag, type: "meta" });

    return r;
  }, [payslip, t]);

  // Sanity checks — recompute when overrides change
  const checks = useMemo(() => {
    const issues: string[] = [];
    const b = overrides.bruttolon ?? payslip.bruttolon;
    const n = overrides.nettolon ?? payslip.nettolon;

    // payComponents vs brutto
    if (payslip.payComponents.length > 1) {
      const sum = payslip.payComponents.reduce((s, pc) => s + pc.amount, 0);
      if (Math.abs(sum - b) > 100) {
        issues.push(`Lønposterne summer til ${formatKr(sum, lc)} men bruttoløn er ${formatKr(b, lc)}. Tjek tallene.`);
      }
    }

    // AM-bidrag ≈ 8% of (brutto - employer pension)
    const am = overrides.amBidrag ?? payslip.amBidrag;
    const empPension = overrides.pensionEmployer ?? payslip.pensionEmployer;
    if (am > 0) {
      const amBase = b - empPension;
      const expectedAm = Math.round(amBase * 0.08);
      if (Math.abs(am - expectedAm) > 200) {
        issues.push(`AM-bidrag (${formatKr(am, lc)}) afviger fra forventet 8% (${formatKr(expectedAm, lc)}).`);
      }
    }

    if (n > b) {
      issues.push("Nettoløn er højere end bruttoløn — det kan ikke passe.");
    }

    const traek = overrides.traekkort ?? payslip.traekkort;
    if (traek > 0 && (traek < 30 || traek > 55)) {
      issues.push(`Trækprocent ${traek}% virker usandsynlig. Normal: 33-45%.`);
    }

    return issues;
  }, [payslip, overrides, lc]);

  const handleEdit = (key: string, value: string) => {
    const num = Math.round(Number(value.replace(/[^0-9]/g, "")));
    if (isFinite(num) && num >= 0) {
      setOverrides((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleConfirm = () => {
    const confirmed: ExtractedPayslip = {
      ...payslip,
      bruttolon: overrides.bruttolon ?? payslip.bruttolon,
      nettolon: overrides.nettolon ?? payslip.nettolon,
      amBidrag: overrides.amBidrag ?? payslip.amBidrag,
      aSkat: overrides.aSkat ?? payslip.aSkat,
      atp: overrides.atp ?? payslip.atp,
      pensionEmployee: overrides.pensionEmployee ?? payslip.pensionEmployee,
      pensionEmployer: overrides.pensionEmployer ?? payslip.pensionEmployer,
      traekkort: overrides.traekkort ?? payslip.traekkort,
      personfradrag: overrides.personfradrag ?? payslip.personfradrag,
      fagforening: overrides.fagforening ?? payslip.fagforening,
      sundhedsforsikring: overrides.sundhedsforsikring ?? payslip.sundhedsforsikring,
      feriepengeHensaet: overrides.feriepengeHensaet ?? payslip.feriepengeHensaet,
      // Strip debug warnings
      warnings: payslip.warnings.filter((w) => {
        const lower = w.toLowerCase();
        return !lower.includes("intern kode") &&
          !lower.includes("brutto-totallinje") &&
          !lower.includes("verificeret") &&
          !lower.includes("sanity check") &&
          !lower.includes("ukendt") &&
          !lower.includes("uden klare");
      }),
    };
    onConfirm(confirmed);
  };

  const getValue = (key: string, original: number) => overrides[key] ?? original;

  // Find where deductions start for the visual separator
  const firstDeductionIdx = rows.findIndex((r) => r.type === "deduction");
  const nettoIdx = rows.findIndex((r) => r.key === "nettolon");
  const metaStartIdx = rows.findIndex((r) => r.type === "meta");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">{t("payslip.verify.title")}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("payslip.verify.subtitle")}</p>
        </div>

        {/* Sanity warnings */}
        {checks.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {checks.map((c, i) => (
                  <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300">{c}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Editable rows */}
        <div className="p-4 space-y-0.5">
          {rows.map((row, idx) => {
            const isEditing = editing === row.key;
            const val = getValue(row.key, row.value);
            const isTotal = row.key === "bruttolon" || row.key === "nettolon";
            const isInfo = row.type === "info";
            const isMeta = row.type === "meta";
            const isPayComponent = row.key.startsWith("pc_");
            const isEditable = !isPayComponent && row.type !== "info";
            const isOverridden = overrides[row.key] !== undefined;

            // Visual separators
            const showDeductionSep = idx === firstDeductionIdx;
            const showNettoSep = idx === nettoIdx;
            const showMetaSep = idx === metaStartIdx;

            return (
              <div key={row.key}>
                {showDeductionSep && (
                  <div className="border-t border-dashed border-border/60 my-2 pt-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 font-semibold">Fradrag</span>
                  </div>
                )}
                {showNettoSep && <div className="border-t border-border my-2" />}
                {showMetaSep && (
                  <div className="border-t border-dashed border-border/60 my-2 pt-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/40 font-semibold">Skatteoplysninger</span>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                    isTotal ? "bg-muted/40 font-semibold" : isPayComponent ? "ml-4" : ""
                  } ${isEditing ? "ring-1 ring-primary" : isEditable ? "hover:bg-muted/20" : ""}`}
                >
                  <span className={`text-xs ${isInfo || isMeta ? "text-muted-foreground" : "text-foreground"} ${isPayComponent ? "text-muted-foreground" : ""}`}>
                    {row.label}
                    {isInfo && !isPayComponent && <span className="text-[9px] text-muted-foreground/60 ml-1">(vises kun)</span>}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={String(val)}
                        autoFocus
                        className="w-24 text-right text-xs font-mono bg-background border border-border rounded px-2 py-1"
                        onBlur={(e) => { handleEdit(row.key, e.target.value); setEditing(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { handleEdit(row.key, (e.target as HTMLInputElement).value); setEditing(null); } }}
                      />
                    ) : (
                      <>
                        <span className={`text-xs font-mono tabular-nums ${
                          row.type === "deduction" ? "text-red-600 dark:text-red-400" :
                          row.key === "nettolon" ? "text-emerald-600 dark:text-emerald-400" :
                          isMeta ? "text-muted-foreground" :
                          "text-foreground"
                        }`}>
                          {row.type === "deduction" ? "-" : ""}{isMeta ? val + "%" : formatKr(val, lc)}
                          {isOverridden && <span className="text-[9px] text-primary ml-1">*</span>}
                        </span>
                        {isEditable && (
                          <button
                            onClick={() => setEditing(row.key)}
                            className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Raw receipt lines */}
        {payslip.receiptLines.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowAllLines(!showAllLines)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              <span>{t("payslip.verify.rawLines")} ({payslip.receiptLines.length})</span>
              {showAllLines ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAllLines && (
              <div className="px-4 pb-3 space-y-0.5">
                {payslip.receiptLines.map((line, i) => (
                  <div key={i} className={`flex justify-between py-1 text-[10px] font-mono ${
                    line.type === "redacted" ? "text-muted-foreground/30" :
                    line.type === "subtotal" ? "text-muted-foreground font-semibold border-t border-border/50 pt-1.5" :
                    line.type === "deduction" ? "text-red-500/70 dark:text-red-400/70" :
                    line.type === "income" ? "text-foreground/70" :
                    "text-muted-foreground/60"
                  }`}>
                    <span className="truncate mr-2">{line.type === "redacted" ? "████████" : line.label}</span>
                    <span className="tabular-nums shrink-0">{line.type === "redacted" ? "████████" : line.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context chips */}
      {(payslip.anonDescription || payslip.payPeriod) && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {payslip.anonDescription && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
              {payslip.anonDescription}
            </span>
          )}
          {payslip.payPeriod && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
              {payslip.payPeriod}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            payslip.confidence === "high" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
            payslip.confidence === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {t(`payslip.result.confidence${payslip.confidence.charAt(0).toUpperCase() + payslip.confidence.slice(1)}`)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
        >
          {t("payslip.verify.retry")}
        </button>
        <button
          onClick={handleConfirm}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {t("payslip.verify.confirm")}
        </button>
      </div>
    </div>
  );
}

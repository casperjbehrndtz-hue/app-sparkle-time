import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Shield, Loader2, RotateCcw, ArrowLeft, Clipboard, Lock, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePayslipOCR } from "@/hooks/usePayslipOCR";
import { PayslipVerification } from "@/components/payslip/PayslipVerification";
import { PayslipResult } from "@/components/payslip/PayslipResult";
import { payslipToProfile } from "@/lib/payslipTypes";
import type { ExtractedPayslip } from "@/lib/payslipTypes";
import type { BudgetProfile } from "@/lib/types";

const PREFILL_KEY = "nb_payslip_prefill";

function PrivacyDetails({ t }: { t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const steps = [
    { icon: Lock, title: t("payslip.privacyDetail.step1.title"), desc: t("payslip.privacyDetail.step1.desc") },
    { icon: Eye, title: t("payslip.privacyDetail.step2.title"), desc: t("payslip.privacyDetail.step2.desc") },
    { icon: Trash2, title: t("payslip.privacyDetail.step3.title"), desc: t("payslip.privacyDetail.step3.desc") },
    { icon: Shield, title: t("payslip.privacyDetail.step4.title"), desc: t("payslip.privacyDetail.step4.desc") },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">{t("payslip.privacyDetail.title")}</span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/40">
            <div className="space-y-3 pt-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <step.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-border/60 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-semibold text-foreground">{step.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-3 space-y-2">
              <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                {t("payslip.privacyDetail.honest")}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                {t("payslip.privacyDetail.noHumans")}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              {t("payslip.privacyDetail.source")}
            </p>
          </div>
        )}
      </div>
      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed px-1">
        {t("payslip.privacyDetail.disclaimer")}
      </p>
    </div>
  );
}

export default function Lonseddel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { result: ocrResult, isProcessing, error, processPayslip, reset: ocrReset } = usePayslipOCR();
  const [confirmedResult, setConfirmedResult] = useState<ExtractedPayslip | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    ocrReset();
    setConfirmedResult(null);
  }, [ocrReset]);

  usePageMeta(
    t("payslip.meta.title"),
    t("payslip.meta.description"),
  );

  const handleFile = useCallback((file: File) => {
    processPayslip(file);
  }, [processPayslip]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Global paste handler — Ctrl+V anywhere on the page
  useEffect(() => {
    if (ocrResult || confirmedResult || isProcessing) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/") || item.type === "application/pdf") {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile, ocrResult, confirmedResult, isProcessing]);

  const handleCreateBudget = useCallback((partial: Partial<BudgetProfile>) => {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(partial));
    navigate("/");
  }, [navigate]);

  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            nemtbudget.nu
          </a>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Title — marketing on landing, data-focused on result */}
        {!ocrResult && !confirmedResult && (
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t("payslip.landing.headline")}</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("payslip.landing.subheadline")}</p>
            <p className="text-[10px] text-muted-foreground/50">{t("payslip.landing.socialProof")}</p>
          </div>
        )}

        {/* State: Upload */}
        {!ocrResult && !confirmedResult && !isProcessing && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full transition-colors ${dragOver ? "bg-primary/10" : "bg-muted"}`}>
                  <Upload className={`w-6 h-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("payslip.dropzone")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("payslip.pasteHint")}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("payslip.acceptedFormats")}</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-center">
                <p className="text-xs text-red-700 dark:text-red-300">{t(error)}</p>
                <button
                  onClick={reset}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                >
                  {t("payslip.cta.retry")}
                </button>
              </div>
            )}

            {/* Privacy summary */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("payslip.privacy")}
              </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { icon: Upload, label: t("payslip.step1") },
                { icon: FileText, label: t("payslip.step2") },
                { icon: Shield, label: t("payslip.step3") },
              ].map((step, i) => (
                <div key={i} className="text-center space-y-1.5">
                  <div className="mx-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <step.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
                </div>
              ))}
            </div>

            {/* Detailed privacy section */}
            <PrivacyDetails t={t} />
          </>
        )}

        {/* State: Processing */}
        {isProcessing && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <div>
              <p className="text-sm font-medium">{t("payslip.processing")}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("payslip.processingHint")}</p>
            </div>
          </div>
        )}

        {/* State: Verification — user confirms OCR data before analysis */}
        {ocrResult && !confirmedResult && (
          <PayslipVerification
            payslip={ocrResult}
            onConfirm={setConfirmedResult}
            onRetry={reset}
          />
        )}

        {/* State: Result — only after user confirms */}
        {confirmedResult && (
          <>
            <PayslipResult payslip={confirmedResult} onCreateBudget={handleCreateBudget} />

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t("payslip.cta.retry")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

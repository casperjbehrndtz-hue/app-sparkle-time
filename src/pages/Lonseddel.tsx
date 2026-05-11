import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Shield, Loader2, RotateCcw, ArrowLeft, Smartphone, Bot, Trash2, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePayslipOCR } from "@/hooks/usePayslipOCR";
import OcrConsentModal from "@/components/OcrConsentModal";
import { PayslipVerification } from "@/components/payslip/PayslipVerification";
import { PayslipResult } from "@/components/payslip/PayslipResult";
import { payslipToProfile } from "@/lib/payslipTypes";
import type { ExtractedPayslip } from "@/lib/payslipTypes";
import type { BudgetProfile } from "@/lib/types";

const PREFILL_KEY = "nb_payslip_prefill";

function DataJourney({ t }: { t: (key: string) => string }) {
  const steps = [
    { icon: Smartphone, label: t("payslip.journey.step1"), detail: t("payslip.journey.step1Detail") },
    { icon: Bot, label: t("payslip.journey.step2"), detail: t("payslip.journey.step2Detail") },
    { icon: Trash2, label: t("payslip.journey.step3"), detail: t("payslip.journey.step3Detail") },
  ];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="w-3 h-3 text-foreground/60" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t("payslip.journey.title")}</span>
      </div>
      <div className="border border-border bg-card divide-y divide-border">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2">
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums mt-0.5">0{i + 1}</span>
            <step.icon className="w-3.5 h-3.5 text-foreground/60 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 leading-snug mt-2">
        {t("payslip.journey.honest")} {t("payslip.journey.disclaimer")}
      </p>
    </div>
  );
}

export default function Lonseddel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { result: ocrResult, diagnostics, isProcessing, error, statusMessage, showConsent, onConsentAccept, onConsentDecline, consentPreview, consentCprCount, consentAccountCount, consentIsPdf, processPayslip, reset: ocrReset } = usePayslipOCR();
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
    <main id="main-content" className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            nemtbudget.nu
          </a>
          <a href="/lonudvikling" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-3 h-3" />
            {t("timeline.title")}
          </a>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Title */}
        {!ocrResult && !confirmedResult && (
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">{t("payslip.landing.headline")}</h1>
            <p className="text-sm text-muted-foreground leading-snug">{t("payslip.landing.subheadline")}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{t("payslip.landing.socialProof")}</p>
          </div>
        )}

        {/* State: Upload */}
        {!ocrResult && !confirmedResult && !isProcessing && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label={t("payslip.dropzone")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
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
              <div className="flex items-center gap-3">
                <Upload className={`w-5 h-5 shrink-0 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">{t("payslip.dropzone")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("payslip.pasteHint")} · {t("payslip.acceptedFormats")}</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="status" aria-live="assertive" className="p-3 border border-destructive/30 bg-destructive/5">
                <p className="text-xs text-destructive">{t(error)}</p>
                <button onClick={reset} className="mt-1 text-xs text-destructive hover:underline">
                  {t("payslip.cta.retry")}
                </button>
              </div>
            )}

            {/* Privacy — single inline note instead of bordered box */}
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <Shield className="w-3 h-3 mt-0.5 shrink-0" />
              {t("payslip.privacy")}
            </p>

            {/* Data journey — only this, no duplicate "How it works" */}
            <DataJourney t={t} />
          </>
        )}

        {/* State: Processing */}
        {isProcessing && (
          <div role="status" aria-live="polite" className="py-16 text-center space-y-4">
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
            diagnostics={diagnostics}
            onConfirm={setConfirmedResult}
            onRetry={reset}
          />
        )}

        {/* State: Result — only after user confirms */}
        {confirmedResult && (
          <>
            <PayslipResult payslip={confirmedResult} diagnostics={diagnostics} onCreateBudget={handleCreateBudget} />

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-none text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t("payslip.cta.retry")}
            </button>
          </>
        )}
      </div>
      <OcrConsentModal
        open={showConsent}
        type="payslip"
        redactedPreview={consentPreview ?? undefined}
        cprCount={consentCprCount}
        accountCount={consentAccountCount}
        isPdf={consentIsPdf}
        onAccept={onConsentAccept}
        onDecline={onConsentDecline}
      />
    </main>
  );
}

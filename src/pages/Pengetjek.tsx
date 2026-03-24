import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Shield, Loader2, RotateCcw, ArrowLeft, Smartphone, Bot, Trash2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBankStatementOCR } from "@/hooks/useBankStatementOCR";
import OcrConsentModal from "@/components/OcrConsentModal";
import { PengetjekResult } from "@/components/pengetjek/PengetjekResult";
import type { BudgetProfile } from "@/lib/types";

const PREFILL_KEY = "nb_pengetjek_prefill";

function DataJourney({ t }: { t: (key: string) => string }) {
  const steps = [
    { icon: Smartphone, label: t("pengetjek.journey.step1"), detail: t("pengetjek.journey.step1Detail") },
    { icon: Bot, label: t("pengetjek.journey.step2"), detail: t("pengetjek.journey.step2Detail") },
    { icon: Trash2, label: t("pengetjek.journey.step3"), detail: t("pengetjek.journey.step3Detail") },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">{t("pengetjek.journey.title")}</span>
        </div>

        <div className="flex items-start gap-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-1.5">
                  <step.icon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <p className="text-[11px] font-medium text-foreground leading-tight">{step.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{step.detail}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-3 shrink-0 mx-0.5" />
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
          {t("pengetjek.journey.honest")}
        </p>
      </div>
    </div>
  );
}

export default function Pengetjek() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { analysis, raw, isProcessing, error, statusMessage, showConsent, onConsentAccept, onConsentDecline, processFile, reset } = useBankStatementOCR();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePageMeta(
    t("pengetjek.meta.title"),
    t("pengetjek.meta.description"),
  );

  const handleFile = useCallback((file: File) => {
    processFile(file);
  }, [processFile]);

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

  // Global paste handler
  useEffect(() => {
    if (analysis || isProcessing) return;

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
  }, [handleFile, analysis, isProcessing]);

  const handleCreateBudget = useCallback(() => {
    if (!analysis) return;

    // Map statement analysis to budget profile fields
    const partial: Partial<BudgetProfile> = {};
    for (const cat of analysis.categories) {
      switch (cat.kategori) {
        case "Mad": partial.foodAmount = cat.total; break;
        case "Restaurant": partial.restaurantAmount = cat.total; break;
        case "Fritid": partial.leisureAmount = cat.total; break;
        case "Tøj": partial.clothingAmount = cat.total; break;
        case "Sundhed": partial.healthAmount = cat.total; break;
      }
    }

    // Map detected subscriptions to toggles
    for (const sub of analysis.abonnementer) {
      const lower = sub.name.toLowerCase();
      if (lower.includes("netflix")) partial.hasNetflix = true;
      else if (lower.includes("spotify")) partial.hasSpotify = true;
      else if (lower.includes("hbo")) partial.hasHBO = true;
      else if (lower.includes("viaplay")) partial.hasViaplay = true;
      else if (lower.includes("disney")) partial.hasDisney = true;
      else if (lower.includes("apple tv")) partial.hasAppleTV = true;
      else if (lower.includes("amazon")) partial.hasAmazonPrime = true;
      else if (lower.includes("fitness")) {
        partial.hasFitness = true;
        partial.fitnessAmount = sub.amount;
      }
    }

    // Detect income
    if (analysis.totalIndkomst > 0) {
      partial.income = analysis.totalIndkomst;
    }

    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(partial));
    navigate("/");
  }, [analysis, navigate]);

  return (
    <main id="main-content" className="min-h-screen bg-background">
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
        {/* Title — marketing on landing */}
        {!analysis && !isProcessing && (
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t("pengetjek.landing.headline")}</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("pengetjek.landing.subheadline")}</p>
          </div>
        )}

        {/* State: Upload */}
        {!analysis && !isProcessing && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label={t("pengetjek.dropzone")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
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
                accept="image/jpeg,image/png,image/webp,application/pdf,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full transition-colors ${dragOver ? "bg-primary/10" : "bg-muted"}`}>
                  <Upload className={`w-6 h-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("pengetjek.dropzone")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("pengetjek.pasteHint")}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("pengetjek.acceptedFormats")}</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="status" aria-live="assertive" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-center">
                <p className="text-xs text-red-700 dark:text-red-300">{t(error) !== error ? t(error) : error}</p>
                <button
                  onClick={reset}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                >
                  {t("pengetjek.cta.retry")}
                </button>
              </div>
            )}

            {/* Privacy summary */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("pengetjek.privacy.summary")}
              </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { icon: Upload, label: t("pengetjek.step1") },
                { icon: FileText, label: t("pengetjek.step2") },
                { icon: Shield, label: t("pengetjek.step3") },
              ].map((step, i) => (
                <div key={i} className="text-center space-y-1.5">
                  <div className="mx-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <step.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
                </div>
              ))}
            </div>

            <DataJourney t={t} />
          </>
        )}

        {/* State: Processing */}
        {isProcessing && (
          <div role="status" aria-live="polite" className="py-16 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <div>
              <p className="text-sm font-medium">{t("pengetjek.processing")}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("pengetjek.processingHint")}</p>
            </div>
          </div>
        )}

        {/* State: Results */}
        {analysis && raw && (
          <>
            <PengetjekResult
              analysis={analysis}
              transactions={raw.transaktioner}
              truncated={raw.truncated}
              onCreateBudget={handleCreateBudget}
            />

            {/* Cross-promote lønseddel for combo effect */}
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">{t("pengetjek.crossPromo.title")}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{t("pengetjek.crossPromo.desc")}</p>
              <a
                href="/lonseddel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {t("pengetjek.crossPromo.cta")}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t("pengetjek.cta.retry")}
            </button>
          </>
        )}
      </div>
      <OcrConsentModal
        open={showConsent}
        type="bank"
        onAccept={onConsentAccept}
        onDecline={onConsentDecline}
      />
    </main>
  );
}

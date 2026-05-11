import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Shield, Loader2, RotateCcw, ArrowLeft, Smartphone, Bot, Trash2 } from "lucide-react";
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
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="w-3 h-3 text-foreground/60" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t("pengetjek.journey.title")}</span>
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
      <p className="text-[10px] text-muted-foreground/60 leading-snug mt-2">{t("pengetjek.journey.honest")}</p>
    </div>
  );
}

export default function Pengetjek() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { analysis, raw, isProcessing, error, statusMessage, showConsent, onConsentAccept, onConsentDecline, consentPreview, consentCprCount, consentAccountCount, consentIsPdf, processFile, reset } = useBankStatementOCR();
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

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Title */}
        {!analysis && !isProcessing && (
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">{t("pengetjek.landing.headline")}</h1>
            <p className="text-sm text-muted-foreground leading-snug">{t("pengetjek.landing.subheadline")}</p>
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
              className={`relative cursor-pointer border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
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
              <div className="flex items-center gap-3">
                <Upload className={`w-5 h-5 shrink-0 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">{t("pengetjek.dropzone")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("pengetjek.pasteHint")} · {t("pengetjek.acceptedFormats")}</p>
                </div>
              </div>
            </div>

            {error && (
              <div role="status" aria-live="assertive" className="p-3 border border-destructive/30 bg-destructive/5">
                <p className="text-xs text-destructive">{t(error) !== error ? t(error) : error}</p>
                <button onClick={reset} className="mt-1 text-xs text-destructive hover:underline">
                  {t("pengetjek.cta.retry")}
                </button>
              </div>
            )}

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <Shield className="w-3 h-3 mt-0.5 shrink-0" />
              {t("pengetjek.privacy.summary")}
            </p>

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

            {/* Cross-promote lønseddel */}
            <div className="border border-border bg-muted/30 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground mb-0.5">{t("pengetjek.crossPromo.title")}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{t("pengetjek.crossPromo.desc")}</p>
              </div>
              <a
                href="/lonseddel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {t("pengetjek.crossPromo.cta")}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-none text-xs text-muted-foreground hover:bg-muted transition-colors"
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

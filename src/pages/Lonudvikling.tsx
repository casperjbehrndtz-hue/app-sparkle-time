/**
 * /lonudvikling — Salary Development page
 *
 * Upload multiple payslips from different years and get an automatic
 * salary progression chart. Uses the same OCR pipeline and security
 * components (CPR redaction, consent modal) as the single payslip flow.
 *
 * Also pulls in any previously archived payslips from localStorage.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Loader2,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePayslipBatchOCR } from "@/hooks/usePayslipBatchOCR";
import BatchConsentGallery from "@/components/BatchConsentGallery";
import { SalaryTimeline } from "@/components/payslip/SalaryTimeline";
import { archivePayslip, getArchive, type ArchivedPayslip } from "@/lib/payslipArchive";
import Logo from "@/components/shared/Logo";

export default function Lonudvikling() {
  const { t, lang } = useI18n();
  const {
    results,
    progress,
    processBatch,
    reset: batchReset,
    showBatchConsent,
    redactedFiles,
    toggleFileExclusion,
    onBatchAccept,
    onBatchDecline,
  } = usePayslipBatchOCR();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [archived, setArchived] = useState<ArchivedPayslip[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const archivedCount = useRef(0);

  usePageMeta(
    t("timeline.meta.title"),
    t("timeline.meta.description"),
  );

  // Load existing archive
  useEffect(() => {
    setArchived(getArchive());
  }, []);

  // Archive only NEW successful results (skip already-archived ones)
  useEffect(() => {
    const successful = results.filter((r) => r.payslip);
    if (successful.length <= archivedCount.current) return;

    const newOnes = successful.slice(archivedCount.current);
    for (const r of newOnes) {
      if (r.payslip) archivePayslip(r.payslip);
    }
    archivedCount.current = successful.length;
    setArchived(getArchive());
  }, [results]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 10); // Max 10 (OCR rate limit)
    setSelectedFiles(arr);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const startProcessing = useCallback(() => {
    if (selectedFiles.length > 0) {
      processBatch(selectedFiles);
    }
  }, [selectedFiles, processBatch]);

  const handleReset = useCallback(() => {
    batchReset();
    setSelectedFiles([]);
    archivedCount.current = 0;
    setArchived(getArchive());
  }, [batchReset]);

  const isProcessing = progress.phase !== "idle" && progress.phase !== "done";
  const isDone = progress.phase === "done";
  const successCount = results.filter((r) => r.payslip).length;

  return (
    <main id="main-content" className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </a>
          <Link
            to="/lonseddel"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("timeline.singlePayslip")}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("timeline.headline")}</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("timeline.subheadline")}
          </p>
        </div>

        {/* State: File selection (no processing yet) */}
        {!isProcessing && !isDone && (
          <>
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label={t("timeline.dropzone")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
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
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full transition-colors ${dragOver ? "bg-primary/10" : "bg-muted"}`}>
                  <Upload className={`w-6 h-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("timeline.dropzone")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("timeline.dropzoneHint")}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("timeline.acceptedFormats")}</p>
                </div>
              </div>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-semibold">
                    {selectedFiles.length} {t("timeline.filesSelected")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[10px] text-muted-foreground"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {f.name.length > 25 ? f.name.slice(0, 22) + "…" : f.name}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startProcessing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  {t("timeline.startProcessing")}
                </button>
              </div>
            )}

            {/* Privacy / security info */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("timeline.privacy")}
              </p>
            </div>

            {/* Show existing timeline if we have archived data */}
            {archived.length >= 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("timeline.existingData")}</p>
                </div>
                <SalaryTimeline payslips={archived} />
              </div>
            )}
          </>
        )}

        {/* State: Processing */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <div>
                <p className="text-sm font-medium">
                  {t("timeline.processing")} ({progress.current}/{progress.total})
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {progress.currentFileName}
                  {progress.phase === "redacting" && ` — ${t("timeline.phaseRedacting")}`}
                  {progress.phase === "reviewing" && ` — ${t("timeline.phaseConsent")}`}
                  {progress.phase === "scanning" && ` — ${t("timeline.phaseScanning")}`}
                </p>
              </div>
            </div>

            {/* Results so far */}
            {results.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.payslip ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    <span className="text-muted-foreground truncate">{r.fileName}</span>
                    {r.payslip?.payPeriod && (
                      <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                        {r.payslip.payPeriod}
                      </span>
                    )}
                    {r.error && (
                      <span className="text-[10px] text-red-500 ml-auto shrink-0">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* State: Done */}
        {isDone && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">
                {t("timeline.doneTitle").replace("{n}", String(successCount))}
              </p>
              {results.some((r) => r.error && r.error !== "Sprunget over") && (
                <p className="text-[10px] text-muted-foreground">
                  {results.filter((r) => r.error).length} {t("timeline.failed")}
                </p>
              )}
            </div>

            {/* Results list — sorted chronologically */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold mb-2">{t("timeline.resultList")}</p>
              {[...results]
                .sort((a, b) => {
                  // Successful payslips sorted by period, errors last
                  if (a.payslip && b.payslip) return (a.payslip.payPeriod ?? "").localeCompare(b.payslip.payPeriod ?? "");
                  if (a.payslip) return -1;
                  if (b.payslip) return 1;
                  return 0;
                })
                .map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.payslip ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate">{r.fileName}</span>
                  {r.payslip?.payPeriod && (
                    <span className="text-[10px] font-medium text-foreground ml-auto shrink-0">
                      {r.payslip.payPeriod}
                    </span>
                  )}
                  {r.error && (
                    <span className="text-[10px] text-red-500 ml-auto shrink-0">{r.error}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline chart */}
            {archived.length >= 2 && <SalaryTimeline payslips={archived} />}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("timeline.uploadMore")}
              </button>
              <Link
                to="/lonseddel"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {t("timeline.analyzeLatest")}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Batch consent gallery — shows all redacted images for single approval */}
      <BatchConsentGallery
        open={showBatchConsent}
        files={redactedFiles}
        onToggleFile={toggleFileExclusion}
        onAccept={onBatchAccept}
        onDecline={onBatchDecline}
      />
    </main>
  );
}

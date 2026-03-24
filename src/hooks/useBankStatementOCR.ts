import { useState, useCallback } from "react";
import { parseBankStatementResponse, type BankStatementRaw, type StatementAnalysis } from "@/lib/bankStatementTypes";
import { parseCSV } from "@/lib/csvParser";
import { analyzeStatement } from "@/lib/statementAnalyzer";
import { compressImage } from "@/lib/imageUtils";
import { redactSensitiveData, flattenRedaction, terminateRedactWorker, type RedactionResult, type RedactionRect } from "@/lib/cprRedact";
import type { BudgetProfile } from "@/lib/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Read file as text for CSV parsing */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Kunne ikke læse filen"));
    reader.readAsText(file, "utf-8");
  });
}

function isCSV(file: File): boolean {
  if (file.type === "text/csv" || file.type === "application/csv") return true;
  if (file.name.toLowerCase().endsWith(".csv")) return true;
  if (file.name.toLowerCase().endsWith(".tsv")) return true;
  return false;
}

export function useBankStatementOCR() {
  const [raw, setRaw] = useState<BankStatementRaw | null>(null);
  const [analysis, setAnalysis] = useState<StatementAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Consent state — caller renders OcrConsentModal
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // Redaction review state
  const [redactionReview, setRedactionReview] = useState<RedactionResult | null>(null);
  const [fallbackPreview, setFallbackPreview] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setRaw(null);
    setAnalysis(null);
    setRedactionReview(null);
    setFallbackPreview(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("pengetjek.error.tooLarge");
      return;
    }

    // ── CSV path: parse client-side (free, no AI, no consent needed) ──
    if (isCSV(file)) {
      setIsProcessing(true);
      try {
        const content = await readFileAsText(file);
        const parsed = parseCSV(content);

        if (!parsed || parsed.transaktioner.length === 0) {
          setError("pengetjek.error.csvParseFailed");
          return;
        }

        setRaw(parsed);
        setAnalysis(analyzeStatement(parsed));
      } catch {
        setError("pengetjek.error.csvParseFailed");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ── Image/PDF path: needs consent ──
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("pengetjek.error.invalidType");
      return;
    }

    // For images: run auto-redaction, then go straight to consent with preview
    if (file.type !== "application/pdf") {
      setIsProcessing(true);
      setStatusMessage("cpr.redacting");
      try {
        const redacted = await redactSensitiveData(file);
        terminateRedactWorker();
        if (redacted) {
          setRedactionReview(redacted);
          setPendingFile(file);
          setShowConsent(true);
        } else {
          try {
            const compressed = await compressImage(file);
            setFallbackPreview(compressed.base64);
          } catch { /* truly broken */ }
          setPendingFile(file);
          setShowConsent(true);
        }
      } catch {
        try {
          const compressed = await compressImage(file);
          setFallbackPreview(compressed.base64);
        } catch { /* truly broken */ }
        setPendingFile(file);
        setShowConsent(true);
      } finally {
        setIsProcessing(false);
        setStatusMessage(null);
      }
      return;
    }

    // PDFs: no preview possible, go to consent
    setPendingFile(file);
    setShowConsent(true);
  }, []);

  const onRedactionApprove = useCallback(
    (manualRects: RedactionRect[]) => {
      if (!redactionReview) return;
      setRedactionReview((prev) => (prev ? { ...prev, _manualRects: manualRects } as RedactionResult & { _manualRects: RedactionRect[] } : null));
      setShowConsent(true);
    },
    [redactionReview],
  );

  const onRedactionCancel = useCallback(() => {
    setRedactionReview(null);
  }, []);

  const onConsentDecline = useCallback(() => {
    setPendingFile(null);
    setRedactionReview(null);
    setShowConsent(false);
  }, []);

  const onConsentAccept = useCallback(async () => {
    const file = pendingFile;
    const review = redactionReview as (RedactionResult & { _manualRects?: RedactionRect[] }) | null;
    setShowConsent(false);
    setPendingFile(null);
    setRedactionReview(null);
    if (!file && !review) return;

    setIsProcessing(true);

    try {
      let base64: string;
      let mimeType: string;

      if (review) {
        const manualRects = review._manualRects || [];
        if (manualRects.length > 0) {
          base64 = await flattenRedaction(
            review.originalDataUrl,
            review.autoRects,
            manualRects,
            review.width,
            review.height,
          );
        } else {
          base64 = review.base64;
        }
        mimeType = review.mimeType;
        console.info(
          `CPR redaction: ${review.cprCount} CPR, ${review.accountCount} account, ${manualRects.length} manual`,
        );
      } else if (file && file.type !== "application/pdf") {
        const compressed = await compressImage(file);
        base64 = compressed.base64;
        mimeType = compressed.mimeType;
      } else if (file) {
        const compressed = await compressImage(file);
        base64 = compressed.base64;
        mimeType = compressed.mimeType;
      } else {
        return;
      }

      // Send redacted image to AI
      setStatusMessage("pengetjek.scanning");

      const callOCR = async (): Promise<Response> => {
        return fetch(`${SUPABASE_URL}/functions/v1/bank-statement-ocr`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64, mimeType }),
        });
      };

      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await callOCR();

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error(`Bank statement OCR error (attempt ${attempt + 1}):`, res.status, body);
            lastError = body.detail || body.error || `HTTP ${res.status}`;
            if (res.status >= 400 && res.status < 500 && res.status !== 422) {
              throw new Error(lastError);
            }
            continue;
          }

          const rawJson = await res.json();
          const parsed = parseBankStatementResponse(rawJson);

          if (!parsed || parsed.transaktioner.length === 0) {
            lastError = "Ingen transaktioner fundet";
            console.warn(`Bank statement parse failed (attempt ${attempt + 1}).`, lastError);
            continue;
          }

          setRaw(parsed);
          setAnalysis(analyzeStatement(parsed));
          return;
        } catch (innerErr) {
          lastError = innerErr instanceof Error ? innerErr.message : "Ukendt fejl";
          if (attempt === 0) {
            console.warn("Bank statement OCR attempt 1 failed, retrying...", lastError);
          }
        }
      }

      console.error("Bank statement OCR failed after 2 attempts:", lastError);
      setError(lastError ? `Fejl: ${lastError}` : "pengetjek.error.readFailed");
    } catch (err) {
      console.error("Bank statement OCR error:", err);
      const detail = err instanceof Error ? err.message : "";
      setError(detail ? `Fejl: ${detail}` : "pengetjek.error.readFailed");
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  }, [pendingFile, redactionReview]);

  /** Re-run analysis with budget profile for comparison */
  const analyzeWithBudget = useCallback((profile: BudgetProfile) => {
    if (!raw) return;
    setAnalysis(analyzeStatement(raw, profile));
  }, [raw]);

  const reset = useCallback(() => {
    setRaw(null);
    setAnalysis(null);
    setError(null);
    setIsProcessing(false);
    setStatusMessage(null);
    setRedactionReview(null);
    setFallbackPreview(null);
  }, []);

  const previewBase64 = redactionReview?.base64 ?? fallbackPreview ?? undefined;

  return {
    raw,
    analysis,
    isProcessing,
    error,
    statusMessage,
    showConsent,
    onConsentAccept,
    onConsentDecline,
    redactionReview,
    onRedactionApprove,
    onRedactionCancel,
    previewBase64,
    processFile,
    analyzeWithBudget,
    reset,
  };
}

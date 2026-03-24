import { useState, useCallback } from "react";
import { parsePayslipResponse, type ExtractedPayslip } from "@/lib/payslipTypes";
import { reconcilePayslip, type ReconciliationDiagnostics } from "@/lib/payslipReconciler";
import { compressImage } from "@/lib/imageUtils";
import { redactSensitiveData, flattenRedaction, terminateRedactWorker, type RedactionResult, type RedactionRect } from "@/lib/cprRedact";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function usePayslipOCR() {
  const [result, setResult] = useState<ExtractedPayslip | null>(null);
  const [diagnostics, setDiagnostics] = useState<ReconciliationDiagnostics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Consent state — caller renders OcrConsentModal
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // Redaction review state
  const [redactionReview, setRedactionReview] = useState<RedactionResult | null>(null);
  // Preview base64 shown in consent modal — set explicitly alongside showConsent
  const [consentPreview, setConsentPreview] = useState<string | null>(null);
  const [consentCprCount, setConsentCprCount] = useState(0);
  const [consentAccountCount, setConsentAccountCount] = useState(0);

  const requestProcessing = useCallback((file: File) => {
    setError(null);
    setResult(null);
    setRedactionReview(null);
    setConsentPreview(null);
    setConsentCprCount(0);
    setConsentAccountCount(0);

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("payslip.error.invalidType");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("payslip.error.tooLarge");
      return;
    }

    // For images: run auto-redaction, then go straight to consent with preview
    if (file.type !== "application/pdf") {
      setIsProcessing(true);
      setStatusMessage("cpr.redacting");
      redactSensitiveData(file)
        .then(async (redacted) => {
          terminateRedactWorker();
          if (redacted) {
            setRedactionReview(redacted);
            setConsentPreview(redacted.base64);
            setConsentCprCount(redacted.cprCount);
            setConsentAccountCount(redacted.accountCount);
          } else {
            try {
              const compressed = await compressImage(file);
              setConsentPreview(compressed.base64);
            } catch { /* */ }
          }
          setPendingFile(file);
          setShowConsent(true);
        })
        .catch(async () => {
          try {
            const compressed = await compressImage(file);
            setConsentPreview(compressed.base64);
          } catch { /* truly broken */ }
          setPendingFile(file);
          setShowConsent(true);
        })
        .finally(() => {
          setIsProcessing(false);
          setStatusMessage(null);
        });
      return;
    }

    // PDFs: no preview possible, go to consent
    setPendingFile(file);
    setShowConsent(true);
  }, []);

  const onRedactionApprove = useCallback(
    (manualRects: RedactionRect[]) => {
      if (!redactionReview) return;
      // Store review data + manual rects for later flattening
      setPendingFile(null); // not needed — we use redactionReview
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
        // Flatten with manual rects
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
        // Fallback: image without review (shouldn't normally happen)
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
      setStatusMessage("payslip.scanning");

      const callOCR = async (): Promise<Response> => {
        return fetch(`${SUPABASE_URL}/functions/v1/payslip-ocr`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64, mimeType }),
        });
      };

      // Try up to 2 times — AI output can be flaky
      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await callOCR();

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error(`Payslip OCR API error (attempt ${attempt + 1}):`, res.status, body);
            lastError = body.detail || body.error || `HTTP ${res.status}`;
            // Don't retry on 4xx client errors (except 422 = parse fail)
            if (res.status >= 400 && res.status < 500 && res.status !== 422) {
              throw new Error(lastError);
            }
            continue;
          }

          const raw = await res.json();
          const parsed = parsePayslipResponse(raw);

          if (!parsed) {
            const rawObj = raw as Record<string, unknown>;
            lastError = `bruttolon=${rawObj?.bruttolon}(${typeof rawObj?.bruttolon}), nettolon=${rawObj?.nettolon}(${typeof rawObj?.nettolon})`;
            console.warn(`Payslip parse failed (attempt ${attempt + 1}).`, lastError);
            continue; // retry — AI may produce better output
          }

          // Reconcile: cross-validate brutto, AM-bidrag, netto using math invariants
          const reconciled = reconcilePayslip(parsed);
          if (reconciled.diagnostics.fixes.length > 0) {
            console.info("Payslip reconciliation applied fixes:", reconciled.diagnostics.fixes);
          }

          setResult(reconciled.payslip);
          setDiagnostics(reconciled.diagnostics);
          return;
        } catch (innerErr) {
          lastError = innerErr instanceof Error ? innerErr.message : "Ukendt fejl";
          if (attempt === 0) {
            console.warn("Payslip OCR attempt 1 failed, retrying...", lastError);
          }
        }
      }

      // Both attempts failed
      console.error("Payslip OCR failed after 2 attempts:", lastError);
      setError(lastError ? `Fejl: ${lastError}` : "payslip.error.readFailed");
    } catch (err) {
      console.error("Payslip OCR error:", err);
      const detail = err instanceof Error ? err.message : "";
      setError(detail ? `Fejl: ${detail}` : "payslip.error.readFailed");
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  }, [pendingFile, redactionReview]);

  const reset = useCallback(() => {
    setResult(null);
    setDiagnostics(null);
    setError(null);
    setIsProcessing(false);
    setStatusMessage(null);
    setRedactionReview(null);
    setConsentPreview(null);
    setConsentCprCount(0);
    setConsentAccountCount(0);
  }, []);

  return {
    result,
    diagnostics,
    isProcessing,
    error,
    statusMessage,
    showConsent,
    onConsentAccept,
    onConsentDecline,
    redactionReview,
    onRedactionApprove,
    onRedactionCancel,
    consentPreview,
    consentCprCount,
    consentAccountCount,
    processPayslip: requestProcessing,
    reset,
  };
}

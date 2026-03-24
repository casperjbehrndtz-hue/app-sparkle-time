import { useState, useCallback } from "react";
import { parsePayslipResponse, type ExtractedPayslip } from "@/lib/payslipTypes";
import { reconcilePayslip, type ReconciliationDiagnostics } from "@/lib/payslipReconciler";
import { compressImage } from "@/lib/imageUtils";
import { useI18n } from "@/lib/i18n";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function usePayslipOCR() {
  const { t } = useI18n();
  const [result, setResult] = useState<ExtractedPayslip | null>(null);
  const [diagnostics, setDiagnostics] = useState<ReconciliationDiagnostics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayslip = useCallback(async (file: File) => {
    setError(null);
    setResult(null);

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

    // GDPR consent: user must confirm before sending to AI service
    if (!window.confirm(t("ocr.consentPayslip"))) {
      return;
    }

    setIsProcessing(true);

    try {
      const { base64, mimeType } = await compressImage(file);

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
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setDiagnostics(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return { result, diagnostics, isProcessing, error, processPayslip, reset };
}

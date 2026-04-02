/**
 * Batch payslip OCR — processes multiple files sequentially
 * through the same CPR redaction → consent → AI pipeline.
 *
 * Each file goes through the full security flow individually:
 * 1. CPR/account redaction (Tesseract or pdf.js)
 * 2. User reviews redaction in OcrConsentModal
 * 3. Send redacted image to Claude Vision
 * 4. Client-side reconciliation
 *
 * Returns parsed payslips as they complete.
 */
import { useState, useCallback, useRef } from "react";
import { parsePayslipResponse, type ExtractedPayslip } from "@/lib/payslipTypes";
import { reconcilePayslip } from "@/lib/payslipReconciler";
import { compressImage } from "@/lib/imageUtils";
import { pdfToImage } from "@/lib/pdfToImage";
import {
  redactSensitiveData,
  terminateRedactWorker,
  type RedactionResult,
} from "@/lib/cprRedact";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
/** OCR endpoint allows 10 requests/hour/IP — cap batch to avoid rate limits */
const MAX_BATCH_SIZE = 10;

export interface BatchPayslipResult {
  fileName: string;
  payslip: ExtractedPayslip | null;
  error?: string;
}

export interface BatchProgress {
  total: number;
  current: number;
  currentFileName: string;
  phase: "idle" | "redacting" | "consent" | "scanning" | "done" | "error";
}

export function usePayslipBatchOCR() {
  const [results, setResults] = useState<BatchPayslipResult[]>([]);
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0, current: 0, currentFileName: "", phase: "idle",
  });

  // Consent modal state — one file at a time
  const [showConsent, setShowConsent] = useState(false);
  const [consentPreview, setConsentPreview] = useState<string | null>(null);
  const [consentCprCount, setConsentCprCount] = useState(0);
  const [consentAccountCount, setConsentAccountCount] = useState(0);
  const [consentIsPdf, setConsentIsPdf] = useState(false);

  // Internal resolver for consent flow
  const consentResolver = useRef<((accepted: boolean) => void) | null>(null);

  /** Wait for user to accept/decline consent modal */
  const waitForConsent = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      consentResolver.current = resolve;
    });
  }, []);

  const onConsentAccept = useCallback(async () => {
    setShowConsent(false);
    consentResolver.current?.(true);
    consentResolver.current = null;
  }, []);

  const onConsentDecline = useCallback(() => {
    setShowConsent(false);
    consentResolver.current?.(false);
    consentResolver.current = null;
  }, []);

  /** Process a single file through redaction → consent → OCR */
  const processOneFile = useCallback(async (
    file: File,
    index: number,
    total: number,
  ): Promise<BatchPayslipResult> => {
    const fileName = file.name;

    // Validate
    if (!VALID_TYPES.includes(file.type)) {
      return { fileName, payslip: null, error: "Ugyldig filtype" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { fileName, payslip: null, error: "Fil for stor (max 5 MB)" };
    }

    // Phase 1: Redaction
    setProgress({ total, current: index + 1, currentFileName: fileName, phase: "redacting" });

    let redaction: RedactionResult | null = null;
    let fallbackBase64: string | null = null;

    try {
      if (file.type === "application/pdf") {
        const result = await pdfToImage(file);
        redaction = {
          base64: result.base64,
          mimeType: "image/jpeg",
          cprCount: result.cprCount,
          accountCount: result.accountCount,
          originalDataUrl: result.originalDataUrl,
          autoRects: result.autoRects,
          width: result.width,
          height: result.height,
        };
      } else {
        redaction = await redactSensitiveData(file);
        terminateRedactWorker();
        if (!redaction) {
          const compressed = await compressImage(file);
          fallbackBase64 = compressed.base64;
        }
      }
    } catch {
      try {
        const compressed = await compressImage(file);
        fallbackBase64 = compressed.base64;
      } catch {
        return { fileName, payslip: null, error: "Kunne ikke læse filen" };
      }
    }

    // Phase 2: Show consent modal for this file
    setProgress({ total, current: index + 1, currentFileName: fileName, phase: "consent" });
    setConsentPreview(redaction?.base64 ?? fallbackBase64);
    setConsentCprCount(redaction?.cprCount ?? 0);
    setConsentAccountCount(redaction?.accountCount ?? 0);
    setConsentIsPdf(file.type === "application/pdf" && !redaction);
    setShowConsent(true);

    const accepted = await waitForConsent();
    if (!accepted) {
      return { fileName, payslip: null, error: "Sprunget over" };
    }

    // Phase 3: Send to AI
    setProgress({ total, current: index + 1, currentFileName: fileName, phase: "scanning" });

    let base64: string;
    let mimeType: string;

    if (redaction) {
      base64 = redaction.base64;
      mimeType = redaction.mimeType;
    } else if (fallbackBase64) {
      base64 = fallbackBase64;
      mimeType = "image/jpeg";
    } else {
      return { fileName, payslip: null, error: "Ingen billeddata" };
    }

    // OCR call with retry
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/payslip-ocr`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64, mimeType }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          lastError = body.detail || body.error || `HTTP ${res.status}`;
          if (res.status >= 400 && res.status < 500 && res.status !== 422) {
            return { fileName, payslip: null, error: lastError };
          }
          continue;
        }

        const raw = await res.json();
        const parsed = parsePayslipResponse(raw);
        if (!parsed) {
          lastError = "Kunne ikke parse lønsedlen";
          continue;
        }

        const reconciled = reconcilePayslip(parsed);
        return { fileName, payslip: reconciled.payslip };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Ukendt fejl";
      }
    }

    return { fileName, payslip: null, error: lastError || "OCR fejlede" };
  }, [waitForConsent]);

  /** Start batch processing */
  const processBatch = useCallback(async (files: File[]) => {
    const capped = files.slice(0, MAX_BATCH_SIZE);
    setResults([]);
    const total = capped.length;

    const allResults: BatchPayslipResult[] = [];

    for (let i = 0; i < capped.length; i++) {
      const result = await processOneFile(capped[i], i, total);
      allResults.push(result);
      setResults([...allResults]);
    }

    setProgress({ total, current: total, currentFileName: "", phase: "done" });
  }, [processOneFile]);

  const reset = useCallback(() => {
    setResults([]);
    setProgress({ total: 0, current: 0, currentFileName: "", phase: "idle" });
    setShowConsent(false);
    setConsentPreview(null);
  }, []);

  return {
    results,
    progress,
    processBatch,
    reset,
    // Consent modal props
    showConsent,
    consentPreview,
    consentCprCount,
    consentAccountCount,
    consentIsPdf,
    onConsentAccept,
    onConsentDecline,
  };
}

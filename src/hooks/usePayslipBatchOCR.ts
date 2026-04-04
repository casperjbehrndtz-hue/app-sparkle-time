/**
 * Batch payslip OCR — processes multiple files through:
 *   Phase 1: Redact ALL files (CPR/account removal)
 *   Phase 2: Show all redacted previews for batch review
 *   Phase 3: Send approved files to Claude Vision
 *
 * This replaces the old per-file consent flow with a single
 * batch approval step after all redactions are done.
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

export interface RedactedFile {
  fileName: string;
  base64: string;
  mimeType: string;
  cprCount: number;
  accountCount: number;
  /** Whether the user has excluded this file from the batch */
  excluded: boolean;
  error?: string;
}

export interface BatchProgress {
  total: number;
  current: number;
  currentFileName: string;
  phase: "idle" | "redacting" | "reviewing" | "scanning" | "done" | "error";
}

export function usePayslipBatchOCR() {
  const [results, setResults] = useState<BatchPayslipResult[]>([]);
  const [redactedFiles, setRedactedFiles] = useState<RedactedFile[]>([]);
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0, current: 0, currentFileName: "", phase: "idle",
  });

  // Batch consent state
  const [showBatchConsent, setShowBatchConsent] = useState(false);
  const consentResolver = useRef<((accepted: boolean) => void) | null>(null);

  /** Toggle a single file's excluded state in the review grid */
  const toggleFileExclusion = useCallback((index: number) => {
    setRedactedFiles((prev) =>
      prev.map((f, i) => i === index ? { ...f, excluded: !f.excluded } : f),
    );
  }, []);

  /** User accepts batch consent — process all non-excluded files */
  const onBatchAccept = useCallback(() => {
    setShowBatchConsent(false);
    consentResolver.current?.(true);
    consentResolver.current = null;
  }, []);

  /** User declines batch consent — cancel everything */
  const onBatchDecline = useCallback(() => {
    setShowBatchConsent(false);
    consentResolver.current?.(false);
    consentResolver.current = null;
  }, []);

  /** Redact a single file (no consent needed yet) */
  const redactOneFile = useCallback(async (file: File): Promise<RedactedFile> => {
    const fileName = file.name;

    if (!VALID_TYPES.includes(file.type)) {
      return { fileName, base64: "", mimeType: "", cprCount: 0, accountCount: 0, excluded: true, error: "Ugyldig filtype" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { fileName, base64: "", mimeType: "", cprCount: 0, accountCount: 0, excluded: true, error: "Fil for stor (max 5 MB)" };
    }

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
        return { fileName, base64: "", mimeType: "", cprCount: 0, accountCount: 0, excluded: true, error: "Kunne ikke læse filen" };
      }
    }

    return {
      fileName,
      base64: redaction?.base64 ?? fallbackBase64 ?? "",
      mimeType: redaction?.mimeType ?? "image/jpeg",
      cprCount: redaction?.cprCount ?? 0,
      accountCount: redaction?.accountCount ?? 0,
      excluded: false,
    };
  }, []);

  /** Send a single redacted file to Claude Vision */
  const scanOneFile = useCallback(async (rf: RedactedFile): Promise<BatchPayslipResult> => {
    if (!rf.base64) {
      return { fileName: rf.fileName, payslip: null, error: rf.error || "Ingen billeddata" };
    }

    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/payslip-ocr`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: rf.base64, mimeType: rf.mimeType }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          lastError = body.detail || body.error || `HTTP ${res.status}`;
          if (res.status >= 400 && res.status < 500 && res.status !== 422) {
            return { fileName: rf.fileName, payslip: null, error: lastError };
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
        return { fileName: rf.fileName, payslip: reconciled.payslip };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Ukendt fejl";
      }
    }

    return { fileName: rf.fileName, payslip: null, error: lastError || "OCR fejlede" };
  }, []);

  /** Start batch processing — 3 phases */
  const processBatch = useCallback(async (files: File[]) => {
    const capped = files.slice(0, MAX_BATCH_SIZE);
    setResults([]);
    setRedactedFiles([]);
    const total = capped.length;

    // ── Phase 1: Redact all files ──
    const redacted: RedactedFile[] = [];
    for (let i = 0; i < capped.length; i++) {
      setProgress({ total, current: i + 1, currentFileName: capped[i].name, phase: "redacting" });
      const rf = await redactOneFile(capped[i]);
      redacted.push(rf);
      setRedactedFiles([...redacted]);
    }

    // If no valid files, skip consent
    const validFiles = redacted.filter((f) => !f.error);
    if (validFiles.length === 0) {
      // All files had errors — mark results and finish
      setResults(redacted.map((f) => ({ fileName: f.fileName, payslip: null, error: f.error || "Fejl" })));
      setProgress({ total, current: total, currentFileName: "", phase: "done" });
      return;
    }

    // ── Phase 2: Show batch consent review ──
    setProgress({ total, current: total, currentFileName: "", phase: "reviewing" });
    setShowBatchConsent(true);

    const accepted = await new Promise<boolean>((resolve) => {
      consentResolver.current = resolve;
    });

    if (!accepted) {
      setResults(redacted.map((f) => ({ fileName: f.fileName, payslip: null, error: "Annulleret" })));
      setProgress({ total, current: total, currentFileName: "", phase: "done" });
      return;
    }

    // ── Phase 3: Scan approved files ──
    // Get the latest redactedFiles state (user may have toggled exclusions)
    let latestRedacted: RedactedFile[] = [];
    setRedactedFiles((prev) => { latestRedacted = prev; return prev; });

    const allResults: BatchPayslipResult[] = [];
    const toScan = latestRedacted.filter((f) => !f.excluded && !f.error);
    const skipped = latestRedacted.filter((f) => f.excluded || f.error);

    // Add skipped files to results immediately
    for (const f of skipped) {
      allResults.push({ fileName: f.fileName, payslip: null, error: f.error || "Sprunget over" });
    }
    setResults([...allResults]);

    for (let i = 0; i < toScan.length; i++) {
      setProgress({ total: toScan.length, current: i + 1, currentFileName: toScan[i].fileName, phase: "scanning" });
      const result = await scanOneFile(toScan[i]);
      allResults.push(result);
      setResults([...allResults]);
    }

    setProgress({ total, current: total, currentFileName: "", phase: "done" });
  }, [redactOneFile, scanOneFile]);

  const reset = useCallback(() => {
    setResults([]);
    setRedactedFiles([]);
    setProgress({ total: 0, current: 0, currentFileName: "", phase: "idle" });
    setShowBatchConsent(false);
  }, []);

  return {
    results,
    progress,
    processBatch,
    reset,
    // Batch consent props
    showBatchConsent,
    redactedFiles,
    toggleFileExclusion,
    onBatchAccept,
    onBatchDecline,
  };
}

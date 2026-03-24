import { useState, useCallback } from "react";
import { parseBankStatementResponse, type BankStatementRaw, type StatementAnalysis } from "@/lib/bankStatementTypes";
import { parseCSV } from "@/lib/csvParser";
import { analyzeStatement } from "@/lib/statementAnalyzer";
import { compressImage } from "@/lib/imageUtils";
import { redactSensitiveData, terminateRedactWorker } from "@/lib/cprRedact";
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

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setRaw(null);
    setAnalysis(null);

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

    // Show consent modal
    setPendingFile(file);
    setShowConsent(true);
  }, []);

  const onConsentDecline = useCallback(() => {
    setPendingFile(null);
    setShowConsent(false);
  }, []);

  const onConsentAccept = useCallback(async () => {
    const file = pendingFile;
    setShowConsent(false);
    setPendingFile(null);
    if (!file) return;

    setIsProcessing(true);

    try {
      let base64: string;
      let mimeType: string;

      // Step 1: Client-side CPR redaction (images only)
      if (file.type !== "application/pdf") {
        setStatusMessage("cpr.redacting");
        const redacted = await redactSensitiveData(file);
        if (redacted) {
          base64 = redacted.base64;
          mimeType = redacted.mimeType;
          if (redacted.cprCount > 0 || redacted.accountCount > 0) {
            console.info(
              `CPR redaction: removed ${redacted.cprCount} CPR pattern(s), ${redacted.accountCount} account pattern(s)`,
            );
          }
          terminateRedactWorker();
        } else {
          const compressed = await compressImage(file);
          base64 = compressed.base64;
          mimeType = compressed.mimeType;
        }
      } else {
        const compressed = await compressImage(file);
        base64 = compressed.base64;
        mimeType = compressed.mimeType;
      }

      // Step 2: Send redacted image to AI
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
  }, [pendingFile]);

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
  }, []);

  return {
    raw,
    analysis,
    isProcessing,
    error,
    statusMessage,
    showConsent,
    onConsentAccept,
    onConsentDecline,
    processFile,
    analyzeWithBudget,
    reset,
  };
}

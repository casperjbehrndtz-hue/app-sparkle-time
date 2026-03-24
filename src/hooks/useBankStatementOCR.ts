import { useState, useCallback } from "react";
import { parseBankStatementResponse, type BankStatementRaw, type StatementAnalysis } from "@/lib/bankStatementTypes";
import { parseCSV } from "@/lib/csvParser";
import { analyzeStatement } from "@/lib/statementAnalyzer";
import { compressImage } from "@/lib/imageUtils";
import { useI18n } from "@/lib/i18n";
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
  // Also detect TSV / semicolon-separated
  if (file.name.toLowerCase().endsWith(".tsv")) return true;
  return false;
}

export function useBankStatementOCR() {
  const { t } = useI18n();
  const [raw, setRaw] = useState<BankStatementRaw | null>(null);
  const [analysis, setAnalysis] = useState<StatementAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setRaw(null);
    setAnalysis(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("pengetjek.error.tooLarge");
      return;
    }

    setIsProcessing(true);

    try {
      // ── CSV path: parse client-side (free, no AI) ──
      if (isCSV(file)) {
        const content = await readFileAsText(file);
        const parsed = parseCSV(content);

        if (!parsed || parsed.transaktioner.length === 0) {
          setError("pengetjek.error.csvParseFailed");
          return;
        }

        setRaw(parsed);
        setAnalysis(analyzeStatement(parsed));
        return;
      }

      // ── Image/PDF path: send to edge function ──
      const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setError("pengetjek.error.invalidType");
        return;
      }

      // GDPR consent: user must confirm before sending to AI service
      if (!window.confirm(t("ocr.consent"))) {
        return;
      }

      const { base64, mimeType } = await compressImage(file);

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
    }
  }, []);

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
  }, []);

  return { raw, analysis, isProcessing, error, processFile, analyzeWithBudget, reset };
}

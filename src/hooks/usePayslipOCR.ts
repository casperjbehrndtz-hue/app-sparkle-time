import { useState, useCallback } from "react";
import { parsePayslipResponse, type ExtractedPayslip } from "@/lib/payslipTypes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Resize image client-side to reduce upload size and latency */
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  // PDFs: send as-is
  if (file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { base64: btoa(binary), mimeType: "application/pdf" };
  }

  // Images: resize to max 1600px and compress as JPEG
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            resolve({ base64, mimeType: "image/jpeg" });
          };
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.82,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    img.src = url;
  });
}

export function usePayslipOCR() {
  const [result, setResult] = useState<ExtractedPayslip | null>(null);
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

          setResult(parsed);
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
    setError(null);
    setIsProcessing(false);
  }, []);

  return { result, isProcessing, error, processPayslip, reset };
}

/**
 * Client-side CPR number detection and redaction.
 *
 * Uses Tesseract.js (WASM) to run OCR entirely in the browser,
 * finds Danish CPR patterns (DDMMYY-XXXX), and paints black
 * rectangles over them on a canvas before the image is sent anywhere.
 *
 * Also redacts bank account numbers (10-digit patterns) for safety.
 */
import { createWorker, type Worker } from "tesseract.js";

// Danish CPR: 6 digits, optional dash/space, 4 digits
// Matches: 010190-1234, 0101901234, 010190 1234
const CPR_PATTERN = /\b(\d{2}[01]\d[0-9]\d)[\s\-]?(\d{4})\b/g;

// Bank account: reg.nr (4 digits) + account (6-10 digits)
const ACCOUNT_PATTERN = /\b\d{4}[\s\-]?\d{6,10}\b/g;

let workerInstance: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker("dan+eng", undefined, {
      // Silence noisy logs in production
      logger: () => {},
    });
  }
  return workerInstance;
}

export interface RedactionResult {
  /** Base64 of the redacted image (JPEG, no data: prefix) */
  base64: string;
  mimeType: "image/jpeg";
  /** Number of CPR patterns found and redacted */
  cprCount: number;
  /** Number of account patterns found and redacted */
  accountCount: number;
}

/**
 * Detects and blacks out CPR numbers and bank account numbers
 * from an image, entirely client-side.
 *
 * For PDFs, returns null (can't canvas-redact PDFs easily).
 */
export async function redactSensitiveData(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<RedactionResult | null> {
  // PDFs: skip redaction (Tesseract can't read PDFs in browser)
  if (file.type === "application/pdf") return null;

  // Load image onto canvas
  const img = await loadImage(file);
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

  // Run Tesseract OCR client-side to find text + bounding boxes
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);

  let cprCount = 0;
  let accountCount = 0;

  // Check each word for sensitive patterns
  for (const line of data.lines) {
    const lineText = line.words.map((w) => w.text).join(" ");

    // Check for CPR in the full line text (catches split across words)
    if (CPR_PATTERN.test(lineText) || ACCOUNT_PATTERN.test(lineText)) {
      CPR_PATTERN.lastIndex = 0;
      ACCOUNT_PATTERN.lastIndex = 0;

      // Count matches
      const cprMatches = lineText.match(CPR_PATTERN);
      const accMatches = lineText.match(ACCOUNT_PATTERN);
      if (cprMatches) cprCount += cprMatches.length;
      if (accMatches) accountCount += accMatches.length;

      // Black out the entire line's bounding box (safer than per-word)
      const bbox = line.bbox;
      // Add padding for safety
      const pad = 4;
      ctx.fillStyle = "#000000";
      ctx.fillRect(
        bbox.x0 - pad,
        bbox.y0 - pad,
        bbox.x1 - bbox.x0 + pad * 2,
        bbox.y1 - bbox.y0 + pad * 2,
      );
    }
  }

  // Also check individual words for partial matches
  for (const line of data.lines) {
    for (const word of line.words) {
      const text = word.text.replace(/[^0-9\-\s]/g, ""); // digits only
      CPR_PATTERN.lastIndex = 0;
      ACCOUNT_PATTERN.lastIndex = 0;

      if (CPR_PATTERN.test(text) || ACCOUNT_PATTERN.test(text)) {
        const bbox = word.bbox;
        const pad = 4;
        ctx.fillStyle = "#000000";
        ctx.fillRect(
          bbox.x0 - pad,
          bbox.y0 - pad,
          bbox.x1 - bbox.x0 + pad * 2,
          bbox.y1 - bbox.y0 + pad * 2,
        );
        // Don't double-count — already counted at line level
      }
    }
  }

  // Export redacted canvas
  const base64 = await canvasToBase64(canvas, quality);
  return { base64, mimeType: "image/jpeg", cprCount, accountCount };
}

/** Terminate the Tesseract worker to free memory */
export async function terminateRedactWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

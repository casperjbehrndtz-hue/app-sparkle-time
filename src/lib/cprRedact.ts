/**
 * Client-side sensitive data detection and redaction for images.
 *
 * Uses Tesseract.js (WASM) to run OCR entirely in the browser,
 * finds Danish CPR patterns, names, addresses, account numbers,
 * and paints black rectangles over them before the image is sent anywhere.
 */
import { createWorker, type Worker } from "tesseract.js";
import { CPR_RE, ACCOUNT_RE, POSTAL_RE, SENSITIVE_LABELS, SAFE_LABELS } from "./sensitivePatterns";

let workerInstance: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker("dan+eng", undefined, {
      logger: () => {},
    });
  }
  return workerInstance;
}

export interface RedactionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RedactionResult {
  base64: string;
  mimeType: "image/jpeg";
  cprCount: number;
  accountCount: number;
  /** Total sensitive lines redacted */
  redactionCount: number;
  originalDataUrl: string;
  autoRects: RedactionRect[];
  width: number;
  height: number;
}

/**
 * Detects and blacks out sensitive personal data from an image.
 * For PDFs, returns null — use pdfToImage() instead.
 */
export async function redactSensitiveData(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<RedactionResult | null> {
  if (file.type === "application/pdf") return null;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (err) {
    console.warn("Image load failed for redaction:", err);
    return null;
  }

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

  const originalDataUrl = canvas.toDataURL("image/jpeg", quality);

  let cprCount = 0;
  let accountCount = 0;
  const autoRects: RedactionRect[] = [];
  const sensitiveLineIndices = new Set<number>();

  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);

    // Classify each line
    for (let i = 0; i < data.lines.length; i++) {
      const lineText = data.lines[i].words.map((w) => w.text).join(" ");

      // Skip safe financial lines
      if (SAFE_LABELS.test(lineText)) continue;

      let isSensitive = false;

      if (CPR_RE.test(lineText)) { cprCount++; isSensitive = true; }
      if (ACCOUNT_RE.test(lineText)) { accountCount++; isSensitive = true; }
      if (SENSITIVE_LABELS.test(lineText)) isSensitive = true;
      if (POSTAL_RE.test(lineText)) isSensitive = true;

      if (isSensitive) sensitiveLineIndices.add(i);
    }

    // Expand: redact name/address lines above sensitive anchors
    const expanded = new Set(sensitiveLineIndices);
    for (const idx of sensitiveLineIndices) {
      const lineText = data.lines[idx].words.map((w) => w.text).join(" ");
      if (CPR_RE.test(lineText) || POSTAL_RE.test(lineText) || SENSITIVE_LABELS.test(lineText)) {
        for (let above = 1; above <= 3; above++) {
          const aboveIdx = idx - above;
          if (aboveIdx < 0) break;
          const aboveText = data.lines[aboveIdx].words.map((w) => w.text).join(" ");
          if (SAFE_LABELS.test(aboveText)) break;
          if (/\b(A\/S|ApS|I\/S|K\/S|P\/S|Holding|Inc\.|Ltd\.)\b/i.test(aboveText)) break;
          expanded.add(aboveIdx);
        }
      }
    }

    // Draw black rectangles over all sensitive lines
    ctx.fillStyle = "#000000";
    for (const idx of expanded) {
      const line = data.lines[idx];
      const bbox = line.bbox;
      const pad = 4;
      const rect: RedactionRect = {
        x: bbox.x0 - pad,
        y: bbox.y0 - pad,
        w: bbox.x1 - bbox.x0 + pad * 2,
        h: bbox.y1 - bbox.y0 + pad * 2,
      };
      autoRects.push(rect);
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  } catch (err) {
    console.warn("Tesseract OCR failed — manual review still available:", err);
  }

  const base64 = await canvasToBase64(canvas, quality);
  return {
    base64, mimeType: "image/jpeg", cprCount, accountCount,
    redactionCount: autoRects.length,
    originalDataUrl, autoRects, width, height,
  };
}

/** Terminate the Tesseract worker to free memory */
export async function terminateRedactWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * Renders the original image with auto + manual redaction rects.
 */
export async function flattenRedaction(
  originalDataUrl: string,
  autoRects: RedactionRect[],
  manualRects: RedactionRect[],
  width: number,
  height: number,
  quality = 0.82,
): Promise<string> {
  const img = await loadImageFromUrl(originalDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  ctx.fillStyle = "#000000";
  for (const r of [...autoRects, ...manualRects]) {
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  return canvasToBase64(canvas, quality);
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
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
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

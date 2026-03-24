/**
 * Convert the first page of a PDF file to a JPEG image File,
 * with CPR numbers and account numbers redacted using native PDF text extraction.
 *
 * Unlike Tesseract OCR, pdf.js text extraction is 100% reliable for digital PDFs
 * because it reads the actual text data from the PDF structure.
 */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import type { RedactionRect } from "./cprRedact";

// Use the bundled worker from pdfjs-dist
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Danish CPR: 6 digits, optional separator, 4 digits
const CPR_PATTERN = /(?<!\d)(\d{2}[\.\s]?\d{2}[\.\s]?\d{2})[\s\-\.\/]?(\d{4})(?!\d)/g;
// Bank account: reg.nr (4 digits) + account (6-10 digits)
const ACCOUNT_PATTERN = /(?<!\d)\d{4}[\s\-\.]?\d{6,10}(?!\d)/g;

interface PdfRedactionResult {
  /** The rendered+redacted image as a File */
  file: File;
  /** Base64 JPEG (no data: prefix) */
  base64: string;
  /** Redaction rects applied */
  autoRects: RedactionRect[];
  /** Number of CPR patterns found */
  cprCount: number;
  /** Number of account patterns found */
  accountCount: number;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Original (unredacted) data URL for review */
  originalDataUrl: string;
}

/**
 * Renders the first page of a PDF to a JPEG, redacting CPR and account numbers.
 * Uses pdf.js native text extraction — no OCR needed, 100% reliable for digital PDFs.
 */
export async function pdfToImage(
  pdfFile: File,
  scale = 3,
  quality = 0.85,
): Promise<PdfRedactionResult> {
  const buffer = await pdfFile.arrayBuffer();
  const params: DocumentInitParameters = { data: new Uint8Array(buffer) };
  const pdf = await getDocument(params).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Save original before redaction
  const originalDataUrl = canvas.toDataURL("image/jpeg", quality);

  // Extract text with positions from PDF structure (not OCR!)
  const textContent = await page.getTextContent();
  const autoRects: RedactionRect[] = [];
  let cprCount = 0;
  let accountCount = 0;

  // Build lines by grouping text items with similar Y positions
  const items = textContent.items.filter((item: any) => item.str && item.str.trim());

  for (const item of items as any[]) {
    const text = item.str;
    CPR_PATTERN.lastIndex = 0;
    ACCOUNT_PATTERN.lastIndex = 0;

    const hasCpr = CPR_PATTERN.test(text);
    CPR_PATTERN.lastIndex = 0;
    const hasAccount = ACCOUNT_PATTERN.test(text);
    ACCOUNT_PATTERN.lastIndex = 0;

    if (hasCpr || hasAccount) {
      if (hasCpr) {
        const matches = text.match(CPR_PATTERN);
        cprCount += matches ? matches.length : 0;
      }
      if (hasAccount) {
        const matches = text.match(ACCOUNT_PATTERN);
        accountCount += matches ? matches.length : 0;
      }

      // pdf.js transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const tx = item.transform;
      // Convert PDF coordinates to canvas coordinates using the viewport
      const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
      const fontHeight = Math.abs(tx[3]) * scale;
      const textWidth = item.width * scale;

      const pad = 6;
      const rect: RedactionRect = {
        x: x - pad,
        y: y - fontHeight - pad,
        w: textWidth + pad * 2,
        h: fontHeight + pad * 2,
      };
      autoRects.push(rect);
    }
  }

  // Also scan concatenated text of nearby items (CPR might span two text items)
  // Group items by Y position (within 5px tolerance)
  const lineGroups = new Map<number, any[]>();
  for (const item of items as any[]) {
    const y = Math.round(item.transform[5]);
    const key = [...lineGroups.keys()].find(k => Math.abs(k - y) < 5) ?? y;
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key)!.push(item);
  }

  for (const [, lineItems] of lineGroups) {
    // Sort by X position
    lineItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
    const lineText = lineItems.map((it: any) => it.str).join(" ");
    CPR_PATTERN.lastIndex = 0;
    ACCOUNT_PATTERN.lastIndex = 0;

    const hasCpr = CPR_PATTERN.test(lineText);
    CPR_PATTERN.lastIndex = 0;
    const hasAccount = ACCOUNT_PATTERN.test(lineText);
    ACCOUNT_PATTERN.lastIndex = 0;

    if (hasCpr || hasAccount) {
      // Check if we already have rects for these items
      const firstItem = lineItems[0];
      const lastItem = lineItems[lineItems.length - 1];
      const tx1 = firstItem.transform;
      const tx2 = lastItem.transform;

      const [x1, y1] = viewport.convertToViewportPoint(tx1[4], tx1[5]);
      const [x2] = viewport.convertToViewportPoint(tx2[4], tx2[5]);
      const fontHeight = Math.abs(tx1[3]) * scale;
      const endX = x2 + lastItem.width * scale;

      // Check overlap with existing rects
      const alreadyCovered = autoRects.some(r =>
        r.y < y1 && r.y + r.h > y1 - fontHeight && r.x < endX && r.x + r.w > x1
      );

      if (!alreadyCovered) {
        if (hasCpr) {
          const matches = lineText.match(CPR_PATTERN);
          cprCount += matches ? matches.length : 0;
        }
        if (hasAccount) {
          const matches = lineText.match(ACCOUNT_PATTERN);
          accountCount += matches ? matches.length : 0;
        }

        const pad = 6;
        const rect: RedactionRect = {
          x: x1 - pad,
          y: y1 - fontHeight - pad,
          w: endX - x1 + pad * 2,
          h: fontHeight + pad * 2,
        };
        autoRects.push(rect);
      }
    }
  }

  // Draw black rectangles over detected areas
  ctx.fillStyle = "#000000";
  for (const rect of autoRects) {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Convert to JPEG
  const base64 = await new Promise<string>((resolve, reject) => {
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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });

  const file = new File([blob], pdfFile.name.replace(/\.pdf$/i, ".jpg"), {
    type: "image/jpeg",
  });

  // Clean up
  page.cleanup();
  await pdf.destroy();

  console.info(`PDF redaction: ${cprCount} CPR, ${accountCount} account numbers found via text extraction`);

  return {
    file,
    base64,
    autoRects,
    cprCount,
    accountCount,
    width: canvas.width,
    height: canvas.height,
    originalDataUrl,
  };
}

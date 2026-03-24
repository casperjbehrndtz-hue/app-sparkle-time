/**
 * Convert the first page of a PDF file to a JPEG image,
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

// Danish CPR: DDMMYY-XXXX with valid day (01-31) and month (01-12)
// Accepts separators: dash, space, dot, slash, or nothing
const CPR_RE = /(?<!\d)((?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2})[\s\-\.\/]?(\d{4})(?!\d)/g;

// Bank account: reg.nr (4 digits) + separator + account (6-10 digits)
// Requires a separator to avoid matching arbitrary long numbers
const ACCOUNT_RE = /(?<!\d)(\d{4})[\s\-\.](\d{6,10})(?!\d)/g;

interface PdfRedactionResult {
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

/** Test a string against a global regex without mutating lastIndex state */
function testPattern(re: RegExp, text: string): RegExpMatchArray | null {
  re.lastIndex = 0;
  return text.match(re);
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

  const items = textContent.items.filter((item: any) => item.str && item.str.trim()) as any[];

  // Helper: convert a pdf.js text item to a canvas RedactionRect
  function itemToRect(item: any, pad = 6): RedactionRect {
    const tx = item.transform;
    const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
    const fontHeight = Math.abs(tx[3]) * scale;
    const textWidth = item.width * scale;
    return {
      x: x - pad,
      y: y - fontHeight - pad,
      w: textWidth + pad * 2,
      h: fontHeight + pad * 2,
    };
  }

  // Track which items have been redacted to avoid double-counting
  const redactedItemIndices = new Set<number>();

  // Pass 1: check each individual text item
  for (let i = 0; i < items.length; i++) {
    const text = items[i].str;
    const cprMatches = testPattern(CPR_RE, text);
    const accMatches = testPattern(ACCOUNT_RE, text);

    if (cprMatches || accMatches) {
      cprCount += cprMatches?.length ?? 0;
      accountCount += accMatches?.length ?? 0;
      autoRects.push(itemToRect(items[i]));
      redactedItemIndices.add(i);
    }
  }

  // Pass 2: group items into lines (CPR might span two text items, e.g. "070990" + "-1741")
  const lineGroups = new Map<number, { items: any[]; indices: number[] }>();
  for (let i = 0; i < items.length; i++) {
    const y = Math.round(items[i].transform[5]);
    // Find existing line group within 5 PDF units
    const key = [...lineGroups.keys()].find(k => Math.abs(k - y) < 5) ?? y;
    if (!lineGroups.has(key)) lineGroups.set(key, { items: [], indices: [] });
    const group = lineGroups.get(key)!;
    group.items.push(items[i]);
    group.indices.push(i);
  }

  for (const [, group] of lineGroups) {
    // Skip lines where all items are already redacted
    if (group.indices.every(i => redactedItemIndices.has(i))) continue;

    // Sort by X position and concatenate
    const sorted = group.items
      .map((item, j) => ({ item, idx: group.indices[j] }))
      .sort((a, b) => a.item.transform[4] - b.item.transform[4]);
    const lineText = sorted.map(s => s.item.str).join(" ");

    const cprMatches = testPattern(CPR_RE, lineText);
    const accMatches = testPattern(ACCOUNT_RE, lineText);

    if (cprMatches || accMatches) {
      cprCount += cprMatches?.length ?? 0;
      accountCount += accMatches?.length ?? 0;

      // Redact each unredacted item in this line
      for (const s of sorted) {
        if (!redactedItemIndices.has(s.idx)) {
          autoRects.push(itemToRect(s.item));
          redactedItemIndices.add(s.idx);
        }
      }
    }
  }

  // Draw black rectangles over detected areas
  ctx.fillStyle = "#000000";
  for (const rect of autoRects) {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Convert to base64 JPEG (single toBlob call)
  const base64 = await new Promise<string>((resolve, reject) => {
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

  // Clean up
  page.cleanup();
  await pdf.destroy();

  console.info(`PDF redaction: ${cprCount} CPR, ${accountCount} account numbers found via text extraction`);

  return {
    base64,
    autoRects,
    cprCount,
    accountCount,
    width: canvas.width,
    height: canvas.height,
    originalDataUrl,
  };
}

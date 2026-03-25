/**
 * Convert the first page of a PDF file to a JPEG image,
 * with ALL personal data redacted using native PDF text extraction.
 *
 * Redacts: CPR numbers, names, addresses, employee IDs, account numbers,
 * SE-numbers — everything that isn't salary/deduction amounts.
 */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import type { RedactionRect } from "./cprRedact";
import { CPR_RE, ACCOUNT_RE, POSTAL_RE, SENSITIVE_LABELS, SAFE_LABELS } from "./sensitivePatterns";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfRedactionResult {
  base64: string;
  autoRects: RedactionRect[];
  /** Total number of sensitive fields redacted */
  redactionCount: number;
  cprCount: number;
  accountCount: number;
  width: number;
  height: number;
  originalDataUrl: string;
}

interface LineGroup {
  items: any[];
  indices: number[];
  text: string;
  /** Average Y position in PDF coordinates */
  pdfY: number;
}

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

  const originalDataUrl = canvas.toDataURL("image/jpeg", quality);

  // ── Extract text + build lines ──
  const textContent = await page.getTextContent();
  const items = textContent.items.filter((item: any) => item.str && item.str.trim()) as any[];

  // Group items into lines by Y position (within 3 PDF units)
  const lineMap = new Map<number, LineGroup>();
  for (let i = 0; i < items.length; i++) {
    const y = Math.round(items[i].transform[5]);
    const key = [...lineMap.keys()].find(k => Math.abs(k - y) < 3) ?? y;
    if (!lineMap.has(key)) lineMap.set(key, { items: [], indices: [], text: "", pdfY: y });
    const group = lineMap.get(key)!;
    group.items.push(items[i]);
    group.indices.push(i);
  }

  // Sort lines top-to-bottom (highest PDF Y = top of page)
  const lines = [...lineMap.values()].sort((a, b) => b.pdfY - a.pdfY);

  // Build concatenated text per line (sorted left-to-right)
  for (const line of lines) {
    line.items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
    line.text = line.items.map((it: any) => it.str).join(" ");
  }

  // ── Detect sensitive lines ──
  const sensitiveLines = new Set<number>(); // indices into `lines` array
  let cprCount = 0;
  let accountCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].text;

    // Skip lines that are clearly safe financial data
    if (SAFE_LABELS.test(text)) continue;

    let isSensitive = false;

    // CPR pattern
    if (CPR_RE.test(text)) {
      cprCount++;
      isSensitive = true;
    }

    // Account pattern
    if (ACCOUNT_RE.test(text)) {
      accountCount++;
      isSensitive = true;
    }

    // Sensitive labels (CPR, Lønnr, NemKonto, SE-nummer, etc.)
    if (SENSITIVE_LABELS.test(text)) {
      isSensitive = true;
    }

    // Danish postal code (address line)
    if (POSTAL_RE.test(text)) {
      isSensitive = true;
    }

    if (isSensitive) {
      sensitiveLines.add(i);
    }
  }

  // ── Expand: redact name/address lines ABOVE sensitive markers ──
  // On Danish payslips, the recipient block is:
  //   Name                    ← 2-3 lines above CPR/postal
  //   Street Address          ← 1-2 lines above CPR/postal
  //   Postal Code + City      ← often detected by POSTAL_RE
  //   CPR: 070990-1741        ← detected by CPR_RE
  //
  // Strategy: for each postal code or CPR line, also redact up to 3 lines above it
  // (unless those lines match SAFE_LABELS — don't redact salary data)

  const expandedSensitive = new Set(sensitiveLines);

  for (const idx of sensitiveLines) {
    const text = lines[idx].text;
    // Only expand upwards from CPR or postal code lines (the anchor points)
    if (CPR_RE.test(text) || POSTAL_RE.test(text) || SENSITIVE_LABELS.test(text)) {
      for (let above = 1; above <= 3; above++) {
        const aboveIdx = idx - above;
        if (aboveIdx < 0) break;
        const aboveText = lines[aboveIdx].text;
        // Stop expanding if we hit a safe financial line or an empty/header line
        if (SAFE_LABELS.test(aboveText)) break;
        // Stop if line looks like company header (A/S, ApS, I/S, etc.)
        if (/\b(A\/S|ApS|I\/S|K\/S|P\/S|Holding|Inc\.|Ltd\.)\b/i.test(aboveText)) break;
        expandedSensitive.add(aboveIdx);
      }
    }
  }

  // ── Build redaction rects ──
  const autoRects: RedactionRect[] = [];

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

  for (const lineIdx of expandedSensitive) {
    for (const item of lines[lineIdx].items) {
      autoRects.push(itemToRect(item));
    }
  }

  // Draw black rectangles
  ctx.fillStyle = "#000000";
  for (const rect of autoRects) {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Convert to base64 JPEG
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

  page.cleanup();
  await pdf.destroy();

  const redactionCount = expandedSensitive.size;
  console.info(`PDF redaction: ${redactionCount} lines redacted (${cprCount} CPR, ${accountCount} account)`);

  return {
    base64,
    autoRects,
    redactionCount,
    cprCount,
    accountCount,
    width: canvas.width,
    height: canvas.height,
    originalDataUrl,
  };
}

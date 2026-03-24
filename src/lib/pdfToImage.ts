/**
 * Convert the first page of a PDF file to a JPEG image File.
 * Uses pdf.js (pdfjs-dist) to render client-side — no server needed.
 */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

// Use the bundled worker from pdfjs-dist
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Renders the first page of a PDF to a JPEG File object.
 * @param pdfFile  The uploaded PDF File
 * @param scale    Render scale (2 = 2× native resolution, good for OCR)
 * @param quality  JPEG quality 0–1
 * @returns A File object with type image/jpeg
 */
export async function pdfToImage(
  pdfFile: File,
  scale = 3,
  quality = 0.85,
): Promise<File> {
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

  // Convert canvas to JPEG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });

  // Clean up
  page.cleanup();
  await pdf.destroy();

  return new File([blob], pdfFile.name.replace(/\.pdf$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

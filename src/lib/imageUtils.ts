/**
 * Compress an image file to JPEG with max dimensions, stripping EXIF data.
 * PDFs are returned as-is (base64-encoded).
 * Returns { base64, mimeType } where base64 has no data:... prefix.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  // PDFs: send as-is
  if (file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { base64: btoa(binary), mimeType: "application/pdf" };
  }

  // Images: resize to max dimensions and compress as JPEG
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

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
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    img.src = url;
  });
}

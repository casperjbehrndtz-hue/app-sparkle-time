import { useRef, useState, useEffect, useCallback } from "react";
import { Undo2, Trash2, Check, X, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { RedactionRect } from "@/lib/cprRedact";

interface Props {
  /** Original image (data URL) before any redaction */
  originalDataUrl: string;
  /** Rectangles drawn by auto-redaction */
  autoRects: RedactionRect[];
  /** Canvas dimensions from cprRedact */
  width: number;
  height: number;
  /** Auto-detection counts for status display */
  cprCount: number;
  accountCount: number;
  /** User approves — returns manual rects */
  onApprove: (manualRects: RedactionRect[]) => void;
  /** User cancels — go back */
  onCancel: () => void;
}

export default function RedactionReview({
  originalDataUrl,
  autoRects,
  width,
  height,
  cprCount,
  accountCount,
  onApprove,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualRects, setManualRects] = useState<RedactionRect[]>([]);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgElement(img);
    img.src = originalDataUrl;
  }, [originalDataUrl]);

  // Get scale factor: canvas display size vs actual image size
  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return width / canvas.clientWidth;
  }, [width]);

  // Redraw canvas
  const redraw = useCallback(
    (currentDraw?: { startX: number; startY: number; curX: number; curY: number }) => {
      const canvas = canvasRef.current;
      if (!canvas || !imgElement) return;
      const ctx = canvas.getContext("2d")!;

      // Draw original image
      ctx.drawImage(imgElement, 0, 0, width, height);

      // Draw auto-redacted rects
      ctx.fillStyle = "#000000";
      for (const r of autoRects) {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      // Draw manual rects (slightly different shade for visual feedback)
      ctx.fillStyle = "#111111";
      for (const r of manualRects) {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      // Draw in-progress rect
      if (currentDraw) {
        const x = Math.min(currentDraw.startX, currentDraw.curX);
        const y = Math.min(currentDraw.startY, currentDraw.curY);
        const w = Math.abs(currentDraw.curX - currentDraw.startX);
        const h = Math.abs(currentDraw.curY - currentDraw.startY);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    },
    [imgElement, width, height, autoRects, manualRects],
  );

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer coordinate helper (works for mouse + touch)
  const getCoords = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scale = getScale();
      return {
        x: (e.clientX - rect.left) * scale,
        y: (e.clientY - rect.top) * scale,
      };
    },
    [getScale],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) canvas.setPointerCapture(e.pointerId);
      const { x, y } = getCoords(e);
      setDrawing({ startX: x, startY: y, curX: x, curY: y });
    },
    [getCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getCoords(e);
      const next = { ...drawing, curX: x, curY: y };
      setDrawing(next);
      redraw(next);
    },
    [drawing, getCoords, redraw],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getCoords(e);
      const rx = Math.min(drawing.startX, x);
      const ry = Math.min(drawing.startY, y);
      const rw = Math.abs(x - drawing.startX);
      const rh = Math.abs(y - drawing.startY);

      // Minimum size to avoid accidental taps
      if (rw > 5 && rh > 5) {
        setManualRects((prev) => [...prev, { x: rx, y: ry, w: rw, h: rh }]);
      }
      setDrawing(null);
    },
    [drawing, getCoords],
  );

  const handleUndo = useCallback(() => {
    setManualRects((prev) => prev.slice(0, -1));
  }, []);

  const handleClearManual = useCallback(() => {
    setManualRects([]);
  }, []);

  const totalRedacted = autoRects.length + manualRects.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold">{t("redaction.title")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("redaction.instruction")}</p>
      </div>

      {/* Status badge */}
      {(cprCount > 0 || accountCount > 0) && (
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="w-3 h-3" />
            {t("redaction.autoFound")
              .replace("{cpr}", String(cprCount))
              .replace("{account}", String(accountCount))}
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-border overflow-hidden bg-muted/20 touch-none"
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-auto cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={manualRects.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3 h-3" />
            {t("redaction.undo")}
          </button>
          <button
            onClick={handleClearManual}
            disabled={manualRects.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" />
            {t("redaction.clearMine")}
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {totalRedacted} {t("redaction.regions")}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t("redaction.cancel")}
        </button>
        <button
          onClick={() => onApprove(manualRects)}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {t("redaction.approve")}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
        {t("redaction.hint")}
      </p>
    </div>
  );
}

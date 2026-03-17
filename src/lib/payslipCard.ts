import type { ExtractedPayslip } from "./payslipTypes";
import { getDeductionLines } from "./payslipTypes";
import { formatKr } from "./budgetCalculator";

// ─── Canvas helpers ──────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Colors ──────────────────────
const C = {
  bg: "#1a1d23",
  text: "#f0eeea",
  textMuted: "#b4b2a9",
  textDim: "#9a9da5",
  textLabel: "#7a7d85",
  textFaint: "#555860",
  green: "#5dcaa5",
  red: "#E24B4A",
  orange: "#EF9F27",
  blue: "#378ADD",
  gray: "#888780",
  receiptBg: "#1f2229",
  receiptLine: "rgba(255,255,255,0.04)",
  divider: "rgba(255,255,255,0.08)",
  redactedBg: "#2a2d35",
};

export interface CardPercentile {
  rank: number;
  industry: string;
}

export async function exportPayslipCard(
  payslip: ExtractedPayslip,
  t: (key: string) => string,
  currencyLocale: string,
  mode: "clipboard" | "download" | "blob",
  sankeyCanvas?: HTMLCanvasElement,
  percentile?: CardPercentile,
): Promise<boolean | Blob> {
  const scale = 3;
  const S = (v: number) => v * scale;

  const fmt = (n: number) => formatKr(n, currencyLocale);
  const pct = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0;

  const deductions = getDeductionLines(payslip);
  const brutto = payslip.bruttolon;
  const netto = payslip.nettolon;
  const totalDeductions = brutto - netto;
  const netPct = pct(netto, brutto);

  const deductionColors: Record<string, string> = {
    aSkat: C.red, amBidrag: C.orange, pension: C.blue,
    atp: C.gray, other: "#64748b",
  };

  // ── Font helpers ──
  const sansFont = (weight: string, size: number) =>
    `${weight} ${S(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
  const monoFont = (weight: string, size: number) =>
    `${weight} ${S(size)}px "SF Mono", "Cascadia Code", "Consolas", "Courier New", monospace`;

  // ── Layout constants ──
  const pad = 32;
  const innerW = 560;
  const canvasW = innerW + pad * 2;

  // LAYER 1: Hero
  const heroH = 120;
  const chipH = 30;
  const hasChips = !!(payslip.anonJobTitle || payslip.anonIndustry || payslip.anonRegion);
  const layer1H = heroH + (hasChips ? chipH : 0) + 16;

  // LAYER 2: Receipt
  const receiptLines = payslip.receiptLines.length > 0
    ? payslip.receiptLines
    : buildFallbackReceipt(payslip, t);
  const receiptLineH = 22;
  const receiptPadY = 16;
  const receiptHeaderH = 28;
  const layer2H = receiptHeaderH + receiptPadY * 2 + receiptLines.length * receiptLineH + 8;

  // LAYER 3: Analysis
  const barH = 32;
  const legendH = 24;
  const statsH = 48;
  const rankH = percentile ? 44 : 0;
  const layer3H = 16 + barH + 8 + legendH + 16 + statsH + (rankH > 0 ? 12 + rankH : 0);

  const footerH = 44;
  const canvasH = pad + layer1H + layer2H + 16 + layer3H + 16 + footerH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = S(canvasW);
  canvas.height = S(canvasH);
  const ctx = canvas.getContext("2d")!;

  // ── Background ──
  ctx.fillStyle = C.bg;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, S(16));
  ctx.fill();

  let y = S(pad);

  // ═══════════════════════════════════════════════════
  // LAYER 1: HERO — the hook
  // ═══════════════════════════════════════════════════

  // Udbetalt — big green
  ctx.textAlign = "left";
  ctx.fillStyle = C.textLabel;
  ctx.font = sansFont("500", 11);
  ctx.letterSpacing = `${S(1.5)}px`;
  ctx.fillText("UDBETALT", S(pad), y + S(14));
  ctx.letterSpacing = "0px";

  ctx.fillStyle = C.green;
  ctx.font = sansFont("500", 42);
  ctx.fillText(`${fmt(netto)} kr.`, S(pad), y + S(62));

  // Right side: Bruttoløn + trækprocent
  ctx.textAlign = "right";
  ctx.fillStyle = C.textLabel;
  ctx.font = sansFont("500", 11);
  ctx.letterSpacing = `${S(1.5)}px`;
  ctx.fillText("BRUTTOLØN", S(canvasW - pad), y + S(14));
  ctx.letterSpacing = "0px";

  ctx.fillStyle = C.textMuted;
  ctx.font = sansFont("500", 24);
  ctx.fillText(`${fmt(brutto)} kr.`, S(canvasW - pad), y + S(42));

  // "Du beholder X%"
  ctx.fillStyle = C.textDim;
  ctx.font = sansFont("400", 13);
  ctx.fillText(`Du beholder ${netPct}%`, S(canvasW - pad), y + S(62));

  // Period
  if (payslip.payPeriod) {
    ctx.fillStyle = C.textLabel;
    ctx.font = sansFont("400", 11);
    ctx.fillText(payslip.payPeriod, S(canvasW - pad), y + S(80));
  }

  y += S(heroH);

  // Context chips
  if (hasChips) {
    ctx.textAlign = "left";
    ctx.font = sansFont("500", 11);
    const chips: string[] = [];
    if (payslip.anonJobTitle) chips.push(payslip.anonJobTitle);
    if (payslip.anonIndustry) chips.push(payslip.anonIndustry);
    if (payslip.anonRegion) chips.push(payslip.anonRegion);

    let chipX = S(pad);
    const chipPadX = S(10);
    const chipGap = S(6);
    const chipBH = S(22);

    for (const label of chips) {
      const tw = ctx.measureText(label).width;
      const cw = tw + chipPadX * 2;

      ctx.fillStyle = "rgba(255,255,255,0.05)";
      roundRect(ctx, chipX, y, cw, chipBH, chipBH / 2);
      ctx.fill();

      ctx.fillStyle = C.textDim;
      ctx.fillText(label, chipX + chipPadX, y + chipBH * 0.7);
      chipX += cw + chipGap;
    }
    y += S(chipH);
  }

  y += S(16);

  // ═══════════════════════════════════════════════════
  // LAYER 2: RAW RECEIPT — the proof
  // ═══════════════════════════════════════════════════

  const receiptY = y;
  const receiptW = S(innerW);

  // Receipt background
  ctx.fillStyle = C.receiptBg;
  roundRect(ctx, S(pad), receiptY, receiptW, S(layer2H), S(8));
  ctx.fill();

  // Subtle dashed border
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = S(1);
  ctx.setLineDash([S(4), S(4)]);
  roundRect(ctx, S(pad), receiptY, receiptW, S(layer2H), S(8));
  ctx.stroke();
  ctx.setLineDash([]);

  // Receipt header
  let ry = receiptY + S(receiptPadY);
  ctx.fillStyle = C.textLabel;
  ctx.font = monoFont("400", 9);
  ctx.textAlign = "left";
  ctx.letterSpacing = `${S(1)}px`;
  ctx.fillText("LØNSEDDEL — RÅ DATA", S(pad + 16), ry + S(10));
  ctx.letterSpacing = "0px";

  // Dashed separator
  ry += S(receiptHeaderH);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(S(pad + 16), ry - S(4), receiptW - S(32), S(1));

  // Receipt lines
  const lineLeft = S(pad + 16);
  const lineRight = S(canvasW - pad - 16);

  for (let i = 0; i < receiptLines.length; i++) {
    const line = receiptLines[i];
    const lineY = ry + i * S(receiptLineH);

    // Alternating subtle row bg
    if (i % 2 === 0) {
      ctx.fillStyle = C.receiptLine;
      ctx.fillRect(S(pad + 4), lineY, receiptW - S(8), S(receiptLineH));
    }

    if (line.type === "redacted") {
      // Redacted line — ████████ blocks
      ctx.fillStyle = C.textLabel;
      ctx.font = monoFont("400", 11);
      ctx.textAlign = "left";
      ctx.fillText(line.label, lineLeft, lineY + S(15));

      ctx.fillStyle = C.redactedBg;
      const blockW = S(80);
      ctx.fillRect(lineRight - blockW, lineY + S(4), blockW, S(14));
      ctx.fillStyle = "#3a3d45";
      ctx.font = monoFont("700", 11);
      ctx.textAlign = "center";
      ctx.fillText("████████", lineRight - blockW / 2, lineY + S(15));

    } else if (line.type === "subtotal") {
      // Subtotal — bolder, with line above
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(lineLeft, lineY + S(1), lineRight - lineLeft, S(1));

      ctx.fillStyle = C.text;
      ctx.font = monoFont("700", 11);
      ctx.textAlign = "left";
      ctx.fillText(line.label, lineLeft, lineY + S(15));

      ctx.textAlign = "right";
      ctx.fillText(line.amount, lineRight, lineY + S(15));

    } else {
      // Normal line
      const isIncome = line.type === "income";
      const isDeduction = line.type === "deduction";

      ctx.fillStyle = isIncome ? C.textMuted : isDeduction ? C.textDim : C.textLabel;
      ctx.font = monoFont("400", 11);
      ctx.textAlign = "left";
      ctx.fillText(line.label, lineLeft, lineY + S(15));

      if (line.amount && line.type !== "info") {
        ctx.fillStyle = isDeduction ? C.red : isIncome ? C.textMuted : C.textLabel;
        ctx.textAlign = "right";
        ctx.fillText(line.amount, lineRight, lineY + S(15));
      }
    }
  }

  y = receiptY + S(layer2H) + S(16);

  // ═══════════════════════════════════════════════════
  // LAYER 3: ANALYSIS — the value-add
  // ═══════════════════════════════════════════════════

  // Stacked bar
  const barBY = y;
  const barBH = S(barH);
  const barBW = S(innerW);
  const barBX = S(pad);
  const barGap = S(2);

  ctx.save();
  roundRect(ctx, barBX, barBY, barBW, barBH, S(6));
  ctx.clip();

  // Net first (green)
  let segX = barBX;
  const netW = (netto / brutto) * barBW;
  ctx.fillStyle = C.green;
  ctx.fillRect(segX, barBY, netW - barGap, barBH);
  segX += netW;

  // Deductions
  for (const d of deductions) {
    const segW = (d.amount / brutto) * barBW;
    ctx.fillStyle = deductionColors[d.key] || C.gray;
    ctx.fillRect(segX, barBY, Math.max(0, segW - barGap / scale), barBH);
    segX += segW;
  }
  ctx.restore();

  y = barBY + barBH + S(8);

  // Legend
  ctx.font = sansFont("400", 11);
  ctx.textAlign = "left";
  let legendX = S(pad);

  const legendItems = [
    { label: `Netto ${netPct}%`, color: C.green },
    ...deductions.slice(0, 4).map(d => ({
      label: `${(d.i18nKey.startsWith("__raw:") ? d.i18nKey.slice(6) : t(d.i18nKey)).split(" (")[0]} ${pct(d.amount, brutto)}%`,
      color: deductionColors[d.key] || C.gray,
    })),
  ];

  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    roundRect(ctx, legendX, y, S(8), S(8), S(2));
    ctx.fill();
    ctx.fillStyle = C.textDim;
    const legendLabel = item.label;
    ctx.fillText(legendLabel, legendX + S(12), y + S(8));
    legendX += ctx.measureText(legendLabel).width + S(24);
  }

  y += S(legendH + 16);

  // Engagement trigger: effective tax rate
  const effectiveRate = brutto > 0 ? ((totalDeductions / brutto) * 100).toFixed(1) : "0";
  const triggerY = y;
  const triggerH = S(statsH);

  ctx.fillStyle = "rgba(93,202,165,0.08)";
  roundRect(ctx, S(pad), triggerY, S(innerW), triggerH, S(8));
  ctx.fill();

  ctx.fillStyle = C.green;
  ctx.font = sansFont("400", 13);
  ctx.textAlign = "left";
  const t1 = "Din reelle skattebelastning: ";
  ctx.fillText(t1, S(pad + 16), triggerY + S(22));

  const t1w = ctx.measureText(t1).width;
  ctx.font = sansFont("600", 17);
  ctx.fillText(`${effectiveRate}%`, S(pad + 16) + t1w, triggerY + S(22));

  ctx.fillStyle = C.textLabel;
  ctx.font = sansFont("400", 11);
  ctx.fillText(
    `Inkl. AM-bidrag og pension betaler du ${fmt(totalDeductions)} kr. i skat og bidrag`,
    S(pad + 16), triggerY + S(40),
  );

  y = triggerY + triggerH;

  // Percentile rank badge
  if (percentile) {
    y += S(12);
    const badgeY = y;
    const badgeBH = S(rankH);
    const isTop = percentile.rank >= 50;
    const badgeColor = isTop ? C.green : C.blue;

    ctx.fillStyle = isTop ? "rgba(93,202,165,0.08)" : "rgba(55,138,221,0.08)";
    roundRect(ctx, S(pad), badgeY, S(innerW), badgeBH, S(8));
    ctx.fill();

    const rankLabel = t("payslip.card.rankBadge")
      .replace("{pct}", String(percentile.rank))
      .replace("{industry}", percentile.industry);

    ctx.fillStyle = badgeColor;
    ctx.font = sansFont("500", 14);
    ctx.textAlign = "center";
    ctx.fillText(rankLabel, canvas.width / 2, badgeY + badgeBH * 0.6);

    y += badgeBH;
  }

  y += S(16);

  // ── FOOTER ──
  ctx.fillStyle = C.divider;
  ctx.fillRect(S(pad), y, S(innerW), S(1));
  y += S(16);

  ctx.textAlign = "left";
  ctx.fillStyle = C.textFaint;
  ctx.font = sansFont("400", 12);
  ctx.fillText("Lavet med ", S(pad), y + S(14));

  const madeW = ctx.measureText("Lavet med ").width;
  ctx.fillStyle = C.green;
  ctx.font = sansFont("500", 12);
  ctx.fillText("Kassen.dk", S(pad) + madeW, y + S(14));

  const kassenW = ctx.measureText("Kassen.dk").width;
  ctx.fillStyle = C.textFaint;
  ctx.font = sansFont("400", 12);
  ctx.fillText(" — gratis budgetværktøj", S(pad) + madeW + kassenW, y + S(14));

  // ── Export ──
  return new Promise<boolean | Blob>((resolve) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return resolve(false);

        if (mode === "blob") {
          resolve(blob);
          return;
        }

        if (mode === "clipboard") {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            resolve(true);
            return;
          } catch {
            // Falls through to download
          }
        }

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "min-lonseddel-kassen.png";
        a.click();
        URL.revokeObjectURL(a.href);
        resolve(true);
      },
      "image/png",
    );
  });
}

/**
 * Build fallback receipt lines from structured data
 * when OCR doesn't return receiptLines.
 */
function buildFallbackReceipt(
  p: ExtractedPayslip,
  t: (key: string) => string,
): ExtractedPayslip["receiptLines"] {
  const lines: ExtractedPayslip["receiptLines"] = [];
  const fmtAmt = (n: number, neg = false) => {
    const s = n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return neg ? `-${s}` : s;
  };

  // Redacted personal info
  lines.push({ label: "Medarbejder", amount: "████████", type: "redacted" });
  if (p.employerName) {
    lines.push({ label: "Arbejdsgiver", amount: "████████", type: "redacted" });
  }

  // Pay components
  if (p.payComponents.length > 0) {
    for (const pc of p.payComponents) {
      lines.push({ label: pc.name, amount: fmtAmt(pc.amount), type: "income" });
    }
  } else {
    lines.push({ label: "Månedsløn", amount: fmtAmt(p.bruttolon), type: "income" });
  }

  // Bruttoløn subtotal
  lines.push({ label: "Bruttoløn", amount: fmtAmt(p.bruttolon), type: "subtotal" });

  // Deductions
  if (p.pensionEmployee > 0)
    lines.push({ label: "Eget pensionsbidrag", amount: fmtAmt(p.pensionEmployee, true), type: "deduction" });
  if (p.atp > 0)
    lines.push({ label: "ATP", amount: fmtAmt(p.atp, true), type: "deduction" });
  if (p.amBidrag > 0)
    lines.push({ label: "AM-bidrag", amount: fmtAmt(p.amBidrag, true), type: "deduction" });
  if (p.aSkat > 0)
    lines.push({ label: `A-skat${p.traekkort > 0 ? ` (${p.traekkort}%)` : ""}`, amount: fmtAmt(p.aSkat, true), type: "deduction" });

  // Other deductions
  for (const od of p.otherDeductions) {
    lines.push({ label: od.name, amount: fmtAmt(od.amount, true), type: "deduction" });
  }

  // Optional known deductions
  if (p.fagforening) lines.push({ label: "Fagforening", amount: fmtAmt(p.fagforening, true), type: "deduction" });
  if (p.sundhedsforsikring) lines.push({ label: "Sundhedsforsikring", amount: fmtAmt(p.sundhedsforsikring, true), type: "deduction" });

  // Nettoløn
  lines.push({ label: "Til disposition", amount: fmtAmt(p.nettolon), type: "subtotal" });

  // Employer pension (info)
  if (p.pensionEmployer > 0) {
    lines.push({ label: "Firmabidrag pension", amount: `+${fmtAmt(p.pensionEmployer)}`, type: "info" });
  }

  return lines;
}

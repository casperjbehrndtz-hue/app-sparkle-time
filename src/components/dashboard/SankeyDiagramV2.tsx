import { useMemo, useState, useRef, useCallback } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from "d3-sankey";
import { motion } from "framer-motion";
import { Eye, EyeOff, Download, Check, Share2 } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

const CAT_COLORS: Record<string, string> = {
  Bolig: "hsl(var(--primary))",
  Forsyning: "hsl(var(--flow-health))",
  Transport: "hsl(var(--nemt-blue))",
  Abonnementer: "hsl(var(--flow-subscriptions))",
  Forsikring: "hsl(var(--nemt-gold))",
  Fagforening: "hsl(var(--nemt-green))",
  Børn: "hsl(var(--flow-children))",
  Kæledyr: "hsl(var(--flow-pets))",
  Lån: "hsl(var(--destructive))",
  Fitness: "hsl(var(--nemt-blue))",
  Opsparing: "hsl(var(--flow-savings))",
  "Mad & dagligvarer": "hsl(var(--flow-food))",
  Fritid: "hsl(var(--flow-leisure))",
  Tøj: "hsl(var(--flow-clothing))",
  Sundhed: "hsl(var(--flow-health))",
  Restaurant: "hsl(var(--flow-restaurant))",
  Andet: "hsl(var(--muted-foreground))",
};

function getColor(name: string): string {
  return CAT_COLORS[name] || "hsl(var(--muted-foreground))";
}

interface NodeExtra { name: string; color: string; }
interface LinkExtra { color: string; }

const MAX_CATEGORIES = 8;

// ─── Canvas helpers ──────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

interface ExportMeta {
  income: string;
  expenses: string;
  disposable: string;
  disposablePositive: boolean;
  title: string;
  date: string;
  incomeLabel: string;
  expensesLabel: string;
  disposableLabel: string;
  categories: { name: string; pct: number; amount?: string; color: string }[];
  madeWith: string;
}

// ─── Export: premium financial card ──────────────────────
async function exportSankeyCard(
  svgEl: SVGSVGElement,
  meta: ExportMeta,
  mode: "clipboard" | "download",
): Promise<boolean> {
  const scale = 3; // 3x for ultra-sharp
  const svgRect = svgEl.getBoundingClientRect();
  const S = (v: number) => v * scale;

  // Card dimensions
  const cardPad = 40;
  const headerH = 90;
  const statsH = 64;
  const diagramPadY = 16;
  const footerH = 56;
  const innerW = svgRect.width;
  const canvasW = innerW + cardPad * 2;
  const canvasH = headerH + statsH + diagramPadY + svgRect.height + diagramPadY + footerH + cardPad * 2;

  // Clone SVG for rendering
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.querySelectorAll("text").forEach(t => t.setAttribute("fill", "#1e293b"));
  clone.querySelectorAll("[style]").forEach(el => {
    const s = el.getAttribute("style") || "";
    if (s.includes("transform-origin")) el.setAttribute("style", s);
  });

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  return new Promise<boolean>((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = S(canvasW);
      canvas.height = S(canvasH);
      const ctx = canvas.getContext("2d")!;

      // ── Background: subtle warm gradient ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, "#fafbfc");
      bgGrad.addColorStop(1, "#f1f5f9");
      ctx.fillStyle = bgGrad;
      roundRect(ctx, 0, 0, canvas.width, canvas.height, S(20));
      ctx.fill();

      // ── Outer border ──
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = S(1);
      roundRect(ctx, S(0.5), S(0.5), canvas.width - S(1), canvas.height - S(1), S(20));
      ctx.stroke();

      let y = S(cardPad);

      // ── Header ──
      const font = (weight: string, size: number) =>
        `${weight} ${S(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;

      ctx.fillStyle = "#0f172a";
      ctx.font = font("800", 22);
      ctx.textAlign = "left";
      ctx.fillText(meta.title, S(cardPad), y + S(28));

      ctx.fillStyle = "#94a3b8";
      ctx.font = font("500", 12);
      ctx.fillText(meta.date, S(cardPad), y + S(50));

      // ── Accent line under header ──
      y += S(headerH);
      const accentGrad = ctx.createLinearGradient(S(cardPad), 0, S(canvasW - cardPad), 0);
      accentGrad.addColorStop(0, "#3b82f6");
      accentGrad.addColorStop(0.5, "#6366f1");
      accentGrad.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = accentGrad;
      roundRect(ctx, S(cardPad), y - S(headerH - 65), S(canvasW - cardPad * 2), S(3), S(1.5));
      ctx.fill();

      // ── Stats bar: Income → Expenses → Disposable ──
      const statsY = y;
      const statW = (canvasW - cardPad * 2 - 24) / 3; // 3 stat boxes, 12px gap each
      const statBoxes = [
        { label: meta.incomeLabel, value: meta.income, color: "hsl(var(--primary))", bgFrom: "#eff6ff", bgTo: "#dbeafe" },
        { label: meta.expensesLabel, value: meta.expenses, color: "#64748b", bgFrom: "#f8fafc", bgTo: "#f1f5f9" },
        { label: meta.disposableLabel, value: meta.disposable, color: meta.disposablePositive ? "#059669" : "#dc2626", bgFrom: meta.disposablePositive ? "#ecfdf5" : "#fef2f2", bgTo: meta.disposablePositive ? "#d1fae5" : "#fee2e2" },
      ];

      statBoxes.forEach((stat, i) => {
        const bx = S(cardPad + i * (statW + 12));
        const by = statsY;
        const bw = S(statW);
        const bh = S(statsH - 8);

        // Stat box background
        const sbg = ctx.createLinearGradient(bx, by, bx, by + bh);
        sbg.addColorStop(0, stat.bgFrom);
        sbg.addColorStop(1, stat.bgTo);
        ctx.fillStyle = sbg;
        roundRect(ctx, bx, by, bw, bh, S(10));
        ctx.fill();

        // Stat box border
        ctx.strokeStyle = stat.color + "20";
        ctx.lineWidth = S(1);
        roundRect(ctx, bx, by, bw, bh, S(10));
        ctx.stroke();

        // Label
        ctx.fillStyle = "#64748b";
        ctx.font = font("600", 9);
        ctx.textAlign = "left";
        ctx.fillText(stat.label.toUpperCase(), bx + S(12), by + S(20));

        // Value
        ctx.fillStyle = stat.color;
        ctx.font = font("800", 16);
        ctx.fillText(stat.value, bx + S(12), by + S(42));
      });

      y = statsY + S(statsH + diagramPadY);

      // ── Sankey diagram ──
      ctx.drawImage(img, S(cardPad), y, S(innerW), S(svgRect.height));

      y += S(svgRect.height + diagramPadY);

      // ── Footer separator ──
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = S(1);
      ctx.beginPath();
      ctx.moveTo(S(cardPad), y);
      ctx.lineTo(S(canvasW - cardPad), y);
      ctx.stroke();

      y += S(20);

      // ── Footer: mini category dots + brand ──
      // Category dots (top 5 as legend)
      const topCats = meta.categories.slice(0, 5);
      let dotX = S(cardPad);
      topCats.forEach(cat => {
        ctx.fillStyle = cat.color;
        ctx.beginPath();
        ctx.arc(dotX + S(4), y + S(4), S(4), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#64748b";
        ctx.font = font("500", 9);
        ctx.textAlign = "left";
        const catLabel = cat.amount ? `${cat.name} ${cat.amount}` : `${cat.name} ${cat.pct}%`;
        ctx.fillText(catLabel, dotX + S(12), y + S(7));
        dotX += S(ctx.measureText(catLabel).width / scale + 24);
      });

      // Brand: nemtbudget.nu with accent
      ctx.textAlign = "right";
      ctx.fillStyle = "#94a3b8";
      ctx.font = font("500", 10);
      const brandX = S(canvasW - cardPad);
      const madeLabel = meta.madeWith;
      const madeW = ctx.measureText(madeLabel).width;
      ctx.fillText(madeLabel, brandX - madeW / scale - S(72), y + S(7));
      ctx.fillStyle = "#3b82f6";
      ctx.font = font("700", 11);
      ctx.fillText("nemtbudget.nu", brandX, y + S(7));

      // ── Export ──
      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false);

        if (mode === "clipboard") {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            resolve(true);
            return;
          } catch {
            // Falls through to download
          }
        }

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mit-budget-nemtbudget.png";
        a.click();
        URL.revokeObjectURL(a.href);
        resolve(true);
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
}

// ─── Stacked Bar (mobile) ──────────────────────
function StackedBarView({ categories, income, disposable, lc, t, tc, privacyMode }: {
  categories: { name: string; total: number; color: string }[];
  income: number;
  disposable: number;
  lc: string;
  t: (key: string) => string;
  tc: (name: string) => string;
  privacyMode: boolean;
}) {
  const fmt = (v: number) => privacyMode ? `${income > 0 ? Math.round((v / income) * 100) : 0}%` : `${formatKr(v, lc)} kr.`;

  return (
    <div className="space-y-3">
      <div className="h-6 rounded-xl overflow-hidden flex shadow-inner">
        {categories.map((cat, i) => {
          const pct = income > 0 ? (cat.total / income) * 100 : 0;
          return (
            <motion.div
              key={cat.name}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
              style={{ backgroundColor: cat.color }}
              className="h-full"
              title={`${tc(cat.name)}: ${fmt(cat.total)}`}
            />
          );
        })}
        {disposable > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(disposable / income) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: categories.length * 0.04 }}
            className="h-full bg-primary/30"
          />
        )}
      </div>

      <div className="space-y-1">
        {categories.map((cat, i) => {
          const pct = income > 0 ? Math.round((cat.total / income) * 100) : 0;
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="flex items-center gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{tc(cat.name)}</span>
              <span className="text-xs font-medium tabular-nums">{fmt(cat.total)}</span>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums w-7 text-right">{pct}%</span>
            </motion.div>
          );
        })}
        {disposable > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + categories.length * 0.04 }}
            className="flex items-center gap-2 pt-1 border-t border-border/50"
          >
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-primary/30" />
            <span className="text-xs font-medium text-primary flex-1">{t("sankey.leftOver")}</span>
            <span className="text-xs font-bold text-primary tabular-nums">{fmt(disposable)}</span>
            <span className="text-[10px] text-primary/60 tabular-nums w-7 text-right">{income > 0 ? Math.round((disposable / income) * 100) : 0}%</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Sankey Desktop ──────────────────────
function SankeyView({ budget, profile, categories, disposable, lc, t, tc, privacyMode, svgRef, compact }: {
  budget: ComputedBudget;
  profile?: BudgetProfile;
  categories: { name: string; total: number; color: string }[];
  disposable: number;
  lc: string;
  t: (key: string) => string;
  tc: (name: string) => string;
  privacyMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const fmt = useCallback((v: number) =>
    privacyMode ? `${budget.totalIncome > 0 ? Math.round((v / budget.totalIncome) * 100) : 0}%` : `${formatKr(v, lc)} kr.`
  , [privacyMode, budget.totalIncome, lc]);

  const { nodes, links, width, height, incomeCount } = useMemo(() => {
    const nodeList: NodeExtra[] = [];
    const linkList: { source: number; target: number; value: number; color: string }[] = [];

    const incomeSources: { name: string; amount: number }[] = [];
    if (profile) {
      if (profile.income > 0) incomeSources.push({ name: t("sankey.salary"), amount: profile.income });
      if (profile.partnerIncome > 0) incomeSources.push({ name: t("sankey.partner"), amount: profile.partnerIncome });
      if (profile.additionalIncome?.length) {
        profile.additionalIncome.forEach(src => {
          if (src.amount > 0) {
            const monthly = src.frequency === "monthly" ? src.amount : src.frequency === "quarterly" ? Math.round(src.amount / 3) : src.frequency === "biannual" ? Math.round(src.amount / 6) : Math.round(src.amount / 12);
            if (monthly > 0) incomeSources.push({ name: src.label || t("sankey.otherIncome"), amount: monthly });
          }
        });
      }
    }
    if (incomeSources.length === 0) incomeSources.push({ name: t("sankey.income"), amount: budget.totalIncome });

    incomeSources.forEach(src => { nodeList.push({ name: src.name, color: "hsl(var(--primary))" }); });
    const incN = incomeSources.length;
    const catStart = incN;
    categories.forEach(cat => { nodeList.push({ name: cat.name, color: cat.color }); });
    if (disposable > 0) nodeList.push({ name: t("sankey.leftOver"), color: "hsl(var(--nemt-green))" });

    const totalInc = incomeSources.reduce((s, src) => s + src.amount, 0);
    incomeSources.forEach((src, si) => {
      const share = totalInc > 0 ? src.amount / totalInc : 1 / incomeSources.length;
      categories.forEach((cat, ci) => {
        const val = Math.round(cat.total * share);
        if (val > 0) linkList.push({ source: si, target: catStart + ci, value: val, color: cat.color });
      });
      if (disposable > 0) {
        const val = Math.round(disposable * share);
        if (val > 0) linkList.push({ source: si, target: catStart + categories.length, value: val, color: "hsl(var(--nemt-green))" });
      }
    });

    const W = compact ? 500 : 700;
    const LEFT_MARGIN = compact ? 90 : 130;
    const RIGHT_MARGIN = compact ? 120 : 180;
    const rightCount = categories.length + (disposable > 0 ? 1 : 0);
    const maxSide = Math.max(rightCount, incN);
    const pad = 12;
    const H = Math.max(300, maxSide * (pad + 28) + 40);

    // Guard: d3-sankey crashes if no links or disconnected nodes
    if (linkList.length === 0 || nodeList.length < 2) {
      return { nodes: [], links: [], width: W, height: H, incomeCount: 0 };
    }

    const graph = d3Sankey<NodeExtra, LinkExtra>()
      .nodeWidth(8).nodePadding(pad).nodeAlign(sankeyJustify)
      .extent([[LEFT_MARGIN, 20], [W - RIGHT_MARGIN, H - 20]])({
        nodes: nodeList.map(n => ({ ...n })),
        links: linkList.map(l => ({ ...l })),
      });

    // Post-process: compact income nodes so they don't stretch across full height
    // When left side has few nodes (e.g. 2) and right side has many (e.g. 9),
    // sankeyJustify spreads left nodes too far apart, making them look disproportionately tall
    if (incN >= 1 && incN <= 3) {
      const rightNodes = graph.nodes.slice(incN);
      const rightMin = Math.min(...rightNodes.map(n => n.y0 ?? 0));
      const rightMax = Math.max(...rightNodes.map(n => n.y1 ?? 0));
      const rightCenter = (rightMin + rightMax) / 2;

      const incomeNodes = graph.nodes.slice(0, incN);
      const totalBarH = incomeNodes.reduce((s, n) => s + ((n.y1 ?? 0) - (n.y0 ?? 0)), 0);
      const totalWithPad = totalBarH + (incN - 1) * pad;

      let startY = Math.max(20, Math.min(rightCenter - totalWithPad / 2, H - 20 - totalWithPad));

      incomeNodes.forEach((n) => {
        const h = (n.y1 ?? 0) - (n.y0 ?? 0);
        const delta = startY - (n.y0 ?? 0);

        n.y0 = startY;
        n.y1 = startY + h;

        // Shift outgoing link y0 positions to match new node position
        graph.links.forEach(link => {
          if (link.source === n) {
            (link as any).y0 = ((link as any).y0 ?? 0) + delta;
          }
        });

        startY += h + pad;
      });
    }

    return { nodes: graph.nodes, links: graph.links, width: W, height: H, incomeCount: incN };
  }, [categories, disposable, profile, budget.totalIncome, t, compact]);

  const linkPath = sankeyLinkHorizontal();
  const leftOverLabel = t("sankey.leftOver");

  const grads = useMemo(() => links.map((link, i) => {
    const src = typeof link.source === "object" ? link.source : null;
    return { id: `sg-${i}`, from: src?.color || "hsl(var(--primary))", to: (link as any).color || "#ccc" };
  }), [links]);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: Math.min(height, 480) }} preserveAspectRatio="xMidYMid meet">
      <defs>
        {grads.map(g => (
          <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={g.from} stopOpacity="0.55" />
            <stop offset="100%" stopColor={g.to} stopOpacity="0.75" />
          </linearGradient>
        ))}
      </defs>

      {links.map((link, i) => {
        const d = linkPath(link as any);
        if (!d) return null;
        const src = typeof link.source === "object" ? link.source : null;
        const tgt = typeof link.target === "object" ? link.target : null;
        const related = !hovered || tgt?.name === hovered || src?.name === hovered;

        return (
          <motion.path
            key={`l-${i}`}
            d={d} fill="none" stroke={`url(#sg-${i})`}
            strokeWidth={Math.max(1.5, link.width || 1)}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: !hovered ? 0.45 : related ? 0.75 : 0.06 }}
            transition={{ pathLength: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.06 + i * 0.025 }, opacity: { duration: 0.2 } }}
            onMouseEnter={() => setHovered(tgt?.name || src?.name || null)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}

      {nodes.map((node, i) => {
        const x0 = node.x0 ?? 0, x1 = node.x1 ?? 0, y0 = node.y0 ?? 0, y1 = node.y1 ?? 0;
        const w = x1 - x0, h = y1 - y0;
        const isSource = i < incomeCount;
        const isLeftOver = node.name === leftOverLabel;
        const active = !hovered || hovered === node.name
          || (isSource && !categories.some(c => c.name === hovered) && hovered !== leftOverLabel)
          || (!isSource && !nodes.slice(0, incomeCount).some(n => n.name === hovered));
        const pct = budget.totalIncome > 0 ? Math.round(((node.value ?? 0) / budget.totalIncome) * 100) : 0;

        return (
          <g key={`n-${i}`}
            onMouseEnter={() => setHovered(node.name)}
            onMouseLeave={() => setHovered(null)}
          >
            <motion.rect x={x0} y={y0} width={w} height={h} rx={4}
              fill={isLeftOver ? "hsl(var(--nemt-green))" : node.color}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: active ? 1 : 0.2, scaleY: 1 }}
              transition={{ scaleY: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.03 + i * 0.025 }, opacity: { duration: 0.2 } }}
              style={{ transformOrigin: `${x0 + w / 2}px ${y0 + h / 2}px` }}
            />

            {isSource ? (
              <text x={x0 - 8} y={y0 + h / 2} textAnchor="end" dominantBaseline="central" fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>
                <tspan fontSize={compact ? 11 : 13} fontWeight={700}>{node.name}</tspan>
                <tspan x={x0 - 8} dy={compact ? 14 : 17} fontSize={compact ? 9 : 11} fontWeight={500} opacity={0.5} textAnchor="end">{fmt(node.value ?? 0)}</tspan>
              </text>
            ) : (
              <text x={x1 + 8} y={y0 + h / 2} dominantBaseline="central" fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>
                <tspan fontSize={compact ? (isLeftOver ? 11 : 10) : (isLeftOver ? 13 : 12)} fontWeight={isLeftOver ? 800 : 600}>
                  {isLeftOver ? node.name : tc(node.name)}
                </tspan>
                <tspan dx={compact ? 3 : 6} fontSize={compact ? 9 : 11} fontWeight={500} opacity={0.5}>
                  {fmt(node.value ?? 0)}
                </tspan>
                {!privacyMode && <tspan dx={compact ? 2 : 4} fontSize={compact ? 8 : 10} opacity={0.35}>{pct}%</tspan>}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Export ──────────────────────
export function SankeyDiagramV2({ budget, profile }: Props) {
  const isMobile = useIsMobile();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const { t } = useI18n();
  const tc = (name: string) => t(`cat.${name}`) || name;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [exported, setExported] = useState<false | "clipboard" | "download">(false);

  const { categories, disposable } = useMemo(() => {
    const map = new Map<string, number>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach(e => {
      if (e.amount <= 0) return;
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

    let cats: { name: string; total: number; color: string }[];
    if (sorted.length > MAX_CATEGORIES) {
      const top = sorted.slice(0, MAX_CATEGORIES - 1);
      const rest = sorted.slice(MAX_CATEGORIES - 1);
      const otherTotal = rest.reduce((s, [, v]) => s + v, 0);
      cats = [
        ...top.map(([name, total]) => ({ name, total, color: getColor(name) })),
        { name: "Andet", total: otherTotal, color: getColor("Andet") },
      ];
    } else {
      cats = sorted.map(([name, total]) => ({ name, total, color: getColor(name) }));
    }

    return { categories: cats, disposable: Math.max(0, budget.disposableIncome) };
  }, [budget]);

  const handleExport = useCallback(async (mode: "clipboard" | "download") => {
    if (!svgRef.current) return;
    const lc = locale.currencyLocale;
    const fmtVal = (v: number) =>
      privacyMode
        ? `${budget.totalIncome > 0 ? Math.round((v / budget.totalIncome) * 100) : 0}%`
        : formatKr(v, lc) + " kr.";
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString(locale.code === "no" ? "nb-NO" : "da-DK", { month: "long" }));
    const meta: ExportMeta = {
      income: privacyMode ? "100%" : formatKr(budget.totalIncome, lc) + " kr.",
      expenses: fmtVal(budget.totalExpenses),
      disposable: (budget.disposableIncome >= 0 ? "+" : "") + fmtVal(budget.disposableIncome),
      disposablePositive: budget.disposableIncome >= 0,
      title: t("sankey.incomeDistribution"),
      date: `${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()}`,
      incomeLabel: t("sankey.income"),
      expensesLabel: t("sankey.expenses"),
      disposableLabel: t("sankey.leftOver"),
      madeWith: t("sankey.exportMadeWith"),
      categories: categories.map(c => ({
        name: tc(c.name),
        pct: budget.totalIncome > 0 ? Math.round((c.total / budget.totalIncome) * 100) : 0,
        amount: privacyMode ? undefined : formatKr(c.total, lc) + " kr.",
        color: c.color,
      })),
    };
    const ok = await exportSankeyCard(svgRef.current, meta, mode);
    if (ok) {
      setExported(mode);
      setTimeout(() => setExported(false), 2500);
    }
  }, [privacyMode, budget, categories, t, tc, locale]);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => setPrivacyMode(p => !p)} title={t("sankey.privacyTip")}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${privacyMode ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40"}`}>
          {privacyMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span className="hidden sm:inline">{t("sankey.privacy")}</span>
        </button>
        {!isMobile && (
          <>
            <button onClick={() => handleExport("clipboard")} title={t("sankey.shareTip")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${exported === "clipboard" ? "bg-emerald-500 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40"}`}>
              {exported === "clipboard" ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              <span className="hidden sm:inline">{exported === "clipboard" ? t("sankey.copied") : t("sankey.share")}</span>
            </button>
            <button onClick={() => handleExport("download")} title={t("sankey.exportTip")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${exported === "download" ? "bg-emerald-500 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40"}`}>
              {exported === "download" ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
              <span className="hidden sm:inline">{exported === "download" ? t("sankey.copied") : t("sankey.export")}</span>
            </button>
          </>
        )}
      </div>

      {/* Diagram */}
      <div className="rounded-xl bg-card border border-border/40 p-3 sm:p-4" role="img" aria-label={t("a11y.sankeyTable")}>
        <SankeyView budget={budget} profile={profile} categories={categories} disposable={disposable} lc={lc} t={t} tc={tc} privacyMode={privacyMode} svgRef={svgRef} compact={isMobile} />
        <div className="sr-only" role="table" aria-label={t("a11y.sankeyTable")}>
          <div role="rowgroup">
            <div role="row">
              <span role="columnheader">{t("a11y.chartSummary")}</span>
            </div>
          </div>
          <div role="rowgroup">
            {categories.map((cat) => (
              <div role="row" key={cat.name}>
                <span role="cell">{tc(cat.name)}: {formatKr(cat.total, lc)} kr. ({budget.totalIncome > 0 ? Math.round((cat.total / budget.totalIncome) * 100) : 0}%)</span>
              </div>
            ))}
            {disposable > 0 && (
              <div role="row">
                <span role="cell">{t("sankey.leftOver")}: {formatKr(disposable, lc)} kr. ({budget.totalIncome > 0 ? Math.round((disposable / budget.totalIncome) * 100) : 0}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

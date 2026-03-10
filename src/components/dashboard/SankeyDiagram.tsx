import { useMemo, useState } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from "d3-sankey";
import { motion } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

const CAT_COLORS: Record<string, string> = {
  Bolig: "#1e3a5f",
  Forsyning: "#5ba3cf",
  Transport: "#c4956a",
  Abonnementer: "#9b8ec4",
  Forsikring: "#dbb870",
  Fagforening: "#e05050",
  Børn: "#6abf6a",
  Kæledyr: "#a0a0a0",
  Lån: "#e07070",
  Fitness: "#c4956a",
  Opsparing: "#2e86c1",
  "Mad & dagligvarer": "#4caf93",
  Fritid: "#f4a460",
  Tøj: "#dbb870",
  Sundhed: "#d4a0d4",
  Restaurant: "#f0a070",
  Andet: "#b0b0b0",
};

function getColor(name: string): string {
  return CAT_COLORS[name] || "#b0b0b0";
}

interface NodeExtra { name: string; color: string; }
interface LinkExtra { color: string; }
type SNode = D3SankeyNode<NodeExtra, LinkExtra>;
type SLink = D3SankeyLink<NodeExtra, LinkExtra>;

// ─── Stacked Bar (mobile) ──────────────────────
function StackedBarView({ categories, income, disposable }: {
  categories: { name: string; total: number; color: string }[];
  income: number;
  disposable: number;
}) {
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">Indkomst fordelt på udgifter</p>
        <div className="h-6 rounded-lg overflow-hidden flex">
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
                title={`${cat.name}: ${formatKr(cat.total)} kr.`}
              />
            );
          })}
          {disposable > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(disposable / income) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: categories.length * 0.04 }}
              className="h-full bg-primary/30"
              title={`Til overs: ${formatKr(disposable)} kr.`}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
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
              <span className="text-xs text-muted-foreground flex-1 truncate">{cat.name}</span>
              <span className="text-xs font-medium tabular-nums">{formatKr(cat.total)}</span>
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
            <span className="text-xs font-medium text-primary flex-1">Til overs</span>
            <span className="text-xs font-bold text-primary tabular-nums">{formatKr(disposable)}</span>
            <span className="text-[10px] text-primary/60 tabular-nums w-7 text-right">{Math.round((disposable / income) * 100)}%</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Sankey (desktop) ──────────────────────
function SankeyView({ budget, profile, categories, disposable }: {
  budget: ComputedBudget;
  profile?: BudgetProfile;
  categories: { name: string; total: number; color: string }[];
  disposable: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { nodes, links, width, height, incomeCount } = useMemo(() => {
    const nodeList: NodeExtra[] = [];
    const linkList: { source: number; target: number; value: number; color: string }[] = [];

    // Col 0: Income sources
    const incomeSources: { name: string; amount: number }[] = [];
    if (profile) {
      if (profile.income > 0) incomeSources.push({ name: "Løn", amount: profile.income });
      if (profile.partnerIncome > 0) incomeSources.push({ name: "Partner", amount: profile.partnerIncome });
      if (profile.additionalIncome?.length) {
        profile.additionalIncome.forEach(src => {
          if (src.amount > 0) {
            const monthly = src.frequency === "monthly" ? src.amount
              : src.frequency === "quarterly" ? Math.round(src.amount / 3)
              : src.frequency === "biannual" ? Math.round(src.amount / 6)
              : Math.round(src.amount / 12);
            if (monthly > 0) incomeSources.push({ name: src.label || "Øvrig", amount: monthly });
          }
        });
      }
    }
    // Fallback: single node if no profile or only one source
    if (incomeSources.length === 0) {
      incomeSources.push({ name: "Indkomst", amount: budget.totalIncome });
    }

    const INCOME_COLOR = "#1565c0";
    incomeSources.forEach(src => {
      nodeList.push({ name: src.name, color: INCOME_COLOR });
    });
    const incomeNodeCount = incomeSources.length;

    // Col 1: Categories + disposable
    const catStartIdx = incomeNodeCount;
    categories.forEach(cat => {
      nodeList.push({ name: cat.name, color: cat.color });
    });
    if (disposable > 0) {
      nodeList.push({ name: "Til overs", color: "#2e86c1" });
    }

    // Links: each income source → each category (proportional)
    const totalIncome = incomeSources.reduce((s, src) => s + src.amount, 0);
    const totalSpend = categories.reduce((s, c) => s + c.total, 0) + (disposable > 0 ? disposable : 0);

    incomeSources.forEach((src, srcIdx) => {
      const share = totalIncome > 0 ? src.amount / totalIncome : 1 / incomeSources.length;
      categories.forEach((cat, catIdx) => {
        const val = Math.round(cat.total * share);
        if (val > 0) {
          linkList.push({ source: srcIdx, target: catStartIdx + catIdx, value: val, color: cat.color });
        }
      });
      if (disposable > 0) {
        const val = Math.round(disposable * share);
        if (val > 0) {
          linkList.push({ source: srcIdx, target: catStartIdx + categories.length, value: val, color: "#2e86c1" });
        }
      }
    });

    const W = 620;
    const rightCount = categories.length + (disposable > 0 ? 1 : 0);
    const maxSide = Math.max(rightCount, incomeNodeCount);
    // More padding when income vastly exceeds expenses (small nodes need spacing)
    const ratio = totalIncome > 0 ? Math.max(...categories.map(c => c.total), disposable) / Math.min(...categories.map(c => c.total), 1) : 1;
    const pad = ratio > 20 ? 18 : ratio > 8 ? 14 : 10;
    const H = Math.max(340, maxSide * (pad + 22) + 40);
    const LEFT_PAD = 120;

    const sankeyGen = d3Sankey<NodeExtra, LinkExtra>()
      .nodeWidth(16)
      .nodePadding(pad)
      .nodeAlign(sankeyJustify)
      .extent([[LEFT_PAD, 16], [W - 140, H - 16]]);

    const graph = sankeyGen({
      nodes: nodeList.map(n => ({ ...n })),
      links: linkList.map(l => ({ ...l })),
    });

    return { nodes: graph.nodes, links: graph.links, width: W, height: H, incomeCount: incomeNodeCount };
  }, [categories, disposable, profile, budget.totalIncome]);

  const linkPathGen = sankeyLinkHorizontal();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ minHeight: Math.min(height, 500) }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Links */}
      {links.map((link, i) => {
        const d = linkPathGen(link as any);
        if (!d) return null;
        const src = typeof link.source === "object" ? link.source : null;
        const tgt = typeof link.target === "object" ? link.target : null;
        const color = (link as any).color || "#ccc";
        const related = !hovered || tgt?.name === hovered || src?.name === hovered;

        return (
          <path
            key={`link-${i}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, link.width || 1)}
            strokeOpacity={!hovered ? 0.4 : related ? 0.6 : 0.06}
            className="transition-opacity duration-200"
            onMouseEnter={() => setHovered(tgt?.name || src?.name || null)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const x0 = node.x0 ?? 0;
        const x1 = node.x1 ?? 0;
        const y0 = node.y0 ?? 0;
        const y1 = node.y1 ?? 0;
        const w = x1 - x0;
        const h = y1 - y0;
        const isSource = i < incomeCount;
        const active = !hovered || hovered === node.name || (isSource && !categories.some(c => c.name === hovered) && hovered !== "Til overs") || (!isSource && !nodes.slice(0, incomeCount).some(n => n.name === hovered));

        return (
          <g
            key={`node-${i}`}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(node.name)}
            onMouseLeave={() => setHovered(null)}
          >
            <rect x={x0} y={y0} width={w} height={h} rx={3}
              fill={node.color} opacity={active ? 1 : 0.25}
              className="transition-opacity duration-200" />

            {isSource ? (
              // Left label
              <text x={x0 - 10} y={y0 + h / 2} textAnchor="end" dominantBaseline="central"
                fontSize={13} fill="currentColor" className="text-foreground"
                opacity={active ? 1 : 0.3}>
                <tspan fontWeight={700}>{node.name}</tspan>
                <tspan dx={-((node.name.length * 7) + 6)} dy={16} fontWeight={500} opacity={0.6} fontSize={12}>{formatKr(node.value ?? 0)} kr.</tspan>
              </text>
            ) : (
              // Right label
              <text x={x1 + 10} y={y0 + h / 2} dominantBaseline="central"
                fontSize={13} fill="currentColor" className="text-foreground"
                opacity={active ? 1 : 0.3}>
                <tspan fontWeight={700}>{node.name}</tspan>
                <tspan dx={6} fontWeight={500} opacity={0.6}>{formatKr(node.value ?? 0)} kr.</tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main export ──────────────────────
export function SankeyDiagram({ budget, profile }: Props) {
  const isMobile = useIsMobile();

  const { categories, disposable } = useMemo(() => {
    const categoryMap = new Map<string, number>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach(e => {
      if (e.amount <= 0) return;
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    });

    const cats = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total, color: getColor(name) }));

    return { categories: cats, disposable: Math.max(0, budget.disposableIncome) };
  }, [budget]);

  return (
    <div className="space-y-3">
      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { label: "Indkomst", value: budget.totalIncome, accent: "text-primary" },
          { label: "Udgifter", value: budget.totalExpenses, accent: "text-foreground" },
          { label: "Til overs", value: budget.disposableIncome, accent: budget.disposableIncome >= 0 ? "text-primary" : "text-destructive" },
        ].map(s => (
          <div key={s.label} className="text-center p-2 sm:p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className={`font-display font-bold text-xs sm:text-sm ${s.accent}`}>{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>

      {/* Sankey (desktop) or Stacked Bar (mobile) */}
      <div className="rounded-xl bg-card border border-border/40 p-3 sm:p-4">
        {isMobile ? (
          <StackedBarView categories={categories} income={budget.totalIncome} disposable={disposable} />
        ) : (
          <SankeyView budget={budget} profile={profile} categories={categories} disposable={disposable} />
        )}
      </div>
    </div>
  );
}

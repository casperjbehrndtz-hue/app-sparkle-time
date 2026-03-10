import { useMemo, useState, useRef, useEffect } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from "d3-sankey";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

const CAT_COLORS: Record<string, string> = {
  "Bolig": "#e8a0cf",
  "Forsyning": "#80cfe0",
  "Transport": "#c4956a",
  "Abonnementer": "#9b8ec4",
  "Forsikring": "#dbb870",
  "Fagforening": "#e05050",
  "Børn": "#6abf6a",
  "Kæledyr": "#c0c0c0",
  "Lån": "#e07070",
  "Fitness": "#c4956a",
  "Opsparing": "#5ba3cf",
  "Mad & dagligvarer": "#80cfe0",
  "Fritid": "#f4a460",
  "Tøj": "#dbb870",
  "Sundhed": "#d4a0d4",
  "Restaurant": "#f0a070",
  "Andet": "#b0b0b0",
};

function getColor(name: string): string {
  return CAT_COLORS[name] || "#b0b0b0";
}

interface NodeExtra { name: string; color: string; column: number; }
interface LinkExtra { color: string; }

type SNode = D3SankeyNode<NodeExtra, LinkExtra>;
type SLink = D3SankeyLink<NodeExtra, LinkExtra>;

export function SankeyDiagram({ budget, profile }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, links, width, height } = useMemo(() => {
    // ── Build graph data ──
    const nodeList: NodeExtra[] = [];
    const linkList: { source: number; target: number; value: number; color: string }[] = [];

    // Col 0: Income sources
    const mainIncome = profile?.income || budget.totalIncome;
    const partnerIncome = profile?.partnerIncome || 0;
    const additionalIncome = profile?.additionalIncome || [];

    const incomeEntries: { label: string; value: number }[] = [];
    if (partnerIncome > 0) {
      incomeEntries.push({ label: "Løn M", value: mainIncome });
      incomeEntries.push({ label: "Løn F", value: partnerIncome });
    } else {
      incomeEntries.push({ label: "Løn", value: mainIncome });
    }
    additionalIncome.forEach(inc => {
      if (inc.amount > 0) {
        const monthly = inc.frequency === "monthly" ? inc.amount : inc.frequency === "quarterly" ? Math.round(inc.amount / 3) : inc.frequency === "biannual" ? Math.round(inc.amount / 6) : Math.round(inc.amount / 12);
        incomeEntries.push({ label: inc.label || "Øvrig", value: monthly });
      }
    });

    incomeEntries.forEach(inc => {
      nodeList.push({ name: inc.label, color: "#b39ddb", column: 0 });
    });

    // Col 1: "Indtægt" aggregate
    const totalIdx = nodeList.length;
    nodeList.push({ name: "Indtægt", color: "#1565c0", column: 1 });

    // Links: income → Indtægt
    incomeEntries.forEach((inc, i) => {
      linkList.push({ source: i, target: totalIdx, value: inc.value, color: "#b39ddb" });
    });

    // Col 2: Categories
    const categoryMap = new Map<string, { total: number; items: { label: string; amount: number }[] }>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach(e => {
      if (e.amount <= 0) return;
      const existing = categoryMap.get(e.category) || { total: 0, items: [] };
      existing.total += e.amount;
      existing.items.push({ label: e.label, amount: e.amount });
      categoryMap.set(e.category, existing);
    });

    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d]) => ({ name, total: d.total, items: d.items.sort((a, b) => b.amount - a.amount), color: getColor(name) }));

    const disposable = Math.max(0, budget.disposableIncome);

    const catStartIdx = nodeList.length;
    categories.forEach(cat => {
      nodeList.push({ name: cat.name, color: cat.color, column: 2 });
    });
    if (disposable > 0) {
      nodeList.push({ name: "Opsparing", color: "#5ba3cf", column: 2 });
    }

    // Links: Indtægt → categories
    categories.forEach((cat, i) => {
      linkList.push({ source: totalIdx, target: catStartIdx + i, value: cat.total, color: cat.color });
    });
    if (disposable > 0) {
      linkList.push({ source: totalIdx, target: catStartIdx + categories.length, value: disposable, color: "#5ba3cf" });
    }

    // Col 3: Individual items
    const itemStartIdx = nodeList.length;
    const itemEntries: { label: string; value: number; catIdx: number; color: string }[] = [];
    categories.forEach((cat, catI) => {
      cat.items.forEach(item => {
        itemEntries.push({ label: item.label, value: item.amount, catIdx: catStartIdx + catI, color: cat.color });
      });
    });
    if (disposable > 0) {
      itemEntries.push({ label: "Til overs", value: disposable, catIdx: catStartIdx + categories.length, color: "#5ba3cf" });
    }

    itemEntries.forEach(item => {
      nodeList.push({ name: item.label, color: item.color, column: 3 });
    });

    // Links: categories → items
    itemEntries.forEach((item, i) => {
      linkList.push({ source: item.catIdx, target: itemStartIdx + i, value: item.value, color: item.color });
    });

    // ── Run d3-sankey layout ──
    const W = 900;
    const itemCount = itemEntries.length;
    const H = Math.max(500, itemCount * 24 + 60);
    const nodeWidth = 14;
    const nodePadding = 6;

    const sankeyGen = d3Sankey<NodeExtra, LinkExtra>()
      .nodeId((d: any) => d.index as number)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .nodeAlign(sankeyJustify)
      .extent([[1, 20], [W - 1, H - 20]]);

    const graph = sankeyGen({
      nodes: nodeList.map(n => ({ ...n })),
      links: linkList.map(l => ({ ...l })),
    });

    return { nodes: graph.nodes, links: graph.links, width: W, height: H };
  }, [budget, profile]);

  const linkPathGen = sankeyLinkHorizontal();

  // Hover helpers
  const getNodeName = (idx: number | SNode | undefined): string => {
    if (idx === undefined) return "";
    if (typeof idx === "object") return (idx as SNode).name || "";
    return nodes[idx]?.name || "";
  };

  const isLinkRelated = (link: SLink): boolean => {
    if (!hovered) return true;
    const src = typeof link.source === "object" ? link.source : nodes[link.source as number];
    const tgt = typeof link.target === "object" ? link.target : nodes[link.target as number];
    if (src?.name === hovered || tgt?.name === hovered) return true;
    // Check if hovered node is connected via a chain
    // e.g., hovering an item should highlight its category's link from Indtægt
    return false;
  };

  const isNodeRelated = (node: SNode): boolean => {
    if (!hovered) return true;
    if (node.name === hovered) return true;
    // Check if any link connects this node to hovered
    const related = links.some(l => {
      const src = typeof l.source === "object" ? l.source : nodes[l.source as number];
      const tgt = typeof l.target === "object" ? l.target : nodes[l.target as number];
      return (src?.name === hovered && tgt?.name === node.name) ||
             (tgt?.name === hovered && src?.name === node.name) ||
             (src?.name === node.name && tgt?.name === hovered) ||
             (tgt?.name === node.name && src?.name === hovered);
    });
    return related;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { label: "Indkomst", value: budget.totalIncome, accent: "text-primary" },
          { label: "Udgifter", value: budget.totalExpenses, accent: "text-destructive" },
          { label: "Til overs", value: budget.disposableIncome, accent: budget.disposableIncome >= 0 ? "text-primary" : "text-destructive" },
        ].map(s => (
          <div key={s.label} className="text-center p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className={`font-display font-bold text-xs sm:text-sm ${s.accent}`}>{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>

      <div className="relative overflow-x-auto -mx-3 sm:mx-0 rounded-xl bg-card border border-border/40">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minHeight: Math.min(height, 650) }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Links */}
          {links.map((link, i) => {
            const d = linkPathGen(link as any);
            if (!d) return null;
            const src = typeof link.source === "object" ? link.source : null;
            const tgt = typeof link.target === "object" ? link.target : null;
            const color = (link as any).color || src?.color || "#ccc";
            const related = isLinkRelated(link);

            return (
              <path
                key={`link-${i}`}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={Math.max(1, link.width || 1)}
                strokeOpacity={!hovered ? 0.45 : related ? 0.65 : 0.06}
                className="transition-opacity duration-200 cursor-pointer"
                onMouseEnter={() => {
                  const name = tgt?.name || src?.name || "";
                  setHovered(name);
                }}
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
            const active = isNodeRelated(node);
            const isCol0 = node.column === 0;
            const isCol1 = node.column === 1;
            const isCol3 = node.column === 3;
            const isCol2 = node.column === 2;

            return (
              <g
                key={`node-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(node.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={x0}
                  y={y0}
                  width={w}
                  height={h}
                  fill={node.color}
                  opacity={active ? 1 : 0.3}
                  className="transition-opacity duration-200"
                />
                {/* Labels */}
                {isCol0 && (
                  <>
                    <text x={x0 - 8} y={y0 + h / 2 - 8} textAnchor="end" dominantBaseline="central" fontSize={14} fontWeight={700} fill="currentColor" className="text-foreground">{node.name}</text>
                    <text x={x0 - 8} y={y0 + h / 2 + 10} textAnchor="end" dominantBaseline="central" fontSize={13} fill="currentColor" className="text-muted-foreground">{formatKr(node.value ?? 0)}</text>
                  </>
                )}
                {isCol1 && (
                  <>
                    <text x={x0 + w / 2} y={y0 + h / 2 - 9} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill="white" paintOrder="stroke" stroke={node.color} strokeWidth={5} strokeLinejoin="round">{node.name}</text>
                    <text x={x0 + w / 2} y={y0 + h / 2 + 11} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fill="white" paintOrder="stroke" stroke={node.color} strokeWidth={5} strokeLinejoin="round">{formatKr(node.value ?? 0)}</text>
                  </>
                )}
                {isCol2 && h > 6 && (
                  <>
                    <text x={x1 + 8} y={y0 + h / 2 - 6} dominantBaseline="central" fontSize={12} fontWeight={700} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{node.name}</text>
                    <text x={x1 + 8} y={y0 + h / 2 + 10} dominantBaseline="central" fontSize={11} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.2}>{formatKr(node.value ?? 0)}</text>
                  </>
                )}
                {isCol3 && (
                  <>
                    <text x={x1 + 8} y={y0 + h / 2 - 5} dominantBaseline="central" fontSize={12} fontWeight={600} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{node.name}</text>
                    <text x={x1 + 8} y={y0 + h / 2 + 10} dominantBaseline="central" fontSize={11} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.15}>{formatKr(node.value ?? 0)}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

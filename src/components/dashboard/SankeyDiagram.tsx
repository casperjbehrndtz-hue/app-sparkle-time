import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

// Colors matching the Reddit/SankeyMATIC aesthetic
const CAT_COLORS: Record<string, string> = {
  "Bolig": "#c9a0dc",        // soft purple (like Reddit)
  "Forsyning": "#8fbc8f",    // sage green
  "Transport": "#b8860b",    // dark goldenrod
  "Abonnementer": "#6a9fb5", // steel blue
  "Forsikring": "#cd853f",   // peru/warm brown
  "Fagforening": "#a0785a",  // warm brown
  "Børn": "#f4a460",         // sandy brown
  "Kæledyr": "#c0c0c0",      // silver
  "Lån": "#cd5c5c",          // indian red
  "Fitness": "#20b2aa",      // light sea green
  "Opsparing": "#3cb371",    // medium sea green
  "Mad & dagligvarer": "#e07070", // salmon red
  "Fritid": "#f4a460",       // sandy orange
  "Tøj": "#dda0dd",          // plum
  "Sundhed": "#f08080",      // light coral
  "Restaurant": "#e88080",   // warm red
  "Andet": "#b0b0b0",        // gray
};

function getColor(cat: string) {
  return CAT_COLORS[cat] || "#b0b0b0";
}

// Smooth cubic bezier path between two vertical segments
function flowPath(
  x0: number, y0top: number, y0bot: number,
  x1: number, y1top: number, y1bot: number
): string {
  const cx0 = x0 + (x1 - x0) * 0.5;
  const cx1 = x0 + (x1 - x0) * 0.5;
  return [
    `M ${x0},${y0top}`,
    `C ${cx0},${y0top} ${cx1},${y1top} ${x1},${y1top}`,
    `L ${x1},${y1bot}`,
    `C ${cx1},${y1bot} ${cx0},${y0bot} ${x0},${y0bot}`,
    `Z`,
  ].join(" ");
}

interface SankeyNode {
  id: string;
  label: string;
  value: number;
  y: number;
  h: number;
  color: string;
}

export function SankeyDiagram({ budget, profile }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const data = useMemo(() => {
    // ── Column 1: Income sources ──
    const incomeNodes: { label: string; value: number }[] = [];
    const mainIncome = profile?.income || budget.totalIncome;
    const partnerIncome = profile?.partnerIncome || 0;
    const additionalIncome = profile?.additionalIncome || [];

    if (partnerIncome > 0) {
      incomeNodes.push({ label: "Løn 1", value: mainIncome });
      incomeNodes.push({ label: "Løn 2", value: partnerIncome });
    } else {
      incomeNodes.push({ label: "Løn", value: mainIncome });
    }
    additionalIncome.forEach((inc) => {
      if (inc.amount > 0) {
        const monthly = inc.frequency === "monthly" ? inc.amount
          : inc.frequency === "quarterly" ? Math.round(inc.amount / 3)
          : inc.frequency === "biannual" ? Math.round(inc.amount / 6)
          : Math.round(inc.amount / 12);
        incomeNodes.push({ label: inc.label || "Øvrig", value: monthly });
      }
    });

    // ── Column 2: Category groups ──
    const categoryMap = new Map<string, { total: number; items: { label: string; amount: number }[] }>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
      if (e.amount <= 0) return;
      const existing = categoryMap.get(e.category) || { total: 0, items: [] };
      existing.total += e.amount;
      existing.items.push({ label: e.label, amount: e.amount });
      categoryMap.set(e.category, existing);
    });

    const disposable = Math.max(0, budget.disposableIncome);
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        name,
        total: data.total,
        items: data.items.sort((a, b) => b.amount - a.amount),
        color: getColor(name),
      }));

    return { incomeNodes, categories, disposable, totalIncome: budget.totalIncome };
  }, [budget, profile]);

  // ── Layout ──
  const nodeW = 12;
  const labelPadL = 8;
  const labelPadR = 8;

  // Responsive widths
  const totalW = 780;
  const col1X = 120; // income nodes
  const col2X = 370; // category groups
  const col3X = 560; // individual items
  const gap = 4;
  const padY = 20;

  // Calculate total items count for height
  const allItems = data.categories.flatMap((c) => c.items);
  const itemCount = allItems.length + (data.disposable > 0 ? 1 : 0);
  const catCount = data.categories.length + (data.disposable > 0 ? 1 : 0);
  const incCount = data.incomeNodes.length;

  const height = Math.max(400, Math.max(itemCount * 24, catCount * 36, incCount * 50) + padY * 2);
  const usableH = height - padY * 2;

  // ── Position nodes in each column ──
  function layoutNodes(entries: { id: string; label: string; value: number; color: string }[], totalValue: number): SankeyNode[] {
    const nodes: SankeyNode[] = [];
    let y = padY;
    const availH = usableH - (entries.length - 1) * gap;
    entries.forEach((e) => {
      const h = Math.max(6, (e.value / totalValue) * availH);
      nodes.push({ ...e, y, h });
      y += h + gap;
    });
    return nodes;
  }

  // Column 1: Income
  const col1Nodes = layoutNodes(
    data.incomeNodes.map((n) => ({ id: `inc-${n.label}`, label: n.label, value: n.value, color: "#7b68a8" })),
    data.totalIncome
  );

  // Column 2: Categories
  const col2Entries = [
    ...data.categories.map((c) => ({ id: `cat-${c.name}`, label: c.name, value: c.total, color: c.color })),
    ...(data.disposable > 0 ? [{ id: "cat-tilovers", label: "Til overs", value: data.disposable, color: "#3cb371" }] : []),
  ];
  const col2Nodes = layoutNodes(col2Entries, data.totalIncome);

  // Column 3: Individual items
  const col3Entries: { id: string; label: string; value: number; color: string; catId: string }[] = [];
  data.categories.forEach((c) => {
    c.items.forEach((item, idx) => {
      col3Entries.push({
        id: `item-${c.name}-${idx}`,
        label: item.label,
        value: item.amount,
        color: c.color,
        catId: `cat-${c.name}`,
      });
    });
  });
  if (data.disposable > 0) {
    col3Entries.push({
      id: "item-tilovers",
      label: "Til overs",
      value: data.disposable,
      color: "#3cb371",
      catId: "cat-tilovers",
    });
  }
  const col3Nodes = layoutNodes(
    col3Entries.map((e) => ({ id: e.id, label: e.label, value: e.value, color: e.color })),
    data.totalIncome
  );

  // ── Generate flow paths ──
  // Col1 → Col2: each income source distributes proportionally across all categories
  const flows1to2: { path: string; color: string; id: string }[] = [];
  {
    // Track current Y position on each col1 and col2 node
    const col1Cursors = col1Nodes.map((n) => n.y);
    const col2Cursors = col2Nodes.map((n) => n.y);

    col1Nodes.forEach((incNode, iIdx) => {
      const incShare = incNode.value / data.totalIncome;
      col2Nodes.forEach((catNode, cIdx) => {
        const flowValue = catNode.value * incShare;
        const flowH1 = Math.max(1, (flowValue / data.totalIncome) * (usableH - (col1Nodes.length - 1) * gap));
        const flowH2 = Math.max(1, (flowValue / data.totalIncome) * (usableH - (col2Nodes.length - 1) * gap));

        const path = flowPath(
          col1X + nodeW, col1Cursors[iIdx], col1Cursors[iIdx] + flowH1,
          col2X, col2Cursors[cIdx], col2Cursors[cIdx] + flowH2
        );

        flows1to2.push({ path, color: catNode.color, id: `f1-${iIdx}-${cIdx}` });
        col1Cursors[iIdx] += flowH1;
        col2Cursors[cIdx] += flowH2;
      });
    });
  }

  // Col2 → Col3: each category distributes to its items
  const flows2to3: { path: string; color: string; id: string; itemId: string; catId: string }[] = [];
  {
    const col2Cursors = col2Nodes.map((n) => n.y);

    col3Entries.forEach((entry, idx) => {
      const catIdx = col2Nodes.findIndex((n) => n.id === entry.catId);
      if (catIdx === -1) return;
      const catNode = col2Nodes[catIdx];
      const itemNode = col3Nodes[idx];

      const flowProportion = entry.value / catNode.value;
      const flowH2 = Math.max(1, flowProportion * catNode.h);

      const path = flowPath(
        col2X + nodeW, col2Cursors[catIdx], col2Cursors[catIdx] + flowH2,
        col3X, itemNode.y, itemNode.y + itemNode.h
      );

      flows2to3.push({ path, color: entry.color, id: `f2-${idx}`, itemId: entry.id, catId: entry.catId });
      col2Cursors[catIdx] += flowH2;
    });
  }

  const isHoveredCat = (catId: string) => hovered === catId;
  const isHoveredItem = (itemId: string) => hovered === itemId;
  const isRelated = (catId: string, itemId?: string) => {
    if (!hovered) return true;
    if (hovered === catId) return true;
    if (itemId && hovered === itemId) return true;
    // Check if hovered item belongs to this cat
    const hoveredEntry = col3Entries.find((e) => e.id === hovered);
    if (hoveredEntry && hoveredEntry.catId === catId) return true;
    return false;
  };

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { label: "Indkomst", value: budget.totalIncome, accent: "text-primary" },
          { label: "Udgifter", value: budget.totalExpenses, accent: "text-destructive" },
          { label: "Til overs", value: budget.disposableIncome, accent: budget.disposableIncome >= 0 ? "text-primary" : "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="text-center p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className={`font-display font-bold text-xs sm:text-sm ${s.accent}`}>{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>

      {/* Sankey SVG */}
      <div className="relative overflow-x-auto -mx-3 sm:mx-0">
        <svg
          viewBox={`0 0 ${totalW} ${height}`}
          className="w-full"
          style={{ minHeight: 350, maxHeight: 600 }}
        >
          {/* ── Flows Col1→Col2 ── */}
          {flows1to2.map((f) => (
            <path
              key={f.id}
              d={f.path}
              fill={f.color}
              opacity={hovered ? 0.12 : 0.35}
              className="transition-opacity duration-200"
            />
          ))}

          {/* ── Flows Col2→Col3 ── */}
          {flows2to3.map((f) => (
            <motion.path
              key={f.id}
              d={f.path}
              fill={f.color}
              opacity={isRelated(f.catId, f.itemId) ? (hovered ? 0.55 : 0.4) : 0.08}
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(f.itemId)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* ── Col1: Income nodes ── */}
          {col1Nodes.map((node) => (
            <g key={node.id}>
              <rect x={col1X} y={node.y} width={nodeW} height={node.h} rx={2} fill={node.color} />
              <text
                x={col1X - labelPadL}
                y={node.y + node.h / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill="currentColor"
                className="text-foreground"
              >
                {node.label}
              </text>
              <text
                x={col1X - labelPadL}
                y={node.y + node.h / 2 + 14}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {formatKr(node.value)}
              </text>
            </g>
          ))}

          {/* ── Col2: Category nodes ── */}
          {col2Nodes.map((node) => {
            const active = isRelated(node.id);
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <rect
                  x={col2X}
                  y={node.y}
                  width={nodeW}
                  height={node.h}
                  rx={2}
                  fill={node.color}
                  opacity={active ? 1 : 0.3}
                  className="transition-opacity duration-200"
                />
                {node.h > 18 && (
                  <text
                    x={col2X + nodeW / 2}
                    y={node.y + node.h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontWeight={600}
                    fill="white"
                    transform={`rotate(-90, ${col2X + nodeW / 2}, ${node.y + node.h / 2})`}
                    opacity={active ? 1 : 0.4}
                  >
                    {node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label}
                  </text>
                )}
                {/* Amount label next to node */}
                {node.h > 12 && (
                  <text
                    x={col2X - 4}
                    y={node.y + node.h / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={9}
                    fill="currentColor"
                    className="text-muted-foreground"
                    opacity={active ? 0.8 : 0.3}
                  >
                    {formatKr(node.value)}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Col3: Item nodes ── */}
          {col3Nodes.map((node, idx) => {
            const entry = col3Entries[idx];
            const active = isRelated(entry.catId, node.id);
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <rect
                  x={col3X}
                  y={node.y}
                  width={nodeW}
                  height={Math.max(node.h, 3)}
                  rx={2}
                  fill={node.color}
                  opacity={active ? 1 : 0.25}
                  className="transition-opacity duration-200"
                />
                {node.h > 8 && (
                  <>
                    <text
                      x={col3X + nodeW + labelPadR}
                      y={node.y + node.h / 2 - 1}
                      dominantBaseline="middle"
                      fontSize={10}
                      fontWeight={500}
                      fill="currentColor"
                      className="text-foreground"
                      opacity={active ? 1 : 0.3}
                    >
                      {node.label}
                    </text>
                    <text
                      x={col3X + nodeW + labelPadR}
                      y={node.y + node.h / 2 + 11}
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="currentColor"
                      className="text-muted-foreground"
                      opacity={active ? 0.8 : 0.2}
                    >
                      {formatKr(node.value)}
                    </text>
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

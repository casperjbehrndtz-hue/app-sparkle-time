import { useMemo, useState } from "react";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

// SankeyMATIC-inspired colors — vibrant, distinct
const CAT_COLORS: Record<string, string> = {
  "Bolig": "#c9a0dc",
  "Forsyning": "#d4b896",
  "Transport": "#b8860b",
  "Abonnementer": "#9b8ec4",
  "Forsikring": "#cd853f",
  "Fagforening": "#e05050",
  "Børn": "#6abf6a",
  "Kæledyr": "#c0c0c0",
  "Lån": "#cd5c5c",
  "Fitness": "#c4956a",
  "Opsparing": "#4a7fb5",
  "Mad & dagligvarer": "#7ec8e3",
  "Fritid": "#f4a460",
  "Tøj": "#f0a030",
  "Sundhed": "#e88aaf",
  "Restaurant": "#e88080",
  "Andet": "#b0b0b0",
};

function getColor(cat: string) {
  return CAT_COLORS[cat] || "#b0b0b0";
}

// Smooth cubic bezier flow path
function flowPath(
  x0: number, y0top: number, y0bot: number,
  x1: number, y1top: number, y1bot: number
): string {
  const cx = (x0 + x1) / 2;
  return [
    `M ${x0},${y0top}`,
    `C ${cx},${y0top} ${cx},${y1top} ${x1},${y1top}`,
    `L ${x1},${y1bot}`,
    `C ${cx},${y1bot} ${cx},${y0bot} ${x0},${y0bot}`,
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
    const incomeNodes: { label: string; value: number }[] = [];
    const mainIncome = profile?.income || budget.totalIncome;
    const partnerIncome = profile?.partnerIncome || 0;
    const additionalIncome = profile?.additionalIncome || [];

    if (partnerIncome > 0) {
      incomeNodes.push({ label: "Løn M", value: mainIncome });
      incomeNodes.push({ label: "Løn F", value: partnerIncome });
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

  // ── Layout constants (4-column: Sources → Indtægt → Categories → Items) ──
  const nodeW = 8;
  const totalW = 960;
  const col0X = 90;   // income sources
  const col1X = 280;  // "Indtægt" aggregate
  const col2X = 520;  // category groups
  const col3X = 740;  // individual items
  const gap = 6;
  const padY = 30;

  const allItems = data.categories.flatMap((c) => c.items);
  const itemCount = allItems.length + (data.disposable > 0 ? 1 : 0);
  const catCount = data.categories.length + (data.disposable > 0 ? 1 : 0);

  const height = Math.max(450, Math.max(itemCount * 28, catCount * 40, data.incomeNodes.length * 60) + padY * 2);
  const usableH = height - padY * 2;

  function layoutNodes(
    entries: { id: string; label: string; value: number; color: string }[],
    totalValue: number
  ): SankeyNode[] {
    const nodes: SankeyNode[] = [];
    let y = padY;
    const totalGaps = (entries.length - 1) * gap;
    const availH = usableH - totalGaps;
    entries.forEach((e) => {
      const h = Math.max(4, (e.value / totalValue) * availH);
      nodes.push({ ...e, y, h });
      y += h + gap;
    });
    // Center vertically
    const totalUsed = nodes.length > 0 ? (nodes[nodes.length - 1].y + nodes[nodes.length - 1].h - nodes[0].y) : 0;
    const offset = (usableH - totalUsed) / 2;
    if (offset > 0) nodes.forEach(n => n.y += offset);
    return nodes;
  }

  // Col 0: Income sources
  const incColor = "#b39ddb"; // soft purple for income
  const col0Nodes = layoutNodes(
    data.incomeNodes.map((n) => ({ id: `inc-${n.label}`, label: n.label, value: n.value, color: incColor })),
    data.totalIncome
  );

  // Col 1: Single "Indtægt" node
  const col1Nodes: SankeyNode[] = [{
    id: "total-income",
    label: "Indtægt",
    value: data.totalIncome,
    y: padY,
    h: usableH,
    color: "#7e57c2",
  }];

  // Col 2: Categories
  const col2Entries = [
    ...data.categories.map((c) => ({ id: `cat-${c.name}`, label: c.name, value: c.total, color: c.color })),
    ...(data.disposable > 0 ? [{ id: "cat-tilovers", label: "Opsparing", value: data.disposable, color: "#4a7fb5" }] : []),
  ];
  const col2Nodes = layoutNodes(col2Entries, data.totalIncome);

  // Col 3: Individual items
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
    col3Entries.push({ id: "item-tilovers", label: "Til overs", value: data.disposable, color: "#4a7fb5", catId: "cat-tilovers" });
  }
  const col3Nodes = layoutNodes(
    col3Entries.map((e) => ({ id: e.id, label: e.label, value: e.value, color: e.color })),
    data.totalIncome
  );

  // ── Flows Col0 → Col1 (income sources → aggregate) ──
  const flows0to1: { path: string; color: string; id: string }[] = [];
  {
    const col0Cursors = col0Nodes.map(n => n.y);
    let col1Cursor = col1Nodes[0].y;
    col0Nodes.forEach((incNode, i) => {
      const flowH0 = incNode.h;
      const flowH1 = (incNode.value / data.totalIncome) * col1Nodes[0].h;
      flows0to1.push({
        path: flowPath(col0X + nodeW, col0Cursors[i], col0Cursors[i] + flowH0, col1X, col1Cursor, col1Cursor + flowH1),
        color: incNode.color,
        id: `f0-${i}`,
      });
      col0Cursors[i] += flowH0;
      col1Cursor += flowH1;
    });
  }

  // ── Flows Col1 → Col2 (aggregate → categories) ──
  const flows1to2: { path: string; color: string; id: string; catId: string }[] = [];
  {
    let col1Cursor = col1Nodes[0].y;
    col2Nodes.forEach((catNode, i) => {
      const flowH1 = (catNode.value / data.totalIncome) * col1Nodes[0].h;
      flows1to2.push({
        path: flowPath(col1X + nodeW, col1Cursor, col1Cursor + flowH1, col2X, catNode.y, catNode.y + catNode.h),
        color: catNode.color,
        id: `f1-${i}`,
        catId: catNode.id,
      });
      col1Cursor += flowH1;
    });
  }

  // ── Flows Col2 → Col3 (categories → items) ──
  const flows2to3: { path: string; color: string; id: string; itemId: string; catId: string }[] = [];
  {
    const col2Cursors = col2Nodes.map(n => n.y);
    col3Entries.forEach((entry, idx) => {
      const catIdx = col2Nodes.findIndex(n => n.id === entry.catId);
      if (catIdx === -1) return;
      const catNode = col2Nodes[catIdx];
      const itemNode = col3Nodes[idx];
      const flowH2 = Math.max(1, (entry.value / catNode.value) * catNode.h);

      flows2to3.push({
        path: flowPath(col2X + nodeW, col2Cursors[catIdx], col2Cursors[catIdx] + flowH2, col3X, itemNode.y, itemNode.y + itemNode.h),
        color: entry.color,
        id: `f2-${idx}`,
        itemId: entry.id,
        catId: entry.catId,
      });
      col2Cursors[catIdx] += flowH2;
    });
  }

  // ── Hover logic ──
  const isRelated = (catId: string, itemId?: string) => {
    if (!hovered) return true;
    if (hovered === catId) return true;
    if (itemId && hovered === itemId) return true;
    const hoveredEntry = col3Entries.find(e => e.id === hovered);
    if (hoveredEntry && hoveredEntry.catId === catId) return true;
    return false;
  };

  const flowOpacity = (catId: string, itemId?: string) => {
    if (!hovered) return 0.55;
    return isRelated(catId, itemId) ? 0.7 : 0.08;
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

      {/* Sankey SVG — SankeyMATIC style */}
      <div className="relative overflow-x-auto -mx-3 sm:mx-0 rounded-xl bg-card border border-border/40 p-2">
        <svg
          viewBox={`0 0 ${totalW} ${height}`}
          className="w-full"
          style={{ minHeight: 380, maxHeight: 700 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* ── Flows Col0→Col1 (income → aggregate) ── */}
          {flows0to1.map(f => (
            <path
              key={f.id}
              d={f.path}
              fill={f.color}
              opacity={hovered ? 0.2 : 0.5}
              className="transition-opacity duration-200"
            />
          ))}

          {/* ── Flows Col1→Col2 (aggregate → categories) ── */}
          {flows1to2.map(f => (
            <path
              key={f.id}
              d={f.path}
              fill={f.color}
              opacity={flowOpacity(f.catId)}
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(f.catId)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* ── Flows Col2→Col3 (categories → items) ── */}
          {flows2to3.map(f => (
            <path
              key={f.id}
              d={f.path}
              fill={f.color}
              opacity={flowOpacity(f.catId, f.itemId)}
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(f.itemId)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* ── Col0: Income source nodes ── */}
          {col0Nodes.map(node => (
            <g key={node.id}>
              <rect x={col0X} y={node.y} width={nodeW} height={node.h} rx={1} fill={node.color} />
              <text
                x={col0X - 8}
                y={node.y + node.h / 2 - 7}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={600}
                fill="currentColor"
                className="text-foreground"
              >
                {node.label}
              </text>
              <text
                x={col0X - 8}
                y={node.y + node.h / 2 + 9}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={500}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {formatKr(node.value)}
              </text>
            </g>
          ))}

          {/* ── Col1: Aggregate income node ── */}
          {col1Nodes.map(node => (
            <g key={node.id}>
              <rect x={col1X} y={node.y} width={nodeW} height={node.h} rx={1} fill={node.color} />
              {/* Label on top of flows */}
              <text
                x={col1X + nodeW + 12}
                y={node.y + node.h / 2 - 8}
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={700}
                fill="currentColor"
                className="text-foreground"
              >
                {node.label}
              </text>
              <text
                x={col1X + nodeW + 12}
                y={node.y + node.h / 2 + 10}
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={500}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {formatKr(node.value)}
              </text>
            </g>
          ))}

          {/* ── Col2: Category nodes with labels ── */}
          {col2Nodes.map(node => {
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
                  rx={1}
                  fill={node.color}
                  opacity={active ? 1 : 0.3}
                  className="transition-opacity duration-200"
                />
                {/* Label between col1 and col2 — on/near the flow */}
                <text
                  x={col2X - 14}
                  y={node.y + node.h / 2 - 7}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="currentColor"
                  className="text-foreground"
                  opacity={active ? 1 : 0.35}
                >
                  {node.label}
                </text>
                <text
                  x={col2X - 14}
                  y={node.y + node.h / 2 + 7}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill="currentColor"
                  className="text-muted-foreground"
                  opacity={active ? 0.8 : 0.25}
                >
                  {formatKr(node.value)}
                </text>
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
                  height={Math.max(node.h, 2)}
                  rx={1}
                  fill={node.color}
                  opacity={active ? 1 : 0.2}
                  className="transition-opacity duration-200"
                />
                {/* Label + amount to the right */}
                <text
                  x={col3X + nodeW + 8}
                  y={node.y + Math.max(node.h, 2) / 2 - 6}
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="currentColor"
                  className="text-foreground"
                  opacity={active ? 1 : 0.25}
                >
                  {node.label}
                </text>
                <text
                  x={col3X + nodeW + 8}
                  y={node.y + Math.max(node.h, 2) / 2 + 8}
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={500}
                  fill="currentColor"
                  className="text-muted-foreground"
                  opacity={active ? 0.8 : 0.2}
                >
                  {formatKr(node.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

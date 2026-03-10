import { useMemo, useState } from "react";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget, BudgetProfile } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
  profile?: BudgetProfile;
}

const CAT_COLORS: Record<string, string> = {
  "Bolig": "#c9a0dc",
  "Forsyning": "#d4b896",
  "Transport": "#c4956a",
  "Abonnementer": "#9b8ec4",
  "Forsikring": "#cd853f",
  "Fagforening": "#e05050",
  "Børn": "#6abf6a",
  "Kæledyr": "#c0c0c0",
  "Lån": "#e07070",
  "Fitness": "#c4956a",
  "Opsparing": "#7faed4",
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

interface SNode {
  id: string;
  label: string;
  value: number;
  y: number;
  h: number;
  color: string;
}

// Resolve overlapping labels by pushing them apart
function resolveOverlaps(nodes: SNode[], minSpacing: number): { y: number; h: number }[] {
  const positions = nodes.map(n => ({ y: n.y, h: n.h }));
  // Multiple passes to resolve
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 1; i < positions.length; i++) {
      const prevBottom = positions[i - 1].y + positions[i - 1].h;
      const overlap = prevBottom + minSpacing - positions[i].y;
      if (overlap > 0) {
        positions[i].y += overlap;
      }
    }
  }
  return positions;
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
      .map(([name, d]) => ({
        name,
        total: d.total,
        items: d.items.sort((a, b) => b.amount - a.amount),
        color: getColor(name),
      }));

    return { incomeNodes, categories, disposable, totalIncome: budget.totalIncome };
  }, [budget, profile]);

  // Build entries
  const col3Entries: { id: string; label: string; value: number; color: string; catId: string }[] = [];
  data.categories.forEach((c) => {
    c.items.forEach((item, idx) => {
      col3Entries.push({ id: `item-${c.name}-${idx}`, label: item.label, value: item.amount, color: c.color, catId: `cat-${c.name}` });
    });
  });
  if (data.disposable > 0) {
    col3Entries.push({ id: "item-tilovers", label: "Til overs", value: data.disposable, color: "#7faed4", catId: "cat-tilovers" });
  }

  const col2Entries = [
    ...data.categories.map(c => ({ id: `cat-${c.name}`, label: c.name, value: c.total, color: c.color })),
    ...(data.disposable > 0 ? [{ id: "cat-tilovers", label: "Opsparing", value: data.disposable, color: "#7faed4" }] : []),
  ];

  // Layout
  const nodeW = 10;
  const totalW = 1000;
  const col0X = 100;
  const col1X = 310;
  const col2X = 600;
  const col3X = 790;
  const gap = 4;
  const padY = 25;

  // Height: ensure enough room for all items with label spacing
  const labelH = 26; // min height per item for readable labels
  const neededH = col3Entries.length * labelH + padY * 2;
  const height = Math.max(520, neededH);
  const usableH = height - padY * 2;

  function layoutNodes(entries: { id: string; label: string; value: number; color: string }[], totalValue: number, minH = 4): SNode[] {
    const nodes: SNode[] = [];
    const totalGaps = Math.max(0, entries.length - 1) * gap;
    const availH = usableH - totalGaps;
    let y = padY;
    entries.forEach((e) => {
      const h = Math.max(minH, (e.value / totalValue) * availH);
      nodes.push({ ...e, y, h });
      y += h + gap;
    });
    // Center
    const totalUsed = nodes.length > 0 ? (nodes[nodes.length - 1].y + nodes[nodes.length - 1].h - nodes[0].y) : 0;
    const offset = Math.max(0, (usableH - totalUsed) / 2);
    if (offset > 1) nodes.forEach(n => n.y += offset);
    return nodes;
  }

  const incColor = "#b39ddb";
  const col0Nodes = layoutNodes(
    data.incomeNodes.map(n => ({ id: `inc-${n.label}`, label: n.label, value: n.value, color: incColor })),
    data.totalIncome, 20
  );

  const col1Node: SNode = { id: "total-income", label: "Indtægt", value: data.totalIncome, y: padY, h: usableH, color: "#7e57c2" };

  const col2Nodes = layoutNodes(col2Entries, data.totalIncome, 6);
  const col3Nodes = layoutNodes(
    col3Entries.map(e => ({ id: e.id, label: e.label, value: e.value, color: e.color })),
    data.totalIncome, 4
  );

  // Resolve label overlaps for col2 and col3
  const col2LabelPositions = resolveOverlaps(col2Nodes, labelH);
  const col3LabelPositions = resolveOverlaps(col3Nodes, labelH);

  // ── Flows ──
  const flows0to1: { path: string; color: string; id: string }[] = [];
  {
    let c1y = col1Node.y;
    col0Nodes.forEach((n, i) => {
      const h1 = (n.value / data.totalIncome) * col1Node.h;
      flows0to1.push({ path: flowPath(col0X + nodeW, n.y, n.y + n.h, col1X, c1y, c1y + h1), color: n.color, id: `f0-${i}` });
      c1y += h1;
    });
  }

  const flows1to2: { path: string; color: string; id: string; catId: string }[] = [];
  {
    let c1y = col1Node.y;
    col2Nodes.forEach((cat, i) => {
      const h1 = (cat.value / data.totalIncome) * col1Node.h;
      flows1to2.push({ path: flowPath(col1X + nodeW, c1y, c1y + h1, col2X, cat.y, cat.y + cat.h), color: cat.color, id: `f1-${i}`, catId: cat.id });
      c1y += h1;
    });
  }

  const flows2to3: { path: string; color: string; id: string; itemId: string; catId: string }[] = [];
  {
    const cursors = col2Nodes.map(n => n.y);
    col3Entries.forEach((entry, idx) => {
      const ci = col2Nodes.findIndex(n => n.id === entry.catId);
      if (ci === -1) return;
      const cat = col2Nodes[ci];
      const item = col3Nodes[idx];
      const fh = Math.max(2, (entry.value / cat.value) * cat.h);
      flows2to3.push({ path: flowPath(col2X + nodeW, cursors[ci], cursors[ci] + fh, col3X, item.y, item.y + item.h), color: entry.color, id: `f2-${idx}`, itemId: entry.id, catId: entry.catId });
      cursors[ci] += fh;
    });
  }

  // Hover logic
  const isRelated = (catId: string, itemId?: string) => {
    if (!hovered) return true;
    if (hovered === catId) return true;
    if (itemId && hovered === itemId) return true;
    const he = col3Entries.find(e => e.id === hovered);
    if (he && he.catId === catId) return true;
    return false;
  };
  const fop = (catId: string, itemId?: string) => !hovered ? 0.7 : isRelated(catId, itemId) ? 0.8 : 0.06;

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
          viewBox={`0 0 ${totalW} ${height}`}
          className="w-full"
          style={{ minHeight: 420 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Flows Col0→Col1 */}
          {flows0to1.map(f => (
            <path key={f.id} d={f.path} fill={f.color} opacity={hovered ? 0.2 : 0.6} className="transition-opacity duration-200" />
          ))}

          {/* Flows Col1→Col2 */}
          {flows1to2.map(f => (
            <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId)}
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(f.catId)} onMouseLeave={() => setHovered(null)} />
          ))}

          {/* Flows Col2→Col3 */}
          {flows2to3.map(f => (
            <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId, f.itemId)}
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(f.itemId)} onMouseLeave={() => setHovered(null)} />
          ))}

          {/* Col0: Income sources */}
          {col0Nodes.map(n => (
            <g key={n.id}>
              <rect x={col0X} y={n.y} width={nodeW} height={n.h} rx={1} fill={n.color} />
              <text x={col0X - 10} y={n.y + n.h / 2 - 8} textAnchor="end" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="currentColor" className="text-foreground">{n.label}</text>
              <text x={col0X - 10} y={n.y + n.h / 2 + 10} textAnchor="end" dominantBaseline="middle" fontSize={12} fill="currentColor" className="text-muted-foreground">{formatKr(n.value)}</text>
            </g>
          ))}

          {/* Col1: Aggregate — label centered ON the node bar */}
          <rect x={col1X} y={col1Node.y} width={nodeW} height={col1Node.h} rx={1} fill={col1Node.color} />
          <text
            x={col1X + nodeW / 2}
            y={col1Node.y + col1Node.h / 2 - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={700}
            fill="white"
            paintOrder="stroke"
            stroke={col1Node.color}
            strokeWidth={4}
          >Indtægt</text>
          <text
            x={col1X + nodeW / 2}
            y={col1Node.y + col1Node.h / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={600}
            fill="white"
            paintOrder="stroke"
            stroke={col1Node.color}
            strokeWidth={4}
          >{formatKr(data.totalIncome)}</text>

          {/* Col2: Categories — labels use resolved positions to avoid overlap */}
          {col2Nodes.map((n, i) => {
            const active = isRelated(n.id);
            const lp = col2LabelPositions[i];
            const labelY = lp.y + lp.h / 2;
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col2X} y={n.y} width={nodeW} height={n.h} rx={1} fill={n.color} opacity={active ? 1 : 0.3} className="transition-opacity duration-200" />
                <text x={col2X - 10} y={labelY - 6} textAnchor="end" dominantBaseline="middle" fontSize={11} fontWeight={700} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{n.label}</text>
                <text x={col2X - 10} y={labelY + 8} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.2}>{formatKr(n.value)}</text>
              </g>
            );
          })}

          {/* Col3: Items — labels use resolved positions to avoid overlap */}
          {col3Nodes.map((n, idx) => {
            const entry = col3Entries[idx];
            const active = isRelated(entry.catId, n.id);
            const lp = col3LabelPositions[idx];
            const labelY = lp.y + lp.h / 2;
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col3X} y={n.y} width={nodeW} height={Math.max(n.h, 3)} rx={1} fill={n.color} opacity={active ? 1 : 0.2} className="transition-opacity duration-200" />
                <text x={col3X + nodeW + 8} y={labelY - 6} dominantBaseline="middle" fontSize={11} fontWeight={600} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.25}>{n.label}</text>
                <text x={col3X + nodeW + 8} y={labelY + 8} dominantBaseline="middle" fontSize={10} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.15}>{formatKr(n.value)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

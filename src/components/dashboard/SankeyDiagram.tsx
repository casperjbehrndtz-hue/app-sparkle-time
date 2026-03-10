import { useMemo, useState } from "react";
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

function getColor(cat: string) { return CAT_COLORS[cat] || "#b0b0b0"; }

// SankeyMATIC uses high-curviness bezier — control points at ~60% of the gap
function flowPath(x0: number, y0t: number, y0b: number, x1: number, y1t: number, y1b: number): string {
  const dx = x1 - x0;
  const cx0 = x0 + dx * 0.6;
  const cx1 = x1 - dx * 0.6;
  return `M ${x0},${y0t} C ${cx0},${y0t} ${cx1},${y1t} ${x1},${y1t} L ${x1},${y1b} C ${cx1},${y1b} ${cx0},${y0b} ${x0},${y0b} Z`;
}

interface SNode { id: string; label: string; value: number; y: number; h: number; color: string; }

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
        const monthly = inc.frequency === "monthly" ? inc.amount : inc.frequency === "quarterly" ? Math.round(inc.amount / 3) : inc.frequency === "biannual" ? Math.round(inc.amount / 6) : Math.round(inc.amount / 12);
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
      .map(([name, d]) => ({ name, total: d.total, items: d.items.sort((a, b) => b.amount - a.amount), color: getColor(name) }));

    return { incomeNodes, categories, disposable, totalIncome: budget.totalIncome };
  }, [budget, profile]);

  // Build right-side entries
  const col3Entries: { id: string; label: string; value: number; color: string; catId: string }[] = [];
  data.categories.forEach((c) => {
    c.items.forEach((item, idx) => {
      col3Entries.push({ id: `item-${c.name}-${idx}`, label: item.label, value: item.amount, color: c.color, catId: `cat-${c.name}` });
    });
  });
  if (data.disposable > 0) {
    col3Entries.push({ id: "item-tilovers", label: "Til overs", value: data.disposable, color: "#5ba3cf", catId: "cat-tilovers" });
  }

  const col2Entries = [
    ...data.categories.map(c => ({ id: `cat-${c.name}`, label: c.name, value: c.total, color: c.color })),
    ...(data.disposable > 0 ? [{ id: "cat-tilovers", label: "Opsparing", value: data.disposable, color: "#5ba3cf" }] : []),
  ];

  // ── SankeyMATIC-style layout ──
  // Key principle: node heights are PROPORTIONAL to values, no minimum override
  // Spacing between nodes is fixed. Labels are placed at node center.
  const nodeW = 14;
  const nodeSpacing = 6; // gap between nodes (SankeyMATIC default ~6)
  const padY = 24;
  const padX = 16;
  const totalW = 900;
  
  // Column X positions — tighter, like SankeyMATIC
  const col0X = 90;
  const col1X = 260;
  const col2X = 480;
  const col3X = 660;

  // Calculate height from the column with most nodes
  // SankeyMATIC: total node height = diagram height - spacing gaps
  const maxNodes = Math.max(col3Entries.length, col2Entries.length, data.incomeNodes.length);
  const targetH = Math.max(500, maxNodes * 28 + padY * 2);
  const height = targetH;
  const usableH = height - padY * 2;

  // Proportional layout like SankeyMATIC: each node's height = (value/total) * available
  function layoutProportional(entries: { id: string; label: string; value: number; color: string }[], total: number): SNode[] {
    const availH = usableH - Math.max(0, entries.length - 1) * nodeSpacing;
    const nodes: SNode[] = [];
    let y = padY;
    entries.forEach(e => {
      const h = Math.max(2, (e.value / total) * availH);
      nodes.push({ ...e, y, h });
      y += h + nodeSpacing;
    });
    // Center vertically
    const used = nodes.length > 0 ? nodes[nodes.length - 1].y + nodes[nodes.length - 1].h - nodes[0].y : 0;
    const off = Math.max(0, (usableH - used) / 2);
    nodes.forEach(n => n.y += off);
    return nodes;
  }

  // Col0: income
  const incColor = "#b39ddb";
  const col0Nodes = layoutProportional(
    data.incomeNodes.map(n => ({ id: `inc-${n.label}`, label: n.label, value: n.value, color: incColor })),
    data.totalIncome
  );

  // Col1: single "Indtægt" node — same height as col0 total
  const c0top = col0Nodes[0]?.y ?? padY;
  const c0bot = col0Nodes.length > 0 ? col0Nodes[col0Nodes.length - 1].y + col0Nodes[col0Nodes.length - 1].h : padY + usableH;
  const col1Node: SNode = { id: "total-income", label: "Indtægt", value: data.totalIncome, y: c0top, h: c0bot - c0top, color: "#1565c0" };

  // Col2: categories
  const col2Nodes = layoutProportional(col2Entries, data.totalIncome);

  // Col3: items
  const col3Nodes = layoutProportional(
    col3Entries.map(e => ({ id: e.id, label: e.label, value: e.value, color: e.color })),
    data.totalIncome
  );

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
      const fh = Math.max(1, (entry.value / cat.value) * cat.h);
      flows2to3.push({ path: flowPath(col2X + nodeW, cursors[ci], cursors[ci] + fh, col3X, item.y, item.y + item.h), color: entry.color, id: `f2-${idx}`, itemId: entry.id, catId: entry.catId });
      cursors[ci] += fh;
    });
  }

  // Hover
  const isRelated = (catId: string, itemId?: string) => {
    if (!hovered) return true;
    if (hovered === catId) return true;
    if (itemId && hovered === itemId) return true;
    const he = col3Entries.find(e => e.id === hovered);
    return he ? he.catId === catId : false;
  };
  // SankeyMATIC uses ~0.4-0.5 flow opacity by default
  const fop = (catId: string, itemId?: string) => !hovered ? 0.45 : isRelated(catId, itemId) ? 0.7 : 0.06;

  // Label Y resolver — for cols where nodes may be too small for labels
  function labelYPositions(nodes: SNode[], minSpacing: number): number[] {
    const centers = nodes.map(n => n.y + n.h / 2);
    const resolved = [...centers];
    for (let pass = 0; pass < 15; pass++) {
      let moved = false;
      for (let i = 1; i < resolved.length; i++) {
        if (resolved[i] - resolved[i - 1] < minSpacing) {
          const push = (minSpacing - (resolved[i] - resolved[i - 1])) / 2 + 0.5;
          resolved[i - 1] -= push;
          resolved[i] += push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return resolved;
  }

  const col2LabelYs = labelYPositions(col2Nodes, 22);
  const col3LabelYs = labelYPositions(col3Nodes, 20);

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
        <svg viewBox={`0 0 ${totalW} ${height}`} className="w-full" style={{ minHeight: Math.min(height, 650) }} preserveAspectRatio="xMidYMid meet">
          
          {/* Flows — rendered FIRST so nodes sit on top */}
          {flows0to1.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={hovered ? 0.12 : 0.45} className="transition-opacity duration-200" />)}
          {flows1to2.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId)} className="transition-opacity duration-200 cursor-pointer" onMouseEnter={() => setHovered(f.catId)} onMouseLeave={() => setHovered(null)} />)}
          {flows2to3.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId, f.itemId)} className="transition-opacity duration-200 cursor-pointer" onMouseEnter={() => setHovered(f.itemId)} onMouseLeave={() => setHovered(null)} />)}

          {/* Col0: Income nodes — SankeyMATIC style: solid opaque bars, label beside */}
          {col0Nodes.map(n => (
            <g key={n.id}>
              <rect x={col0X} y={n.y} width={nodeW} height={n.h} fill={n.color} opacity={1} />
              <text x={col0X - 6} y={n.y + n.h / 2} textAnchor="end" dominantBaseline="central" fontSize={15} fontWeight={700} className="text-foreground" fill="currentColor">{n.label}</text>
              <text x={col0X - 6} y={n.y + n.h / 2 + 18} textAnchor="end" dominantBaseline="central" fontSize={14} className="text-muted-foreground" fill="currentColor">{formatKr(n.value)}</text>
            </g>
          ))}

          {/* Col1: Aggregate node */}
          <rect x={col1X} y={col1Node.y} width={nodeW} height={col1Node.h} fill={col1Node.color} opacity={1} />
          {/* Label inside/over the node area */}
          <text x={col1X + nodeW / 2} y={col1Node.y + col1Node.h / 2 - 10} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill="white"
            paintOrder="stroke" stroke={col1Node.color} strokeWidth={6} strokeLinejoin="round">Indtægt</text>
          <text x={col1X + nodeW / 2} y={col1Node.y + col1Node.h / 2 + 12} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600} fill="white"
            paintOrder="stroke" stroke={col1Node.color} strokeWidth={6} strokeLinejoin="round">{formatKr(data.totalIncome)}</text>

          {/* Col2: Category nodes */}
          {col2Nodes.map((n, i) => {
            const active = isRelated(n.id);
            const ly = col2LabelYs[i];
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col2X} y={n.y} width={nodeW} height={n.h} fill={n.color} opacity={active ? 1 : 0.35} className="transition-opacity duration-200" />
                {/* Label to the right of node, like SankeyMATIC */}
                <text x={col2X + nodeW + 6} y={ly - 5} dominantBaseline="central" fontSize={12} fontWeight={700} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.35}>{n.label}</text>
                <text x={col2X + nodeW + 6} y={ly + 11} dominantBaseline="central" fontSize={11} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.2}>{formatKr(n.value)}</text>
              </g>
            );
          })}

          {/* Col3: Item nodes */}
          {col3Nodes.map((n, idx) => {
            const entry = col3Entries[idx];
            const active = isRelated(entry.catId, n.id);
            const ly = col3LabelYs[idx];
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col3X} y={n.y} width={nodeW} height={Math.max(n.h, 2)} fill={n.color} opacity={active ? 1 : 0.25} className="transition-opacity duration-200" />
                <text x={col3X + nodeW + 6} y={ly - 5} dominantBaseline="central" fontSize={12} fontWeight={600} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{n.label}</text>
                <text x={col3X + nodeW + 6} y={ly + 11} dominantBaseline="central" fontSize={11} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.15}>{formatKr(n.value)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

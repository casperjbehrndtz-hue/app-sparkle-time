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

function getColor(cat: string) { return CAT_COLORS[cat] || "#b0b0b0"; }

function flowPath(x0: number, y0t: number, y0b: number, x1: number, y1t: number, y1b: number): string {
  const cx = (x0 + x1) / 2;
  return `M ${x0},${y0t} C ${cx},${y0t} ${cx},${y1t} ${x1},${y1t} L ${x1},${y1b} C ${cx},${y1b} ${cx},${y0b} ${x0},${y0b} Z`;
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

  // ── Layout ──
  // The key insight: height is driven by col3 (most items) — each needs FIXED vertical space for readable labels
  const LABEL_ROW_H = 32; // px per label row — enough for name + amount
  const nodeW = 12;
  const padY = 20;
  const totalW = 1050;
  const col0X = 110;
  const col1X = 320;
  const col2X = 600;
  const col3X = 800;

  // Height = enough for all col3 items with fixed spacing
  const height = Math.max(500, col3Entries.length * LABEL_ROW_H + padY * 2);
  const usableH = height - padY * 2;

  // Col3 nodes: evenly spaced (each gets LABEL_ROW_H), with flow height proportional to value
  const col3Nodes: SNode[] = col3Entries.map((e, i) => {
    const slotY = padY + i * LABEL_ROW_H;
    const flowH = Math.max(3, (e.value / data.totalIncome) * usableH);
    // Center the flow bar within its slot
    const y = slotY + (LABEL_ROW_H - flowH) / 2;
    return { id: e.id, label: e.label, value: e.value, color: e.color, y: Math.max(slotY, y), h: Math.min(flowH, LABEL_ROW_H - 2) };
  });

  // Col2 nodes: position based on their items in col3
  const col2Nodes: SNode[] = col2Entries.map(entry => {
    // Find range of col3 items belonging to this category
    const itemIndices = col3Entries
      .map((e, i) => e.catId === entry.id ? i : -1)
      .filter(i => i >= 0);
    
    if (itemIndices.length === 0) {
      return { ...entry, y: padY, h: 10 };
    }
    
    const firstItem = col3Nodes[itemIndices[0]];
    const lastItem = col3Nodes[itemIndices[itemIndices.length - 1]];
    const y = firstItem.y;
    const h = Math.max(8, lastItem.y + lastItem.h - firstItem.y);
    
    return { ...entry, y, h };
  });

  // Col1: single aggregate spanning all col2 nodes
  const col1Top = col2Nodes.length > 0 ? col2Nodes[0].y : padY;
  const col1Bot = col2Nodes.length > 0 ? col2Nodes[col2Nodes.length - 1].y + col2Nodes[col2Nodes.length - 1].h : padY + usableH;
  const col1Node: SNode = { id: "total-income", label: "Indtægt", value: data.totalIncome, y: col1Top, h: col1Bot - col1Top, color: "#7e57c2" };

  // Col0: income sources
  const incColor = "#b39ddb";
  const col0Nodes: SNode[] = (() => {
    const nodes: SNode[] = [];
    let y = col1Node.y;
    data.incomeNodes.forEach((n, i) => {
      const h = (n.value / data.totalIncome) * col1Node.h;
      nodes.push({ id: `inc-${n.label}`, label: n.label, value: n.value, color: incColor, y, h: Math.max(20, h) });
      y += Math.max(20, h) + 8;
    });
    return nodes;
  })();

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

  // Hover
  const isRelated = (catId: string, itemId?: string) => {
    if (!hovered) return true;
    if (hovered === catId) return true;
    if (itemId && hovered === itemId) return true;
    const he = col3Entries.find(e => e.id === hovered);
    return he ? he.catId === catId : false;
  };
  const fop = (catId: string, itemId?: string) => !hovered ? 0.7 : isRelated(catId, itemId) ? 0.82 : 0.05;

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
        <svg viewBox={`0 0 ${totalW} ${height}`} className="w-full" style={{ minHeight: Math.min(height, 700) }} preserveAspectRatio="xMidYMid meet">
          
          {/* Flows Col0→Col1 */}
          {flows0to1.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={hovered ? 0.15 : 0.55} className="transition-opacity duration-200" />)}

          {/* Flows Col1→Col2 */}
          {flows1to2.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId)} className="transition-opacity duration-200 cursor-pointer" onMouseEnter={() => setHovered(f.catId)} onMouseLeave={() => setHovered(null)} />)}

          {/* Flows Col2→Col3 */}
          {flows2to3.map(f => <path key={f.id} d={f.path} fill={f.color} opacity={fop(f.catId, f.itemId)} className="transition-opacity duration-200 cursor-pointer" onMouseEnter={() => setHovered(f.itemId)} onMouseLeave={() => setHovered(null)} />)}

          {/* Col0: Income */}
          {col0Nodes.map(n => (
            <g key={n.id}>
              <rect x={col0X} y={n.y} width={nodeW} height={n.h} rx={2} fill={n.color} />
              <text x={col0X - 12} y={n.y + n.h / 2 - 9} textAnchor="end" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="currentColor" className="text-foreground">{n.label}</text>
              <text x={col0X - 12} y={n.y + n.h / 2 + 11} textAnchor="end" dominantBaseline="middle" fontSize={14} fill="currentColor" className="text-muted-foreground">{formatKr(n.value)}</text>
            </g>
          ))}

          {/* Col1: Aggregate */}
          <rect x={col1X} y={col1Node.y} width={nodeW} height={col1Node.h} rx={2} fill={col1Node.color} />
          <text x={col1X - 12} y={col1Node.y + col1Node.h / 2 - 10} textAnchor="end" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="currentColor" className="text-foreground">Indtægt</text>
          <text x={col1X - 12} y={col1Node.y + col1Node.h / 2 + 12} textAnchor="end" dominantBaseline="middle" fontSize={14} fill="currentColor" className="text-muted-foreground">{formatKr(data.totalIncome)}</text>

          {/* Col2: Categories — label to the left */}
          {col2Nodes.map(n => {
            const active = isRelated(n.id);
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col2X} y={n.y} width={nodeW} height={n.h} rx={2} fill={n.color} opacity={active ? 1 : 0.3} className="transition-opacity duration-200" />
                <text x={col2X - 10} y={n.y + n.h / 2 - 7} textAnchor="end" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{n.label}</text>
                <text x={col2X - 10} y={n.y + n.h / 2 + 9} textAnchor="end" dominantBaseline="middle" fontSize={12} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.2}>{formatKr(n.value)}</text>
              </g>
            );
          })}

          {/* Col3: Items — each in its own LABEL_ROW_H slot, no overlap possible */}
          {col3Nodes.map((n, idx) => {
            const entry = col3Entries[idx];
            const active = isRelated(entry.catId, n.id);
            const slotY = padY + idx * LABEL_ROW_H; // guaranteed non-overlapping
            return (
              <g key={n.id} className="cursor-pointer" onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}>
                <rect x={col3X} y={n.y} width={nodeW} height={Math.max(n.h, 3)} rx={2} fill={n.color} opacity={active ? 1 : 0.2} className="transition-opacity duration-200" />
                <text x={col3X + nodeW + 10} y={slotY + LABEL_ROW_H / 2 - 7} dominantBaseline="middle" fontSize={13} fontWeight={600} fill="currentColor" className="text-foreground" opacity={active ? 1 : 0.3}>{n.label}</text>
                <text x={col3X + nodeW + 10} y={slotY + LABEL_ROW_H / 2 + 9} dominantBaseline="middle" fontSize={12} fill="currentColor" className="text-muted-foreground" opacity={active ? 0.8 : 0.15}>{formatKr(n.value)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

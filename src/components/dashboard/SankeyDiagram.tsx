import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget } from "@/lib/types";

interface Props {
  budget: ComputedBudget;
}

const SANKEY_COLORS: Record<string, string> = {
  "Bolig": "#1e40af",
  "Forsyning": "#3b82f6",
  "Transport": "#d97706",
  "Abonnementer": "#6366f1",
  "Forsikring": "#0ea5e9",
  "Fagforening": "#64748b",
  "Børn": "#f59e0b",
  "Kæledyr": "#a3a3a3",
  "Lån": "#7c3aed",
  "Fitness": "#14b8a6",
  "Opsparing": "#059669",
  "Mad & dagligvarer": "#dc2626",
  "Fritid": "#f97316",
  "Tøj": "#ec4899",
  "Sundhed": "#ef4444",
  "Restaurant": "#e11d48",
  "Andet": "#94a3b8",
};

function getColor(cat: string) {
  return SANKEY_COLORS[cat] || "#94a3b8";
}

export function SankeyDiagram({ budget }: Props) {
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);

  const { flows, totalIncome, disposable } = useMemo(() => {
    const categoryMap = new Map<string, number>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    });

    const sorted = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0);

    return {
      flows: sorted,
      totalIncome: budget.totalIncome,
      disposable: Math.max(0, budget.disposableIncome),
    };
  }, [budget]);

  // Layout constants
  const width = 600;
  const height = Math.max(360, (flows.length + 2) * 28 + 40);
  const leftX = 0;
  const leftW = 90;
  const rightX = width - 120;
  const rightW = 120;
  const midX1 = leftX + leftW;
  const midX2 = rightX;
  const gap = 3;

  // Left node: single "Indkomst" block
  const leftHeight = height - 40;
  const leftY = 20;

  // Right nodes: one per category + disposable
  const allRight = [...flows, ["Til overs", disposable] as [string, number]];
  const totalRight = allRight.reduce((s, [, v]) => s + (v as number), 0);
  const availableHeight = height - 40 - (allRight.length - 1) * gap;

  // Compute right node positions
  const rightNodes = useMemo(() => {
    let y = 20;
    return allRight.map(([name, value]) => {
      const h = Math.max(4, (value as number / totalRight) * availableHeight);
      const node = { name: name as string, value: value as number, y, h, color: name === "Til overs" ? "#2563eb" : getColor(name as string) };
      y += h + gap;
      return node;
    });
  }, [allRight, totalRight, availableHeight]);

  // Generate curved paths (Sankey links)
  function sankeyPath(sourceY: number, sourceH: number, targetY: number, targetH: number) {
    const x0 = midX1;
    const x1 = midX2;
    const cx = (x0 + x1) / 2;

    const y0top = sourceY;
    const y0bot = sourceY + sourceH;
    const y1top = targetY;
    const y1bot = targetY + targetH;

    return `M ${x0},${y0top} C ${cx},${y0top} ${cx},${y1top} ${x1},${y1top} L ${x1},${y1bot} C ${cx},${y1bot} ${cx},${y0bot} ${x0},${y0bot} Z`;
  }

  // Map flows to source positions on the left
  const flowPaths = useMemo(() => {
    let currentLeftY = leftY;
    return rightNodes.map((node) => {
      const proportion = node.value / totalRight;
      const sourceH = proportion * leftHeight;
      const path = sankeyPath(currentLeftY, sourceH, node.y, node.h);
      const result = { ...node, path, sourceY: currentLeftY, sourceH };
      currentLeftY += sourceH;
      return result;
    });
  }, [rightNodes, totalRight, leftHeight, leftY]);

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
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`-10 0 ${width + 20} ${height}`}
          className="w-full"
          style={{ minHeight: 280, maxHeight: 500 }}
        >
          {/* Left node — Indkomst */}
          <rect
            x={leftX}
            y={leftY}
            width={leftW - 2}
            height={leftHeight}
            rx={6}
            fill="#1e3a5f"
            opacity={0.9}
          />
          <text
            x={leftX + (leftW - 2) / 2}
            y={leftY + leftHeight / 2 - 8}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight={600}
          >
            Indkomst
          </text>
          <text
            x={leftX + (leftW - 2) / 2}
            y={leftY + leftHeight / 2 + 10}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            opacity={0.8}
          >
            {formatKr(totalIncome)} kr.
          </text>

          {/* Flow paths */}
          {flowPaths.map((flow) => (
            <motion.path
              key={flow.name}
              d={flow.path}
              fill={flow.color}
              opacity={hoveredFlow === null ? 0.45 : hoveredFlow === flow.name ? 0.7 : 0.15}
              onMouseEnter={() => setHoveredFlow(flow.name)}
              onMouseLeave={() => setHoveredFlow(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredFlow === null ? 0.45 : hoveredFlow === flow.name ? 0.7 : 0.15 }}
              transition={{ duration: 0.2 }}
              className="cursor-pointer"
            />
          ))}

          {/* Right nodes */}
          {rightNodes.map((node) => (
            <g
              key={node.name}
              onMouseEnter={() => setHoveredFlow(node.name)}
              onMouseLeave={() => setHoveredFlow(null)}
              className="cursor-pointer"
            >
              <rect
                x={rightX}
                y={node.y}
                width={rightW}
                height={Math.max(node.h, 4)}
                rx={4}
                fill={node.color}
                opacity={hoveredFlow === null ? 0.85 : hoveredFlow === node.name ? 1 : 0.3}
              />
              {node.h > 14 && (
                <>
                  <text
                    x={rightX + rightW + 6}
                    y={node.y + node.h / 2 - 1}
                    fill="currentColor"
                    fontSize={10}
                    fontWeight={500}
                    dominantBaseline="middle"
                    className="text-foreground"
                    opacity={hoveredFlow === null ? 1 : hoveredFlow === node.name ? 1 : 0.3}
                  >
                    {node.name}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Hover tooltip */}
          {hoveredFlow && (() => {
            const flow = flowPaths.find((f) => f.name === hoveredFlow);
            if (!flow) return null;
            const pct = Math.round((flow.value / totalIncome) * 100);
            return (
              <g>
                <rect
                  x={width / 2 - 75}
                  y={0}
                  width={150}
                  height={36}
                  rx={8}
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  opacity={0.95}
                />
                <text x={width / 2} y={15} textAnchor="middle" fontSize={10} fontWeight={600} fill="currentColor" className="text-foreground">
                  {flow.name}
                </text>
                <text x={width / 2} y={29} textAnchor="middle" fontSize={10} fill="currentColor" className="text-muted-foreground">
                  {formatKr(flow.value)} kr. ({pct}%)
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

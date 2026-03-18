import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
} from "d3-sankey";
import { useI18n } from "@/lib/i18n";

// Node keys + colors — labels resolved via i18n
const DEMO_NODE_DEFS = [
  { key: "sankey.salary", color: "#60a5fa" },
  { key: "cat.Bolig", color: "#f97316" },
  { key: "cat.Mad & dagligvarer", color: "#34d399" },
  { key: "cat.Transport", color: "#c084fc" },
  { key: "cat.Forsikring", color: "#fbbf24" },
  { key: "cat.Abonnementer", color: "#f472b6" },
  { key: "cat.Opsparing", color: "#38bdf8" },
  { key: "sankey.leftOver", color: "#22d3ee" },
];

const DEMO_LINKS = [
  { source: 0, target: 1, value: 9500 },
  { source: 0, target: 2, value: 4500 },
  { source: 0, target: 3, value: 2800 },
  { source: 0, target: 4, value: 1800 },
  { source: 0, target: 5, value: 700 },
  { source: 0, target: 6, value: 3000 },
  { source: 0, target: 7, value: 5700 },
];

const W = 420;
const H = 300;

interface NodeExtra { name: string; color: string; }
interface LinkExtra { color: string; }

export function HeroSankey() {
  const { t } = useI18n();
  const DEMO_NODES = DEMO_NODE_DEFS.map(d => ({ name: t(d.key), color: d.color }));

  const { nodes, links } = useMemo(() => {
    const resolvedNodes = DEMO_NODE_DEFS.map(d => ({ name: t(d.key), color: d.color }));
    const graph = d3Sankey<NodeExtra, LinkExtra>()
      .nodeWidth(6)
      .nodePadding(10)
      .nodeAlign(sankeyJustify)
      .extent([[80, 12], [W - 100, H - 12]])({
        nodes: resolvedNodes.map(n => ({ ...n })),
        links: DEMO_LINKS.map(l => ({ ...l, color: resolvedNodes[l.target].color })),
      });
    return { nodes: graph.nodes, links: graph.links };
  }, [t]);

  const linkPath = sankeyLinkHorizontal();

  const grads = links.map((link, i) => {
    const src = typeof link.source === "object" ? link.source : null;
    return {
      id: `hg-${i}`,
      from: src?.color || "#60a5fa",
      to: (link as any).color || "#ccc",
    };
  });

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] shadow-2xl shadow-black/20 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {grads.map(g => (
            <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={g.from} stopOpacity="0.5" />
              <stop offset="100%" stopColor={g.to} stopOpacity="0.7" />
            </linearGradient>
          ))}
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const d = linkPath(link as any);
          if (!d) return null;
          return (
            <motion.path
              key={`l-${i}`}
              d={d}
              fill="none"
              stroke={`url(#hg-${i})`}
              strokeWidth={Math.max(1.5, link.width || 1)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.08 }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const x0 = node.x0 ?? 0, x1 = node.x1 ?? 0, y0 = node.y0 ?? 0, y1 = node.y1 ?? 0;
          const w = x1 - x0, h = y1 - y0;
          const isSource = i === 0;
          const income = 28000;
          const pct = Math.round(((node.value ?? 0) / income) * 100);

          return (
            <g key={`n-${i}`}>
              <motion.rect
                x={x0} y={y0} width={w} height={h} rx={3}
                fill={node.color}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.05 }}
                style={{ transformOrigin: `${x0 + w / 2}px ${y0 + h / 2}px` }}
              />

              {isSource ? (
                <motion.text
                  x={x0 - 8} y={y0 + h / 2}
                  textAnchor="end" dominantBaseline="central"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <tspan fontSize={12} fontWeight={700} fill="white">{node.name}</tspan>
                  <tspan x={x0 - 8} dy={15} fontSize={10} fill="white" opacity={0.4} textAnchor="end">28.000 kr.</tspan>
                </motion.text>
              ) : (
                <motion.text
                  x={x1 + 8} y={y0 + h / 2}
                  dominantBaseline="central"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.04 }}
                >
                  <tspan fontSize={10} fontWeight={600} fill="white" opacity={0.9}>{node.name}</tspan>
                  <tspan dx={5} fontSize={9} fill="white" opacity={0.35}>{pct}%</tspan>
                </motion.text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

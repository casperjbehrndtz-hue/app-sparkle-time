/**
 * SalaryTimeline — career progression chart built from archived payslips.
 *
 * Shows annual salary development with:
 * - Area chart for brutto/netto over time
 * - Automatic detection of job changes (industry/title changes)
 * - Percentage increase labels at salary jumps
 * - Pension line overlay
 * - Canvas export for sharing on Reddit / social media
 */
import { useMemo, useRef, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Download,
  Share2,
  Clipboard,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import type { ArchivedPayslip } from "@/lib/payslipArchive";

// ─── Types ──────────────────────────────────────────────

interface YearData {
  year: string;
  brutto: number;
  netto: number;
  pension: number;
  /** Number of months aggregated */
  months: number;
  /** Percentage change from previous year */
  changePct?: number;
  /** Job/industry change detected */
  jobChange?: string;
}

interface Props {
  /** Archived payslips — can come from localStorage or fresh batch */
  payslips: ArchivedPayslip[];
}

// ─── Helpers ────────────────────────────────────────────

/** Group payslips by year and compute annual averages */
function buildYearData(payslips: ArchivedPayslip[]): YearData[] {
  const sorted = [...payslips].sort((a, b) => a.period.localeCompare(b.period));

  // Group by year
  const byYear = new Map<string, ArchivedPayslip[]>();
  for (const p of sorted) {
    const year = p.period.slice(0, 4);
    const arr = byYear.get(year) ?? [];
    arr.push(p);
    byYear.set(year, arr);
  }

  const years: YearData[] = [];
  let prevBrutto = 0;
  let prevJob = "";

  for (const [year, entries] of byYear) {
    const avgBrutto = Math.round(entries.reduce((s, e) => s + e.bruttolon, 0) / entries.length);
    const avgNetto = Math.round(entries.reduce((s, e) => s + e.nettolon, 0) / entries.length);
    const avgPension = Math.round(
      entries.reduce((s, e) => s + e.pensionEmployee + e.pensionEmployer, 0) / entries.length,
    );

    // Detect job change: industry or title changed
    const latestEntry = entries[entries.length - 1];
    const currentJob = [latestEntry.anonJobTitle, latestEntry.anonIndustry].filter(Boolean).join(", ");
    const jobChange = prevJob && currentJob && currentJob !== prevJob ? currentJob : undefined;
    prevJob = currentJob || prevJob;

    const changePct = prevBrutto > 0
      ? Math.round(((avgBrutto - prevBrutto) / prevBrutto) * 1000) / 10
      : undefined;
    prevBrutto = avgBrutto;

    years.push({
      year,
      brutto: avgBrutto,
      netto: avgNetto,
      pension: avgPension,
      months: entries.length,
      changePct,
      jobChange,
    });
  }

  return years;
}

/** Compute career summary stats */
function computeStats(data: YearData[]) {
  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const totalChangePct = first.brutto > 0
    ? Math.round(((last.brutto - first.brutto) / first.brutto) * 1000) / 10
    : 0;
  const yearSpan = parseInt(last.year) - parseInt(first.year);
  const avgAnnualPct = yearSpan > 0 ? Math.round((totalChangePct / yearSpan) * 10) / 10 : 0;

  const biggestJump = data.reduce((best, d) => {
    if (d.changePct && Math.abs(d.changePct) > Math.abs(best.pct)) {
      return { pct: d.changePct, year: d.year };
    }
    return best;
  }, { pct: 0, year: "" });

  const jobChanges = data.filter((d) => d.jobChange).length;

  return {
    totalChangePct,
    avgAnnualPct,
    yearSpan,
    biggestJump,
    jobChanges,
    firstYear: first.year,
    lastYear: last.year,
    currentBrutto: last.brutto,
    currentNetto: last.netto,
  };
}

// ─── Canvas export ──────────────────────────────────────

const EXPORT_W = 1200;
const EXPORT_H = 630;

function exportTimelineImage(
  data: YearData[],
  stats: ReturnType<typeof computeStats>,
  lang: string,
  lc: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_W;
    canvas.height = EXPORT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("No canvas context"));

    // Background
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    // Title
    ctx.fillStyle = "#f0eeea";
    ctx.font = "bold 28px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(
      lang === "da" ? "Min lønudvikling" : lang === "nb" ? "Min lønnsutvikling" : "My salary development",
      40,
      50,
    );

    if (stats) {
      ctx.fillStyle = "#9a9da5";
      ctx.font = "16px 'Inter', system-ui, sans-serif";
      ctx.fillText(`${stats.firstYear}–${stats.lastYear}`, 40, 78);
    }

    // Chart area
    const chartLeft = 80;
    const chartRight = EXPORT_W - 40;
    const chartTop = 110;
    const chartBottom = EXPORT_H - 120;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    if (data.length === 0) {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      return;
    }

    const maxBrutto = Math.max(...data.map((d) => d.brutto)) * 1.1;

    // Grid lines
    ctx.strokeStyle = "#2a2d35";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartTop + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      // Y-axis labels
      const val = Math.round(maxBrutto * (1 - i / 4));
      ctx.fillStyle = "#555860";
      ctx.font = "12px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(val / 1000)}k`, chartLeft - 8, y + 4);
    }
    ctx.textAlign = "left";

    // Plot points
    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;
    const points = data.map((d, i) => ({
      x: chartLeft + (data.length > 1 ? xStep * i : chartW / 2),
      yBrutto: chartTop + chartH * (1 - d.brutto / maxBrutto),
      yNetto: chartTop + chartH * (1 - d.netto / maxBrutto),
      yPension: chartTop + chartH * (1 - d.pension / maxBrutto),
    }));

    // Brutto area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, chartBottom);
    for (const p of points) ctx.lineTo(p.x, p.yBrutto);
    ctx.lineTo(points[points.length - 1].x, chartBottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    grad.addColorStop(0, "rgba(59, 130, 246, 0.3)");
    grad.addColorStop(1, "rgba(59, 130, 246, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Brutto line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].yBrutto);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yBrutto);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Netto line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].yNetto);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yNetto);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pension dashed
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(points[0].x, points[0].yPension);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yPension);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Dots + year labels + change labels
    for (let i = 0; i < data.length; i++) {
      const p = points[i];
      const d = data[i];

      // Brutto dot
      ctx.beginPath();
      ctx.arc(p.x, p.yBrutto, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#0f1117";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Year label
      ctx.fillStyle = "#9a9da5";
      ctx.font = "13px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.year, p.x, chartBottom + 20);

      // Change percentage
      if (d.changePct && i > 0) {
        const color = d.changePct > 0 ? "#10b981" : "#ef4444";
        const sign = d.changePct > 0 ? "+" : "";
        ctx.fillStyle = color;
        ctx.font = "bold 12px 'Inter', system-ui, sans-serif";
        ctx.fillText(`${sign}${d.changePct}%`, p.x, p.yBrutto - 14);
      }

      // Job change marker
      if (d.jobChange) {
        ctx.fillStyle = "#f59e0b";
        ctx.font = "11px 'Inter', system-ui, sans-serif";
        ctx.fillText("*", p.x + 10, p.yBrutto - 4);
      }
    }

    // Legend
    const legendY = EXPORT_H - 60;
    ctx.textAlign = "left";
    const legendItems = [
      { color: "#3b82f6", label: lang === "da" ? "Brutto" : lang === "nb" ? "Brutto" : "Gross" },
      { color: "#10b981", label: lang === "da" ? "Netto" : lang === "nb" ? "Netto" : "Net" },
      { color: "#f59e0b", label: lang === "da" ? "Pension" : lang === "nb" ? "Pensjon" : "Pension" },
    ];
    let lx = chartLeft;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, legendY, 16, 3);
      ctx.fillStyle = "#9a9da5";
      ctx.font = "12px 'Inter', system-ui, sans-serif";
      ctx.fillText(item.label, lx + 22, legendY + 5);
      lx += 100;
    }

    // Stats summary
    if (stats) {
      ctx.fillStyle = "#555860";
      ctx.font = "12px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "right";
      const lines = [
        `${lang === "da" ? "Total stigning" : lang === "nb" ? "Total økning" : "Total increase"}: ${stats.totalChangePct > 0 ? "+" : ""}${stats.totalChangePct}%`,
        `${lang === "da" ? "Gns. årlig" : lang === "nb" ? "Snitt årlig" : "Avg. annual"}: ${stats.avgAnnualPct > 0 ? "+" : ""}${stats.avgAnnualPct}%`,
      ];
      lines.forEach((l, i) => ctx.fillText(l, chartRight, legendY + i * 18));
    }

    // Watermark
    ctx.fillStyle = "#3a3d45";
    ctx.font = "11px 'Inter', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("nemtbudget.nu/lonudvikling", EXPORT_W / 2, EXPORT_H - 12);

    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

// ─── Component ──────────────────────────────────────────

export function SalaryTimeline({ payslips }: Props) {
  const { t, lang } = useI18n();
  const { currencyLocale: lc } = useLocale();
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => buildYearData(payslips), [payslips]);
  const stats = useMemo(() => computeStats(data), [data]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportTimelineImage(data, stats, lang, lc);

      // Try clipboard first
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "lonudvikling.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [data, stats, lang, lc]);

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {t("timeline.needMore")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t("timeline.totalGrowth")}
            value={`${stats.totalChangePct > 0 ? "+" : ""}${stats.totalChangePct}%`}
            positive={stats.totalChangePct > 0}
          />
          <StatCard
            label={t("timeline.avgAnnual")}
            value={`${stats.avgAnnualPct > 0 ? "+" : ""}${stats.avgAnnualPct}%`}
            positive={stats.avgAnnualPct > 0}
          />
          <StatCard
            label={t("timeline.currentBrutto")}
            value={formatKr(stats.currentBrutto, lc)}
          />
          <StatCard
            label={t("timeline.period")}
            value={`${stats.firstYear}–${stats.lastYear}`}
          />
        </div>
      )}

      {/* Main chart */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{t("timeline.title")}</span>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-emerald-500" /> {t("timeline.copied")}</>
            ) : (
              <><Share2 className="w-3 h-3" /> {t("timeline.share")}</>
            )}
          </button>
        </div>

        <div className="p-4">
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bruttoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatKr(value as number, lc),
                    name === "brutto"
                      ? t("timeline.gross")
                      : name === "netto"
                      ? t("timeline.net")
                      : t("timeline.pension"),
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                {/* Job change markers */}
                {data
                  .filter((d) => d.jobChange)
                  .map((d) => (
                    <ReferenceLine
                      key={d.year}
                      x={d.year}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: d.jobChange!.length > 20 ? d.jobChange!.slice(0, 18) + "…" : d.jobChange!,
                        position: "insideTopRight",
                        fill: "#f59e0b",
                        fontSize: 10,
                      }}
                    />
                  ))}
                <Area
                  type="monotone"
                  dataKey="brutto"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#bruttoGrad)"
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "var(--card)" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="netto"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="pension"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-blue-500 rounded" /> {t("timeline.gross")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-emerald-500 rounded" /> {t("timeline.net")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-500 rounded" /> {t("timeline.pension")}
            </span>
          </div>
        </div>
      </div>

      {/* Change log */}
      {data.some((d) => d.changePct) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">{t("timeline.changes")}</p>
          {data
            .filter((d) => d.changePct)
            .map((d) => (
              <div key={d.year} className="flex items-center gap-2 text-xs text-muted-foreground">
                {d.changePct! > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
                )}
                <span>
                  <strong>{d.year}:</strong>{" "}
                  {d.changePct! > 0 ? "+" : ""}
                  {d.changePct}%
                  {d.jobChange && (
                    <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                      <Briefcase className="w-2.5 h-2.5 inline mr-0.5" />
                      {d.jobChange}
                    </span>
                  )}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-base font-bold ${
          positive === true
            ? "text-emerald-600 dark:text-emerald-400"
            : positive === false
            ? "text-red-600 dark:text-red-400"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

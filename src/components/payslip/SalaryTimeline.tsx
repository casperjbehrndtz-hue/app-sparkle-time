/**
 * SalaryTimeline — career progression chart built from archived payslips.
 *
 * Shows monthly salary development with:
 * - Area chart for brutto + line overlays for netto/pension
 * - Automatic detection of job changes (industry/title changes)
 * - Percentage increase labels at salary jumps
 * - Canvas export for sharing on Reddit / social media
 */
import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart,
  Area,
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
  Share2,
  Check,
  Download,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import type { ArchivedPayslip } from "@/lib/payslipArchive";

// ─── Types ──────────────────────────────────────────────

interface MonthData {
  /** "YYYY-MM" for sorting / keying */
  key: string;
  /** Display label: "jan 25", "feb 25" */
  label: string;
  brutto: number;
  netto: number;
  pension: number;
  /** Percentage change from previous month */
  changePct?: number;
  /** Job/industry change detected */
  jobChange?: string;
}

interface Props {
  /** Archived payslips — can come from localStorage or fresh batch */
  payslips: ArchivedPayslip[];
}

// ─── Helpers ────────────────────────────────────────────

const SHORT_MONTHS_DA = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const SHORT_MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_MONTHS_NO = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function monthLabel(period: string, lang: string): string {
  const [yearStr, monthStr] = period.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const shortYear = yearStr.slice(2);
  const months = lang === "nb" ? SHORT_MONTHS_NO : lang === "da" ? SHORT_MONTHS_DA : SHORT_MONTHS_EN;
  return `${months[monthIdx]} ${shortYear}`;
}

/** Build monthly data points from archived payslips (one point per period) */
function buildMonthData(payslips: ArchivedPayslip[], lang: string): MonthData[] {
  const sorted = [...payslips].sort((a, b) => a.period.localeCompare(b.period));

  // Deduplicate by period (keep latest savedAt)
  const byPeriod = new Map<string, ArchivedPayslip>();
  for (const p of sorted) {
    const existing = byPeriod.get(p.period);
    if (!existing || p.savedAt > existing.savedAt) {
      byPeriod.set(p.period, p);
    }
  }

  const months: MonthData[] = [];
  let prevBrutto = 0;
  let prevJob = "";

  for (const [period, entry] of byPeriod) {
    const pension = entry.pensionEmployee + entry.pensionEmployer;

    // Detect job change
    const currentJob = [entry.anonJobTitle, entry.anonIndustry].filter(Boolean).join(", ");
    const jobChange = prevJob && currentJob && currentJob !== prevJob ? currentJob : undefined;
    prevJob = currentJob || prevJob;

    const changePct = prevBrutto > 0
      ? Math.round(((entry.bruttolon - prevBrutto) / prevBrutto) * 1000) / 10
      : undefined;
    prevBrutto = entry.bruttolon;

    months.push({
      key: period,
      label: monthLabel(period, lang),
      brutto: entry.bruttolon,
      netto: entry.nettolon,
      pension,
      changePct,
      jobChange,
    });
  }

  return months;
}

/** Compute career summary stats */
function computeStats(data: MonthData[]) {
  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const totalChangePct = first.brutto > 0
    ? Math.round(((last.brutto - first.brutto) / first.brutto) * 1000) / 10
    : 0;

  // Year span from YYYY-MM periods
  const firstYear = parseInt(first.key.slice(0, 4));
  const firstMonth = parseInt(first.key.slice(5, 7));
  const lastYear = parseInt(last.key.slice(0, 4));
  const lastMonth = parseInt(last.key.slice(5, 7));
  const yearSpan = (lastYear - firstYear) + (lastMonth - firstMonth) / 12;

  // CAGR for avg annual growth (more accurate than linear division)
  let avgAnnualPct = 0;
  if (yearSpan >= 1 && first.brutto > 0 && last.brutto > 0) {
    avgAnnualPct = Math.round((Math.pow(last.brutto / first.brutto, 1 / yearSpan) - 1) * 1000) / 10;
  }

  const biggestJump = data.reduce((best, d) => {
    if (d.changePct && Math.abs(d.changePct) > Math.abs(best.pct)) {
      return { pct: d.changePct, key: d.key };
    }
    return best;
  }, { pct: 0, key: "" });

  const jobChanges = data.filter((d) => d.jobChange).length;

  return {
    totalChangePct,
    avgAnnualPct,
    yearSpan,
    /** Show avg annual only when span >= 2 years (otherwise it equals total) */
    showAvgAnnual: yearSpan >= 2,
    biggestJump,
    jobChanges,
    firstYear: first.key.slice(0, 4),
    lastYear: last.key.slice(0, 4),
    firstLabel: first.label,
    lastLabel: last.label,
    currentBrutto: last.brutto,
    currentNetto: last.netto,
  };
}

// ─── Canvas export ──────────────────────────────────────

const EXPORT_W = 1200;
const EXPORT_H = 630;

function exportTimelineImage(
  data: MonthData[],
  stats: ReturnType<typeof computeStats>,
  lang: string,
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
      ctx.fillText(`${stats.firstLabel} – ${stats.lastLabel}`, 40, 78);
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

    // Dots + month labels + change labels
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

      // Month label (show every label if ≤12, otherwise every other)
      const showLabel = data.length <= 12 || i % 2 === 0 || i === data.length - 1;
      if (showLabel) {
        ctx.fillStyle = "#9a9da5";
        ctx.font = "11px 'Inter', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(d.label, p.x, chartBottom + 18);
      }

      // Change percentage (only show significant changes ≥ 1%)
      if (d.changePct && Math.abs(d.changePct) >= 1 && i > 0) {
        const color = d.changePct > 0 ? "#10b981" : "#ef4444";
        const sign = d.changePct > 0 ? "+" : "";
        ctx.fillStyle = color;
        ctx.font = "bold 11px 'Inter', system-ui, sans-serif";
        ctx.textAlign = "center";
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
      ];
      if (stats.showAvgAnnual) {
        lines.push(
          `${lang === "da" ? "Gns. årlig" : lang === "nb" ? "Snitt årlig" : "Avg. annual"}: ${stats.avgAnnualPct > 0 ? "+" : ""}${stats.avgAnnualPct}%`,
        );
      }
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

  const data = useMemo(() => buildMonthData(payslips, lang), [payslips, lang]);
  const stats = useMemo(() => computeStats(data), [data]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportTimelineImage(data, stats, lang);

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
  }, [data, stats, lang]);

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
            positive={stats.totalChangePct > 0 ? true : stats.totalChangePct < 0 ? false : undefined}
          />
          {stats.showAvgAnnual ? (
            <StatCard
              label={t("timeline.avgAnnual")}
              value={`${stats.avgAnnualPct > 0 ? "+" : ""}${stats.avgAnnualPct}%`}
              positive={stats.avgAnnualPct > 0 ? true : stats.avgAnnualPct < 0 ? false : undefined}
            />
          ) : (
            <StatCard
              label={t("timeline.currentNetto")}
              value={`${formatKr(stats.currentNetto, lc)} kr`}
            />
          )}
          <StatCard
            label={t("timeline.currentBrutto")}
            value={`${formatKr(stats.currentBrutto, lc)} kr`}
          />
          <StatCard
            label={t("timeline.period")}
            value={stats.firstYear === stats.lastYear
              ? `${stats.firstLabel} – ${stats.lastLabel}`
              : `${stats.firstYear}–${stats.lastYear}`}
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 border border-border hover:bg-muted transition-colors"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-emerald-500" /> {t("timeline.copied")}</>
            ) : (
              <><Download className="w-3 h-3" /> {t("timeline.share")}</>
            )}
          </button>
        </div>

        <div className="p-4">
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bruttoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={data.length <= 12 ? 0 : "preserveStartEnd"}
                  angle={data.length > 8 ? -30 : 0}
                  textAnchor={data.length > 8 ? "end" : "middle"}
                  height={data.length > 8 ? 50 : 30}
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
                    `${formatKr(value as number, lc)} kr`,
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
                      key={d.key}
                      x={d.label}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: d.jobChange!.length > 30 ? d.jobChange!.slice(0, 28) + "…" : d.jobChange!,
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
              </ComposedChart>
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
      {data.some((d) => d.changePct && Math.abs(d.changePct) >= 1) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">{t("timeline.changes")}</p>
          {data
            .filter((d) => d.changePct && Math.abs(d.changePct) >= 1)
            .map((d) => (
              <div key={d.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                {d.changePct! > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
                )}
                <span>
                  <strong>{d.label}:</strong>{" "}
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

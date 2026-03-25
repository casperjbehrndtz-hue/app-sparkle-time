import { useState, useMemo } from "react";
import { History, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import { getArchive, deleteFromArchive, type ArchivedPayslip } from "@/lib/payslipArchive";

interface Props {
  /** Force refresh when archive changes */
  refreshKey?: number;
}

const MONTH_NAMES_DA = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPeriod(period: string, lang: string): string {
  const [year, month] = period.split("-");
  const m = parseInt(month) - 1;
  const names = lang === "en" ? MONTH_NAMES_EN : MONTH_NAMES_DA;
  return `${names[m] ?? month} ${year?.slice(2)}`;
}

export function PayslipHistory({ refreshKey }: Props) {
  const { t, lang } = useI18n();
  const { currencyLocale: lc } = useLocale();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [, setForceUpdate] = useState(0);

  const archive = useMemo(() => {
    // refreshKey triggers re-read
    void refreshKey;
    return getArchive().sort((a, b) => a.period.localeCompare(b.period));
  }, [refreshKey]);

  const chartData = useMemo(() =>
    archive.map(a => ({
      period: formatPeriod(a.period, lang),
      brutto: a.bruttolon,
      netto: a.nettolon,
      pension: a.pensionEmployee + a.pensionEmployer,
    })),
  [archive, lang]);

  if (archive.length < 2) return null;

  // Detect changes
  const changes: { arrow: string; text: string }[] = [];
  for (let i = 1; i < archive.length; i++) {
    const prev = archive[i - 1];
    const curr = archive[i];
    const diff = curr.bruttolon - prev.bruttolon;
    if (Math.abs(diff) > 100) {
      const pct = prev.bruttolon > 0 ? ((diff / prev.bruttolon) * 100).toFixed(1) : "0";
      const label = formatPeriod(curr.period, lang);
      const key = diff > 0 ? "payslip.history.salaryUp" : "payslip.history.salaryDown";
      changes.push({
        arrow: diff > 0 ? "up" : "down",
        text: t(key).replace("{pct}", pct).replace("{period}", label),
      });
    }
  }

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteFromArchive(id);
      setDeleteConfirm(null);
      setForceUpdate(v => v + 1);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("payslip.history.title")}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {archive.length} {t("payslip.history.payslips")}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                width={35}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatKr(value, lc),
                  name === "brutto" ? t("payslip.history.gross") :
                  name === "netto" ? t("payslip.history.net") :
                  t("payslip.history.pension"),
                ]}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Line type="monotone" dataKey="brutto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="netto" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pension" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded" /> {t("payslip.history.gross")}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 rounded" /> {t("payslip.history.net")}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 rounded border-dashed" /> {t("payslip.history.pension")}</span>
        </div>

        {/* Changes detected */}
        {changes.length > 0 && (
          <div className="space-y-1">
            {changes.slice(-3).map((change, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {change.arrow === "up" ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span>{change.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline pills */}
        <div className="flex flex-wrap gap-1.5">
          {archive.map(a => (
            <div
              key={a.id}
              className="group inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground"
            >
              <span>{formatPeriod(a.period, lang)}</span>
              <button
                onClick={() => handleDelete(a.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                title={deleteConfirm === a.id ? t("payslip.history.clickToDelete") : t("payslip.history.delete")}
              >
                <Trash2 className={`w-2.5 h-2.5 ${deleteConfirm === a.id ? "text-destructive" : "text-muted-foreground"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

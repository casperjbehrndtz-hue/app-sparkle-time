import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { getSnapshots } from "@/lib/snapshots";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";

export function HistorikView() {
  const snapshots = useMemo(() => getSnapshots(), []);
  const locale = useLocale();
  const { t } = useI18n();
  const lc = locale.currencyLocale;

  if (snapshots.length < 2) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
        <Clock className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <h3 className="text-sm font-semibold text-foreground">{t("history.noHistory")}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {t("history.noHistoryDesc")}
        </p>
        {snapshots.length === 1 && (
          <p className="text-[10px] text-muted-foreground/60">
            {t("history.oneSnapshot")}
          </p>
        )}
      </motion.div>
    );
  }

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const disposableDelta = last.disposableIncome - first.disposableIncome;
  const scoreDelta = last.score - first.score;

  const dateLang = locale.code === "no" ? "nb-NO" : locale.code === "en" ? "en-GB" : "da-DK";
  const chartData = snapshots.map((s) => ({
    date: new Date(s.date).toLocaleDateString(dateLang, { day: "numeric", month: "short" }),
    rawDate: s.date,
    disposable: s.disposableIncome,
    score: s.score,
    income: s.totalIncome,
    expenses: s.totalExpenses,
  }));

  return (
    <div className="space-y-6">
      {/* Delta badges */}
      <div className="flex gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex-1 rounded-xl p-4 text-center space-y-1 ${
            disposableDelta >= 0 ? "bg-primary/10" : "bg-destructive/10"
          }`}
        >
          <div className={`flex items-center justify-center gap-1 text-sm font-bold ${
            disposableDelta >= 0 ? "text-primary" : "text-destructive"
          }`}>
            {disposableDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {disposableDelta >= 0 ? "+" : ""}{formatKr(disposableDelta, lc)} {t("unit.currency")}
          </div>
          <p className="text-[10px] text-muted-foreground">{t("history.disposableSinceStart")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`flex-1 rounded-xl p-4 text-center space-y-1 ${
            scoreDelta >= 0 ? "bg-primary/10" : "bg-destructive/10"
          }`}
        >
          <div className={`flex items-center justify-center gap-1 text-sm font-bold ${
            scoreDelta >= 0 ? "text-primary" : "text-destructive"
          }`}>
            {scoreDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {scoreDelta >= 0 ? "+" : ""}{scoreDelta} {t("history.points")}
          </div>
          <p className="text-[10px] text-muted-foreground">{t("history.healthSinceStart")}</p>
        </motion.div>
      </div>

      {/* Disposable income chart */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("history.disposableOverTime")}</h3>
        <div className="h-48 w-full" role="img" aria-label={t("a11y.historyDisposable")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRaad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${formatKr(v, lc)} ${t("unit.currency")}`, t("history.tooltipDisposable")]}
              />
              <Area type="monotone" dataKey="disposable" stroke="hsl(var(--primary))" fill="url(#colorRaad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="sr-only">
            <p>{t("a11y.historyDisposable")}</p>
            <ul>
              {chartData.map((d) => (
                <li key={d.rawDate}>{d.date}: {formatKr(d.disposable, lc)} {t("unit.currency")}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Score chart */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("history.healthOverTime")}</h3>
        <div className="h-36 w-full" role="img" aria-label={t("a11y.historyScore")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v} / 100`, "Score"]}
              />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--nemt-gold))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="sr-only">
            <p>{t("a11y.historyScore")}</p>
            <ul>
              {chartData.map((d) => (
                <li key={d.rawDate}>{d.date}: {d.score} / 100</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        {t("history.calculationsSaved").replace("{count}", String(snapshots.length))} · {t("history.first")}: {new Date(first.date).toLocaleDateString(dateLang)} · {t("history.latest")}: {new Date(last.date).toLocaleDateString(dateLang)}
      </p>
    </div>
  );
}

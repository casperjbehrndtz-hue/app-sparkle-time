import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

function ChartTooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl shadow-black/8 text-xs">
      {children}
    </div>
  );
}

export function InlineChartsSection({ profile: _profile, budget }: Props) {
  const locale = useLocale();
  const lc = locale.currencyLocale;
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5 shadow-sm">
      <DisposableOverTimeInline budget={budget} lc={lc} />
    </div>
  );
}

function DisposableOverTimeInline({ budget, lc }: { budget: ComputedBudget; lc: string }) {
  const { t } = useI18n();
  const monthly = budget.disposableIncome;
  const seasonalFactors = [0.85, 0.95, 1.0, 1.05, 1.0, 0.9, 0.7, 0.95, 1.0, 1.05, 0.95, 0.6];
  const monthNames = t("charts.monthNames").split(",");
  const disposableLabel = t("charts.disposable");

  const data = monthNames.map((m, i) => ({
    name: m,
    value: Math.round(monthly * seasonalFactors[i]),
  }));
  const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / 12);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display font-bold text-sm sm:text-base text-foreground">{t("charts.seasonalTitle")}</h3>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{t("charts.seasonalSubtitle")}</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: t("charts.average"), value: avg },
          { label: t("charts.lowest"), value: Math.min(...data.map((d) => d.value)) },
          { label: t("charts.highest"), value: Math.max(...data.map((d) => d.value)) },
        ].map((s) => (
          <div key={s.label} className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className="font-display font-bold text-xs sm:text-sm text-foreground">{formatKr(s.value, lc)} kr.</p>
          </div>
        ))}
      </div>
      <div className="h-[260px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="inlineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
            <ReferenceLine y={avg} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1">{d.name} <span className="font-normal text-muted-foreground">(estimat)</span></p>
                    <p className="font-display font-bold text-base text-primary">~{formatKr(d.value, lc)} kr.</p>
                  </ChartTooltipBox>
                );
              }}
            />
            <Area type="monotone" dataKey="value" name={disposableLabel} stroke="#2563eb" strokeWidth={2.5} fill="url(#inlineAreaGrad)" dot={{ r: 3, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center italic">{t("charts.seasonalDisclaimer")}</p>
    </div>
  );
}

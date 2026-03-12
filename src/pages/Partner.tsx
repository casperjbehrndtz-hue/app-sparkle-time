import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, MessageSquare, TrendingUp, Activity, FileText, ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

type EventRow = { event_type: string; created_at: string; session_id: string };

type Stats = {
  totalSessions: number;
  onboardingCompletes: number;
  aiInteractions: number;
  reportsGenerated: number;
  dailyActive: { date: string; count: number }[];
  topEvents: { event: string; count: number }[];
  conversionRate: number;
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3 text-muted-foreground">{icon}<span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
      <p className="text-3xl font-black text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Partner() {
  usePageMeta("Partner Dashboard — Kassen", "");
  const [params] = useSearchParams();
  const token = params.get("token");
  const [brandKey, setBrandKey] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setError("Ingen token"); setLoading(false); return; }

    // Verify token via service (we use RPC or direct query with service role via edge function)
    // For simplicity: query partners table directly — partners.token is not exposed via anon RLS
    // so we use a workaround: store token in sessionStorage after first verify
    verifyAndLoad(token);
  }, [token]);

  async function verifyAndLoad(t: string) {
    setLoading(true);

    // Check token against partners table via Supabase (using service role key via edge fn)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    });

    if (!res.ok) { setError("Ugyldigt token"); setLoading(false); return; }

    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }

    setBrandKey(data.brand_key);
    setPartnerName(data.name);
    setStats(computeStats(data.events));
    setLoading(false);
  }

  function computeStats(events: EventRow[]): Stats {
    const sessions = new Set(events.map(e => e.session_id)).size;
    const starts = events.filter(e => e.event_type === "onboarding_start").length;
    const completes = events.filter(e => e.event_type === "onboarding_complete").length;
    const aiMsgs = events.filter(e => e.event_type === "ai_message_sent").length;
    const reports = events.filter(e => e.event_type === "report_generated").length;

    // Daily active last 30 days
    const daily: Record<string, Set<string>> = {};
    events.forEach(e => {
      const d = e.created_at.slice(0, 10);
      if (!daily[d]) daily[d] = new Set();
      daily[d].add(e.session_id);
    });
    const dailyActive = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, s]) => ({ date, count: s.size }));

    // Event breakdown
    const eventCounts: Record<string, number> = {};
    events.forEach(e => { eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1; });
    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([event, count]) => ({ event, count }));

    return {
      totalSessions: sessions,
      onboardingCompletes: completes,
      aiInteractions: aiMsgs,
      reportsGenerated: reports,
      dailyActive,
      topEvents,
      conversionRate: starts > 0 ? Math.round((completes / starts) * 100) : 0,
    };
  }

  const embedCode = brandKey ? `<iframe
  src="https://app-sparkle-time.vercel.app/?brand=${brandKey}&embed=true"
  width="100%"
  height="720"
  frameborder="0"
  style="border-radius:16px;border:1px solid #e5e5e5;"
  title="Finansiel overblik"
></iframe>` : "";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        <p className="text-xs text-muted-foreground/50 mt-2">Kontakt hej@kassen.dk</p>
      </div>
    </div>
  );

  const maxDaily = Math.max(...(stats?.dailyActive.map(d => d.count) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="font-display font-black text-lg text-primary">Kassen</span>
            <span className="text-muted-foreground text-sm ml-2">/ {partnerName}</span>
          </div>
          <span className="text-xs text-muted-foreground">Partner Dashboard</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-4 h-4" />} label="Unikke sessioner" value={stats?.totalSessions ?? 0} sub="Unikke brugere der har åbnet værktøjet" />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Budgetter oprettet" value={stats?.onboardingCompletes ?? 0} sub={`${stats?.conversionRate ?? 0}% konvertering`} />
          <StatCard icon={<MessageSquare className="w-4 h-4" />} label="AI-spørgsmål" value={stats?.aiInteractions ?? 0} sub="Spørgsmål til AI-rådgiveren" />
          <StatCard icon={<FileText className="w-4 h-4" />} label="Rapporter" value={stats?.reportsGenerated ?? 0} sub="Downloadede økonomirapporter" />
        </div>

        {/* Daily activity chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Daglig aktivitet — seneste 30 dage</h2>
          </div>
          {stats && stats.dailyActive.length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {stats.dailyActive.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-sm transition-colors relative"
                    style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-foreground bg-background border border-border rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {d.count} · {d.date.slice(5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen aktivitet endnu</p>
          )}
        </div>

        {/* Event breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-sm mb-4">Hvad bruger dine medlemmer?</h2>
          <div className="space-y-2">
            {stats?.topEvents.map(({ event, count }) => {
              const labels: Record<string, string> = {
                onboarding_start: "Startede onboarding",
                onboarding_complete: "Gennemførte budgetberegning",
                dashboard_view: "Åbnede dashboard",
                ai_chat_open: "Åbnede AI-rådgiveren",
                ai_message_sent: "Stillede spørgsmål til AI",
                report_generated: "Genererede økonomirapport",
              };
              const pct = stats.totalSessions > 0 ? Math.round((count / stats.totalSessions) * 100) : 0;
              return (
                <div key={event} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-48 flex-shrink-0">{labels[event] ?? event}</span>
                  <div className="flex-1 bg-muted/50 rounded-full h-2">
                    <div className="bg-primary/60 h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{count}</span>
                </div>
              );
            })}
            {!stats?.topEvents.length && <p className="text-sm text-muted-foreground">Ingen events endnu</p>}
          </div>
        </div>

        {/* Embed code */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Integration — embed kode</h2>
            <span className="text-xs text-muted-foreground">Virker i enhver webportal på 5 minutter</span>
          </div>
          <pre className="bg-muted/50 rounded-xl p-4 text-xs overflow-x-auto text-muted-foreground leading-relaxed">{embedCode}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(embedCode)}
            className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ArrowUpRight className="w-3 h-3" /> Kopiér kode
          </button>
        </div>

      </main>
    </div>
  );
}

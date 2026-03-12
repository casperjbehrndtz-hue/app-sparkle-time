import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { token } = await req.json();
  if (!token) return new Response(JSON.stringify({ error: "No token" }), { status: 400, headers: cors });

  // Verify token
  const { data: partner, error } = await supabase
    .from("partners")
    .select("id, name, brand_key")
    .eq("token", token)
    .single();

  if (error || !partner) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Fetch last 90 days of events
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("partner_events")
    .select("event_type, created_at, session_id")
    .eq("brand_key", partner.brand_key)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const rows = events ?? [];

  // ─── Aggregate server-side — never expose raw session IDs ────────────────
  const uniqueSessions = new Set(rows.map((e) => e.session_id)).size;

  const eventCounts: Record<string, number> = {};
  for (const e of rows) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  }

  // Daily activity for last 30 days
  const dailyCounts: Record<string, number> = {};
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const e of rows) {
    const ts = new Date(e.created_at).getTime();
    if (ts < thirtyDaysAgo) continue;
    const day = e.created_at.slice(0, 10); // YYYY-MM-DD
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }

  return new Response(
    JSON.stringify({
      name: partner.name,
      brand_key: partner.brand_key,
      unique_sessions: uniqueSessions,
      total_events: rows.length,
      event_counts: eventCounts,
      daily_counts: dailyCounts,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});

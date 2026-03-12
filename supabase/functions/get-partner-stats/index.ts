import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { token } = await req.json();
  if (!token) return new Response(JSON.stringify({ error: "No token" }), { status: 400, headers: corsHeaders });

  // Verify token
  const { data: partner, error } = await supabase
    .from("partners")
    .select("id, name, brand_key")
    .eq("token", token)
    .single();

  if (error || !partner) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  return new Response(
    JSON.stringify({ name: partner.name, brand_key: partner.brand_key, events: events ?? [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

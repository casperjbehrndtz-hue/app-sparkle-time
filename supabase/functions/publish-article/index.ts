import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map(e => e.trim().toLowerCase());

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ─── Verify caller is logged-in admin ────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { draft_id, action } = await req.json() as { draft_id: string; action: "approve" | "reject" };

  if (action === "reject") {
    await supabaseAdmin
      .from("article_drafts")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", draft_id);

    return new Response(JSON.stringify({ success: true, action: "rejected" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Approve: move draft to published articles ────────────────────────────
  const { data: draft, error: fetchErr } = await supabaseAdmin
    .from("article_drafts")
    .select("*")
    .eq("id", draft_id)
    .single();

  if (fetchErr || !draft) {
    return new Response(JSON.stringify({ error: "Draft not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: insertErr } = await supabaseAdmin
    .from("articles")
    .insert({
      slug: draft.slug,
      title: draft.title,
      excerpt: draft.excerpt,
      category: draft.category,
      read_time: draft.read_time,
      content: draft.content,
      status: "published",
      published_at: new Date().toISOString(),
    });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabaseAdmin
    .from("article_drafts")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", draft_id);

  return new Response(JSON.stringify({ success: true, action: "approved", slug: draft.slug }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

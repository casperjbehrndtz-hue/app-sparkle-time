import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map(e => e.trim().toLowerCase());

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

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
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { draft_id, action } = await req.json() as { draft_id: string; action: "approve" | "reject" };

  if (action === "reject") {
    await supabaseAdmin
      .from("article_drafts")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", draft_id);

    return new Response(JSON.stringify({ success: true, action: "rejected" }), {
      headers: { ...cors, "Content-Type": "application/json" },
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
      headers: { ...cors, "Content-Type": "application/json" },
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
      locale: draft.locale ?? "da",
      status: "published",
      published_at: new Date().toISOString(),
    });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  await supabaseAdmin
    .from("article_drafts")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", draft_id);

  // Trigger Vercel redeploy so the new article gets pre-rendered and added to sitemap
  const deployHook = Deno.env.get("VERCEL_DEPLOY_HOOK");
  if (deployHook) {
    fetch(deployHook, { method: "POST" }).catch(() => {});
  }

  // Ping IndexNow for fast indexing
  const articleUrl = `https://nemtbudget.nu/guides/${draft.slug}`;
  try {
    await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(articleUrl)}&key=${Deno.env.get("INDEXNOW_KEY") || ""}`);
  } catch { /* non-critical */ }

  return new Response(JSON.stringify({ success: true, action: "approved", slug: draft.slug }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

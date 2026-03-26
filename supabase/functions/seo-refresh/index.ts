import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SITE_URL = "https://nemtbudget.nu";
const INDEXNOW_KEY = "a563611ec50b9a5e31fdadcde3e13e1c";
const MAX_ARTICLES_PER_RUN = 3;
const DELAY_BETWEEN_AI_CALLS_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pingIndexNow(url: string): Promise<void> {
  try {
    await fetch(
      `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`
    );
  } catch { /* non-critical */ }
}

function extractJSON(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock?.[1]) {
    try { return JSON.parse(codeBlock[1]); } catch { /* fall through */ }
  }
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returnerede ikke gyldigt JSON");
  return JSON.parse(jsonMatch[0]);
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  maxTokens: number = 1000
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt + "\n\nReturner KUN valid JSON." }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";
  return extractJSON(raw);
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Auth: CRON_SECRET via Bearer token
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "auto_refresh";

    // ── STATUS ──
    if (action === "status") {
      const { data: rows, error } = await supabase
        .from("seo_performance")
        .select("refresh_reason")
        .eq("needs_refresh", true);

      if (error) throw error;

      const breakdown: Record<string, number> = {};
      for (const row of rows || []) {
        const reason = row.refresh_reason || "unknown";
        breakdown[reason] = (breakdown[reason] || 0) + 1;
      }

      return new Response(
        JSON.stringify({
          total_needing_refresh: (rows || []).length,
          by_reason: breakdown,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ── AUTO REFRESH ──
    if (action === "auto_refresh") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: candidates, error: fetchErr } = await supabase
        .from("seo_performance")
        .select("*")
        .eq("needs_refresh", true)
        .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${sevenDaysAgo}`)
        .limit(MAX_ARTICLES_PER_RUN);

      if (fetchErr) throw fetchErr;

      if (!candidates || candidates.length === 0) {
        return new Response(
          JSON.stringify({ ok: true, message: "No articles need refresh", refreshed: [] }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const results: { slug: string; reason: string; action_taken: string }[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const perf = candidates[i];
        const slug = perf.slug;
        const reason = perf.refresh_reason || "unknown";

        if (i > 0) await sleep(DELAY_BETWEEN_AI_CALLS_MS);

        try {
          // ── low_ctr_high_position ──
          if (reason === "low_ctr_high_position") {
            const { data: post } = await supabase
              .from("articles")
              .select("id, title, excerpt")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: article not found" }); continue; }

            const queries = (perf.top_queries || []).map((q: { query?: string }) => q.query || q).join(", ");
            const prompt = `Du er en CTR-optimeringsekspert. En artikel ranker på Google position ${perf.avg_position || "?"} for disse queries: ${queries}.
Nuværende titel: "${post.title}"
Nuværende excerpt/beskrivelse: "${post.excerpt || ""}"

Generer 5 alternative titler og 3 alternative meta-beskrivelser der øger klikraten.

Regler:
- Titler: max 60 tegn, inkluder primært keyword, brug power words (Gratis, Guide, 2026, Komplet, Undgå)
- Meta-beskrivelser: max 155 tegn, inkluder CTA og tal, skab nysgerrighed
- Dansk sprog, naturlig tone
- ALDRIG clickbait eller misinformation

Returner JSON: {"titles": ["...", ...], "descriptions": ["...", ...]}`;

            const parsed = await callAnthropic(anthropicKey, prompt, 1000) as { titles?: string[]; descriptions?: string[] };

            const newTitle = parsed.titles?.[0]?.slice(0, 60);
            const newDesc = parsed.descriptions?.[0]?.slice(0, 155);

            if (newTitle || newDesc) {
              await supabase
                .from("articles")
                .update({
                  ...(newTitle ? { title: newTitle } : {}),
                  ...(newDesc ? { excerpt: newDesc } : {}),
                })
                .eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: `meta_updated: title="${newTitle}", desc="${newDesc}"` });
          }

          // ── declining_position ──
          else if (reason === "declining_position") {
            const { data: post } = await supabase
              .from("articles")
              .select("id, content, keywords")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: article not found" }); continue; }

            const queries = (perf.top_queries || []).map((q: { query?: string }) => q.query || q).join(", ");

            const { data: related } = await supabase
              .from("articles")
              .select("slug, title")
              .eq("status", "published")
              .neq("slug", slug)
              .limit(5);
            const relatedLinks = (related || []).map((r: { slug: string; title: string }) => `<a href="/guides/${r.slug}">${r.title}</a>`).join(", ");

            const prompt = `Du er SEO-indholdsekspert. En artikel om "${post.keywords?.join(", ") || slug}" er begyndt at falde i ranking.
Top queries der driver trafik: ${queries}

Nuværende indhold mangler dækning af disse emner. Skriv en ny sektion (300 ord, H2 + paragraphs) der:
- Besvarer de mest relevante queries direkte
- Inkluderer konkrete tal og eksempler
- Bruger H2/H3 overskrifter der matcher søgeintention
- Linker til relaterede artikler: ${relatedLinks}

Returner JSON: {"section_html": "<h2>...</h2><p>...</p>"}`;

            const parsed = await callAnthropic(anthropicKey, prompt, 1500) as { section_html?: string };

            if (parsed.section_html) {
              let html = post.content || "";
              const faqIdx = html.indexOf("<h2>Ofte stillede spørgsmål");
              if (faqIdx !== -1) {
                html = html.slice(0, faqIdx) + parsed.section_html + "\n" + html.slice(faqIdx);
              } else {
                html += "\n" + parsed.section_html;
              }
              await supabase.from("articles").update({ content: html }).eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: "content_expanded" });
          }

          // ── stale_content ──
          else if (reason === "stale_content") {
            const { data: post } = await supabase
              .from("articles")
              .select("id, content")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: article not found" }); continue; }

            const prompt = `Du er en SEO-indholdsekspert. Opdater følgende danske artikel:
1. Erstat alle årstal-referencer fra 2025 til 2026 hvor det giver mening
2. Opdater eventuelle beløb/satser til 2026-niveau
3. Tilføj en "<p><strong>Opdateret marts 2026:</strong> Denne artikel er gennemgået og opdateret med de seneste tal og regler.</p>" som det allerførste i indholdet

Nuværende HTML:
${(post.content || "").slice(0, 6000)}

Returner JSON: {"content_html": "<p><strong>Opdateret marts 2026...</strong></p>...resten af den opdaterede HTML"}`;

            const parsed = await callAnthropic(anthropicKey, prompt, 4000) as { content_html?: string };

            if (parsed.content_html) {
              await supabase.from("articles").update({ content: parsed.content_html }).eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: "content_refreshed" });
          }

          // ── zero_impressions ──
          else if (reason === "zero_impressions") {
            const articleUrl = `${SITE_URL}/guides/${slug}`;
            await pingIndexNow(articleUrl);

            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
            if (perf.created_at && perf.created_at < sixtyDaysAgo) {
              // Log for re-evaluation via article_drafts
              await supabase
                .from("article_drafts")
                .update({ status: "needs_review" })
                .eq("slug", slug);

              results.push({ slug, reason, action_taken: "indexnow_pinged, draft_flagged_for_review" });
            } else {
              results.push({ slug, reason, action_taken: "indexnow_pinged" });
            }
          }

          else {
            results.push({ slug, reason, action_taken: "unknown_reason_skipped" });
            continue;
          }

          // After each refresh: update seo_performance and ping IndexNow
          await supabase
            .from("seo_performance")
            .update({
              last_refreshed_at: new Date().toISOString(),
              needs_refresh: false,
            })
            .eq("slug", slug);

          if (reason !== "zero_impressions") {
            await pingIndexNow(`${SITE_URL}/guides/${slug}`);
          }

        } catch (err) {
          console.error(`Error refreshing ${slug}:`, err);
          results.push({ slug, reason, action_taken: `error: ${err instanceof Error ? err.message : "unknown"}` });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, refreshed: results }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("seo-refresh error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ukendt fejl" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});

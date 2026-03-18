import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const MAX_PAYLOAD_LENGTH = 6000; // compressed budget string

// 8-char nanoid (URL-safe, no look-alikes)
function nanoid(): string {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/1/i/l/o
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── POST: create short link ──
  if (req.method === "POST") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = await checkRateLimit("share-budget", ip, 30);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    try {
      const { payload } = await req.json();
      if (typeof payload !== "string" || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const id = nanoid();
      const { error } = await supabase.from("shared_budgets").insert({ id, payload });

      if (error) {
        // Collision (extremely unlikely) — retry once
        const id2 = nanoid();
        const { error: error2 } = await supabase.from("shared_budgets").insert({ id: id2, payload });
        if (error2) {
          return new Response(JSON.stringify({ error: "Failed to save" }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: id2 }), {
          status: 201,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  // ── GET: resolve short link ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || !/^[a-z0-9]{6,12}$/.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid ID" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("shared_budgets")
      .select("payload")
      .eq("id", id)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Increment view count (fire-and-forget)
    supabase.rpc("increment_shared_views", { share_id: id }).catch(() => {});

    return new Response(JSON.stringify({ payload: data.payload }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: cors });
});

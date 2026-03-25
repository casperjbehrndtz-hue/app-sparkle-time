import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Verify HMAC-signed token and return the email, or null if invalid.
// Token format: <base64url(email)>.<hex(HMAC-SHA256(email, secret))>
async function verifyUnsubToken(token: string, secret: string): Promise<string | null> {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const emailB64 = token.slice(0, dotIdx);
  const sigHex = token.slice(dotIdx + 1);

  let email: string;
  try {
    email = atob(emailB64.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }

  if (!email.includes("@")) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = new Uint8Array(
      sigHex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [],
    );
    if (sigBytes.length !== 32) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(email),
    );
    return valid ? email : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const unsubSecret = Deno.env.get("UNSUB_HMAC_SECRET");
  if (!unsubSecret) {
    return new Response("Service ikke konfigureret", { status: 500, headers: cors });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return new Response("Ugyldigt link", { status: 400, headers: cors });
  }

  const email = await verifyUnsubToken(token, unsubSecret);
  if (!email) {
    return new Response("Ugyldigt eller udløbet link", { status: 400, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const emailLower = email.toLowerCase();

  // Opt out from monthly reminders (auth users)
  await supabase
    .from("email_opt_outs")
    .upsert({ email: emailLower }, { onConflict: "email" });

  // Also unsubscribe from financial calendar (anonymous subscribers)
  await supabase
    .from("reminder_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", emailLower);

  const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://app-sparkle-time.vercel.app";

  const html = `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Afmeldt</title></head>
<body style="margin:0;padding:40px 20px;background:#f9f9f7;font-family:-apple-system,sans-serif;text-align:center;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e5e5;">
    <div style="font-size:40px;margin-bottom:16px;">✓</div>
    <h1 style="font-size:20px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">Du er afmeldt</h1>
    <p style="color:#666;font-size:15px;margin:0 0 24px;">Du modtager ikke flere månedlige påmindelser fra NemtBudget.</p>
    <a href="${baseUrl}/" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Tilbage til NemtBudget</a>
  </div>
</body></html>`;

  return new Response(html, { headers: { ...cors, "Content-Type": "text/html" } });
});

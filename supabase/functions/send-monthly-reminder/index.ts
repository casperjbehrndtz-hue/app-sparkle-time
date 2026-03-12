import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: only cron can trigger this
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "No Resend key configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all users who haven't been emailed this month
  const month = new Date().toISOString().slice(0, 7); // "2026-03"
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });

  // Check which users have a saved budget (cloud_profiles table)
  const { data: profiles } = await supabase
    .from("cloud_profiles")
    .select("user_id, profile_data")
    .not("profile_data", "is", null);

  const profileMap = new Map((profiles ?? []).map((p: { user_id: string; profile_data: unknown }) => [p.user_id, p.profile_data]));

  let sent = 0;
  const monthName = new Date().toLocaleDateString("da-DK", { month: "long" });

  for (const user of users.users) {
    if (!user.email) continue;
    const profile = profileMap.get(user.id) as Record<string, unknown> | undefined;

    const income = profile ? (profile.income as number ?? 0) : 0;
    const greeting = income > 0
      ? `Du har ${(income).toLocaleString("da-DK")} kr./md. at arbejde med.`
      : "Dit budget venter på dig.";

    const html = `
<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="background:#1a1a2e;padding:28px 32px;">
      <span style="color:#f0a500;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Kassen</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">Din økonomi i ${monthName}</h1>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px;">${greeting} Har du tjekket om tallene stadig passer?</p>

      <div style="background:#f5f5f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Denne måneds tip</p>
        <p style="margin:0;font-size:15px;color:#1a1a2e;line-height:1.6;">Har du set vores nye guides? Vi har skrevet om hvad der faktisk virker når man vil spare penge — baseret på aktuelle danske tal.</p>
      </div>

      <a href="https://app-sparkle-time.vercel.app/" style="display:block;background:#1a1a2e;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:16px;">
        Åbn mit budget →
      </a>
      <a href="https://app-sparkle-time.vercel.app/guides" style="display:block;background:#f5f5f0;color:#1a1a2e;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:14px;">
        Læs nye guides
      </a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Du modtager denne mail fordi du har en konto på Kassen.<br>
      <a href="https://app-sparkle-time.vercel.app/login" style="color:#aaa;">Afmeld her</a></p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kassen <hej@kassen.dk>",
        to: user.email,
        subject: `Din økonomi i ${monthName} — et hurtigt tjek`,
        html,
      }),
    });

    if (emailRes.ok) sent++;
  }

  console.log(`Monthly reminder: sent ${sent} emails for ${month}`);
  return new Response(JSON.stringify({ sent, month }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

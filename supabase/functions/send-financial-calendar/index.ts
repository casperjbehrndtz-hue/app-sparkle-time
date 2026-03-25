import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ─── HMAC-signed unsubscribe token ───────────────────────────────────────────
async function makeUnsubToken(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const emailB64 = btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${emailB64}.${sigHex}`;
}

// ─── Seasonal content per month ──────────────────────────────────────────────
interface MonthContent {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  tip: string;
}

function getMonthContent(month: number, baseUrl: string, locale: string): MonthContent | null {
  const da = locale === "da" || locale === "no";

  // Only send in months with relevant financial events
  const content: Record<number, MonthContent> = {
    1: {
      subject: da ? "Tjek din forskudsopgørelse for det nye år" : "Check your preliminary tax assessment",
      heading: da ? "Nyt år — ny forskudsopgørelse" : "New year — new tax assessment",
      body: da
        ? "Januar er det perfekte tidspunkt at tjekke om din forskudsopgørelse stadig passer. Upload din seneste lønseddel og se om du betaler for meget eller for lidt i skat."
        : "January is the perfect time to check if your preliminary tax assessment still fits. Upload your latest payslip and see if you're paying too much or too little tax.",
      ctaLabel: da ? "Tjek min skat →" : "Check my tax →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "Vidste du? Du kan justere din forskudsopgørelse på skat.dk/tastselv — og få pengene nu i stedet for at vente til marts næste år."
        : "Did you know? You can adjust your tax assessment at skat.dk — and get the money now instead of waiting until March next year.",
    },
    3: {
      subject: da ? "Tid til lønseddel-tjek — har din løn ændret sig?" : "Time for a payslip check — has your salary changed?",
      heading: da ? "Forårs løn-tjek" : "Spring salary check",
      body: da
        ? "Mange får lønregulering i marts. Upload din nye lønseddel og sammenlign med din historik — se om din løn faktisk steg."
        : "Many get salary adjustments in March. Upload your new payslip and compare with your history — see if your salary actually went up.",
      ctaLabel: da ? "Upload lønseddel →" : "Upload payslip →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "Med NemtBudgets lønhistorik kan du se præcis hvor meget din løn er steget — og om din pension fulgte med."
        : "With NemtBudget's salary history you can see exactly how much your salary increased — and if your pension kept up.",
    },
    5: {
      subject: da ? "Feriepenge-sæsonen starter snart" : "Holiday pay season is starting soon",
      heading: da ? "Dine feriepenge i år" : "Your holiday pay this year",
      body: da
        ? "Maj er sidste chance for at planlægge din ferie-økonomi. Tjek hvad du har optjent i feriepenge — og om du har ubrugte dage."
        : "May is the last chance to plan your holiday finances. Check what you've earned in holiday pay — and if you have unused days.",
      ctaLabel: da ? "Se mine feriepenge →" : "See my holiday pay →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "I den nye ferielov optjener du ferie løbende. Du har 2,08 feriedage pr. måned — det er 25 dage om året."
        : "Under the new holiday act, you earn holidays continuously. You have 2.08 holiday days per month — that's 25 days a year.",
    },
    6: {
      subject: da ? "EU Pay Transparency — kend din markedsværdi" : "EU Pay Transparency — know your market value",
      heading: da ? "Hvad er din løn egentlig værd?" : "What is your salary really worth?",
      body: da
        ? "EU's Pay Transparency Directive træder snart i kraft i Danmark. Brug NemtBudgets løn-benchmark til at se hvor du ligger i forhold til andre i din branche."
        : "The EU Pay Transparency Directive is coming into effect in Denmark soon. Use NemtBudget's salary benchmark to see where you stand compared to others in your industry.",
      ctaLabel: da ? "Sammenlign min løn →" : "Compare my salary →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "Overvejer du jobskifte? Prøv vores jobskifte-sammenligner — den beregner den reelle forskel i netto, pension og total kompensation."
        : "Considering a job change? Try our job comparison tool — it calculates the real difference in net pay, pension, and total compensation.",
    },
    8: {
      subject: da ? "Børneopsparing — har du indsat i år?" : "Children's savings — have you deposited this year?",
      heading: da ? "Børneopsparing-tjek" : "Children's savings check",
      body: da
        ? "Har du husket at indsætte på børneopsparingen i år? Brug Børneskat.dk til at finde de bedste skattefrie fonde og optimere din opsparing."
        : "Have you remembered to deposit into children's savings this year? Use Børneskat.dk to find the best tax-free funds and optimize your savings.",
      ctaLabel: da ? "Åbn Børneskat.dk →" : "Open Børneskat.dk →",
      ctaUrl: "https://xn--brneskat-54a.dk",
      tip: da
        ? "Du kan indsætte op til 6.000 kr/år skattefrit på en børneopsparing. Tjek om dine fonde stadig er på SKATs positivliste."
        : "You can deposit up to 6,000 DKK/year tax-free into a children's savings account. Check if your funds are still on SKAT's positive list.",
    },
    9: {
      subject: da ? "Feriedage udløber 31. december — brug dem!" : "Holiday days expire Dec 31 — use them!",
      heading: da ? "Feriedage-advarsel" : "Holiday days warning",
      body: da
        ? "Ubrugte feriedage fra forrige ferieår udløber 31. december. Tjek din feriekonto og planlæg dine sidste fridage."
        : "Unused holiday days from the previous holiday year expire December 31. Check your holiday account and plan your remaining days off.",
      ctaLabel: da ? "Se mine feriedage →" : "See my holiday days →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "Tip: Du kan overføre op til 5 feriedage til næste år, hvis din arbejdsgiver accepterer det."
        : "Tip: You can carry over up to 5 holiday days to next year, if your employer agrees.",
    },
    11: {
      subject: da ? "Restskat-tjek — undgå overraskelser" : "Tax check — avoid surprises",
      heading: da ? "Sidste chance for at justere skatten" : "Last chance to adjust your tax",
      body: da
        ? "November er sidste chance for at justere din forskudsopgørelse inden årets udgang. Upload din lønseddel og se om du risikerer restskat."
        : "November is the last chance to adjust your preliminary tax assessment before year end. Upload your payslip and see if you risk owing tax.",
      ctaLabel: da ? "Tjek restskat-risiko →" : "Check tax risk →",
      ctaUrl: `${baseUrl}/lonseddel`,
      tip: da
        ? "Skylder du mere end 40.000 kr i restskat? Så kan du undgå renter ved at justere nu på skat.dk/tastselv."
        : "Do you owe more than 40,000 DKK in residual tax? You can avoid interest by adjusting now at skat.dk.",
    },
  };

  return content[month] ?? null;
}

// ─── Email HTML template ─────────────────────────────────────────────────────
function buildHtml(content: MonthContent, unsubUrl: string, locale: string): string {
  const da = locale === "da" || locale === "no";
  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="background:#1a1a2e;padding:28px 32px;">
      <span style="color:#f0a500;font-size:20px;font-weight:900;letter-spacing:-0.5px;">NemtBudget</span>
      <span style="color:rgba(255,255,255,0.4);font-size:12px;margin-left:8px;">${da ? "Finanskalender" : "Financial Calendar"}</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">${content.heading}</h1>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px;">${content.body}</p>

      <div style="background:#f5f5f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">💡 Tip</p>
        <p style="margin:0;font-size:14px;color:#1a1a2e;line-height:1.6;">${content.tip}</p>
      </div>

      <a href="${content.ctaUrl}" style="display:block;background:#1a1a2e;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;">
        ${content.ctaLabel}
      </a>
    </div>

    <div style="padding:16px 32px;border-top:1px solid #eee;">
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:12px;">
        <a href="https://nemtbudget.nu" style="color:#999;font-size:11px;text-decoration:none;">NemtBudget</a>
        <span style="color:#ddd;">·</span>
        <a href="https://parfinans.dk" style="color:#999;font-size:11px;text-decoration:none;">ParFinans</a>
        <span style="color:#ddd;">·</span>
        <a href="https://xn--brneskat-54a.dk" style="color:#999;font-size:11px;text-decoration:none;">Børneskat</a>
      </div>
      <p style="color:#aaa;font-size:11px;margin:0;text-align:center;">
        ${da ? "Du modtager denne mail fordi du tilmeldte dig påmindelser fra NemtBudget." : "You receive this email because you signed up for reminders from NemtBudget."}<br>
        <a href="${unsubUrl}" style="color:#aaa;">${da ? "Afmeld påmindelser" : "Unsubscribe"}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Auth: only cron can trigger
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const unsubSecret = Deno.env.get("UNSUB_HMAC_SECRET");
  if (!resendKey || !unsubSecret) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://nemtbudget.nu";
  const unsubBaseUrl = Deno.env.get("SUPABASE_URL");
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Check if there's content for this month
  const testContent = getMonthContent(currentMonth, baseUrl, "da");
  if (!testContent) {
    console.log(`Financial calendar: no content for month ${currentMonth}, skipping`);
    return new Response(JSON.stringify({ sent: 0, month: currentMonth, reason: "no_content" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch active subscribers + global opt-outs
  const [{ data: subscribers, error }, { data: optOuts }] = await Promise.all([
    supabase
      .from("reminder_subscribers")
      .select("email, locale")
      .is("unsubscribed_at", null),
    supabase
      .from("email_opt_outs")
      .select("email"),
  ]);

  if (error || !subscribers?.length) {
    console.log("Financial calendar: no subscribers or error", error);
    return new Response(JSON.stringify({ sent: 0, month: currentMonth }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Also respect global opt-outs from monthly reminder unsubscribe
  const optOutSet = new Set((optOuts ?? []).map((o: { email: string }) => o.email.toLowerCase()));

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    if (optOutSet.has(sub.email.toLowerCase())) continue;

    const content = getMonthContent(currentMonth, baseUrl, sub.locale ?? "da");
    if (!content) continue;

    const token = await makeUnsubToken(sub.email, unsubSecret);
    const unsubUrl = `${unsubBaseUrl}/functions/v1/unsubscribe?t=${encodeURIComponent(token)}`;
    const html = buildHtml(content, unsubUrl, sub.locale ?? "da");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NemtBudget <hej@nemtbudget.nu>",
          to: sub.email,
          subject: content.subject,
          html,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
        console.error(`Failed to send to ${sub.email}:`, await res.text());
      }
    } catch (err) {
      failed++;
      console.error(`Error sending to ${sub.email}:`, err);
    }
  }

  console.log(`Financial calendar month ${currentMonth}: sent=${sent}, failed=${failed}, total=${subscribers.length}`);
  return new Response(JSON.stringify({ sent, failed, month: currentMonth, total: subscribers.length }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

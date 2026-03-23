import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB (multi-page PDFs can be larger)

const SYSTEM_PROMPT = `Du er en dansk kontoudtogs-parser. Du modtager et billede eller PDF af et dansk kontoudtog, bankudskrift, eller screenshot fra en mobilbank-app.

Udtræk ALLE transaktioner du kan se. For HVER transaktion:
- "dato": Dato i format "YYYY-MM-DD". Brug den faktiske transaktionsdato (ikke valørdato).
- "tekst": Den fulde transaktionstekst præcis som den står (betalingsmodtager, reference, etc.)
- "beløb": Beløbet i kroner som et tal. VIGTIGT: Udgifter er NEGATIVE (fx -149.00 for Netflix). Indkomst er POSITIVE (fx 25000 for løn).
- "kategori": Én af disse kategorier:
  "Mad" — dagligvarer (Netto, Føtex, Bilka, COOP, REMA 1000, Lidl, Aldi, Meny, etc.)
  "Restaurant" — restauranter, takeaway, cafeer (McDonald's, Wolt, Just Eat, caféer, etc.)
  "Transport" — benzin, parkering, offentlig transport (Shell, Q8, Circle K, DSB, Rejsekort, etc.)
  "Streaming" — streaming-tjenester (Netflix, Spotify, HBO, Viaplay, Disney+, YouTube Premium, etc.)
  "Fitness" — fitnesscenter (Fitness World, SATS, etc.)
  "Sundhed" — apotek, læge, tandlæge (Matas, apotek, klinik, etc.)
  "Tøj" — tøj og sko (H&M, Zara, Zalando, etc.)
  "Bolig" — husleje, boligforening, byggemarkeder (IKEA, Jysk, etc.)
  "Forsyning" — el, vand, varme, internet, mobil (Ørsted, YouSee, TDC, Telenor, etc.)
  "Forsikring" — forsikring (Tryg, Topdanmark, Alm. Brand, etc.)
  "Fritid" — underholdning, elektronik, hobbyer (Elgiganten, Tivoli, biograf, etc.)
  "Kæledyr" — dyrlæge, dyrefoder
  "Lån" — afdrag på lån, SU-lån
  "Løn" — lønindbetalinger, SU, dagpenge
  "Overførsel" — overførsler mellem egne konti, MobilePay uden tydelig modtager
  "Opsparing" — overførsel til opsparingskonto
  "Fagforening" — fagforening, A-kasse
  "Andet" — alt der ikke passer i ovenstående
- "erAbonnement": true hvis det ligner et fast månedligt abonnement (samme beløb hver måned, typisk streaming, fitness, forsikring, teleselskab)

MobilePay: Hvis MobilePay-transaktionen har et butiksnavn (fx "MobilePay Netto"), kategorisér ud fra butikken. Hvis modtageren er en person, brug "Overførsel".

VIGTIGE REGLER:
1. Medtag ALLE transaktioner du kan se — udelad ingen.
2. Beløb skal ALTID have korrekt fortegn: minus for udgifter, plus for indkomst.
3. Hvis kontoudtoget spænder over flere måneder, medtag kun den SENESTE hele måned.
4. Ignorer rækker der er kontooversigt, headers, footers eller saldolinjer — kun transaktioner.
5. Tal i dansk format (1.234,56) skal konverteres til standard (1234.56) i JSON.

Returner KUN valid JSON — ingen markdown, ingen kodeblok:
{
  "transaktioner": [
    {"dato": "YYYY-MM-DD", "tekst": "<tekst>", "beløb": <number>, "kategori": "<kategori>", "erAbonnement": <boolean>}
  ],
  "periodeStart": "YYYY-MM-DD" eller null,
  "periodeSlut": "YYYY-MM-DD" eller null,
  "startSaldo": <number> eller null,
  "slutSaldo": <number> eller null,
  "kontoNavn": "<string>" eller null,
  "bankNavn": "<string>" eller null,
  "confidence": "high" | "medium" | "low",
  "warnings": ["<eventuelle advarsler>"]
}`;

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Rate limit: 5/hour per IP (multi-page PDFs are expensive)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";

  const allowed = await checkRateLimit("bank-statement-ocr", ip, 5);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Filen er for stor (max 10 MB)" }),
        { status: 413, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { image, mimeType } = body as { image?: string; mimeType?: string };

    if (!image || typeof image !== "string") {
      return new Response(
        JSON.stringify({ error: "Manglende billede" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const mediaType = validTypes.includes(mimeType || "") ? mimeType! : "image/jpeg";

    const isPdf = mediaType === "application/pdf";
    const fileBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: image } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: image } };

    const headers: Record<string, string> = {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    };
    if (isPdf) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              fileBlock,
              { type: "text", text: "Udtræk alle transaktioner fra dette kontoudtog." },
            ],
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "{" }],
          },
        ],
      }),
    });

    if (anthropicRes.status === 529) {
      return new Response(
        JSON.stringify({ error: "AI-tjenesten er midlertidigt overbelastet. Prøv igen om lidt." }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errBody);
      let errDetail = `API ${anthropicRes.status}`;
      try {
        const errJson = JSON.parse(errBody);
        errDetail = errJson?.error?.message || errDetail;
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: "Kunne ikke analysere kontoudtoget", detail: errDetail }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const result = await anthropicRes.json();

    const truncated = result?.stop_reason === "max_tokens";
    if (truncated) {
      console.warn("bank-statement-ocr: response truncated by max_tokens");
    }

    let text = result?.content?.[0]?.text || "";
    text = "{" + text;
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      text = text.slice(jsonStart, jsonEnd + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Repair truncated JSON — same technique as payslip-ocr
      if (truncated && jsonStart !== -1) {
        let repaired = text.slice(jsonStart);
        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) repaired += '"';
        repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"}\]]*$/, "");
        const stack: string[] = [];
        let inString = false;
        for (let i = 0; i < repaired.length; i++) {
          const ch = repaired[i];
          if (ch === '"' && repaired[i - 1] !== '\\') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') stack.push('}');
          else if (ch === '[') stack.push(']');
          else if (ch === '}' || ch === ']') stack.pop();
        }
        repaired = repaired.replace(/,\s*$/, "");
        while (stack.length > 0) repaired += stack.pop();
        try {
          parsed = JSON.parse(repaired);
          console.warn("bank-statement-ocr: repaired truncated JSON successfully");
        } catch {
          console.error("bank-statement-ocr: JSON repair failed. Response length:", text.length);
        }
      }
      if (!parsed) {
        console.error("bank-statement-ocr: JSON parse failed. Response length:", text.length);
        return new Response(
          JSON.stringify({ error: "Kunne ikke læse kontoudtoget — prøv et tydeligere billede" }),
          { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Server-side validation ──
    const p = parsed as Record<string, unknown>;

    // Ensure transaktioner is an array
    if (!Array.isArray(p.transaktioner)) {
      return new Response(
        JSON.stringify({ error: "Ingen transaktioner fundet i kontoudtoget" }),
        { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Add truncated flag
    if (truncated) {
      p.truncated = true;
      if (!Array.isArray(p.warnings)) p.warnings = [];
      (p.warnings as string[]).push("Kontoudtoget var for langt til at læse fuldt ud. Nogle transaktioner kan mangle.");
    }

    // Balance validation
    const startSaldo = typeof p.startSaldo === "number" ? p.startSaldo : null;
    const slutSaldo = typeof p.slutSaldo === "number" ? p.slutSaldo : null;
    if (startSaldo !== null && slutSaldo !== null) {
      const txSum = (p.transaktioner as Array<{ beløb?: number }>).reduce(
        (s, t) => s + (typeof t.beløb === "number" ? t.beløb : 0), 0
      );
      const expected = startSaldo + txSum;
      const diff = Math.abs(expected - slutSaldo);
      if (diff > 100) {
        if (!Array.isArray(p.warnings)) p.warnings = [];
        (p.warnings as string[]).push(
          `Saldo-tjek: Startsaldo + transaktioner = ${Math.round(expected)} kr, slutsaldo = ${Math.round(slutSaldo)} kr (forskel: ${Math.round(diff)} kr).`
        );
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bank-statement-ocr error:", err);
    return new Response(
      JSON.stringify({ error: "Intern fejl ved analyse af kontoudtog" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

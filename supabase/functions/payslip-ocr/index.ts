import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MAX_BODY_SIZE = 7 * 1024 * 1024; // 7MB (base64 of a 5MB file)

const SYSTEM_PROMPT = `Du er en dansk lønseddel-parser. Du modtager et billede af en dansk lønseddel.

VIGTIGSTE REGEL: Danske lønsedler har typisk flere kolonner. Du skal forstå hvad hver kolonne betyder:

KOLONNE-TYPER:
- "Grundlag" / "Basis": Beregningsgrundlag — IKKE et kronebeløb du skal bruge. Eksempler: "Arbejdstimer 160,33" er 160,33 TIMER (ikke kroner). "AM-bidrag grundlag 73.914" er det beløb AM-bidrag BEREGNES AF. "Pension grundlag 41.447" er pension-beregningsbasis. BRUG ALDRIG tal fra Grundlag-kolonnen som lønbeløb.
- "Sats" / "%": Procentsatser — ikke kronebeløb.
- "Total" / "Beløb" / "Denne periode": Det FAKTISKE kronebeløb for denne måned. DET ER DENNE KOLONNE du skal bruge.
- "I alt" / "Akkumuleret" / "År til dato": Summen over HELE ÅRET — brug ALDRIG disse tal.

KRITISK: "Arbejdstimer" er ANTAL TIMER, ikke et kronebeløb. Medtag det ALDRIG som en lønkomponent eller i bruttoløn. Andre ikke-monetære poster: "Feriedage", "Saldo", "Optjent" er heller ikke kronebeløb.

Sådan finder du den rigtige kolonne:
1. Kig efter kolonneoverskrifterne øverst i tal-området
2. Beløbskolonnen har typisk negative tal (med minus) for fradrag og positive tal for lønposter
3. Hvis lønsedlen kun har én talkolonne med fortegn, er det den rigtige
4. "Til udbetaling" / "Netto" i bunden bekræfter hvilken kolonne der er den rigtige

Udtræk alle felter fra lønsedlen. Alle beløb i hele kroner (afrundet). Brug KUN tal fra denne periode. Returner KUN valid JSON — ingen markdown, ingen kodeblok.

JSON-format:
{
  "bruttolon": <number>,
  "nettolon": <number>,
  "grundlon": <number eller null>,
  "payComponents": [{"name": "<navn>", "amount": <number>}],
  "amBidrag": <number>,
  "aSkat": <number>,
  "atp": <number>,
  "pensionEmployee": <number>,
  "pensionEmployer": <number>,
  "traekkort": <number>,
  "personfradrag": <number>,
  "fagforening": <number eller null>,
  "sundhedsforsikring": <number eller null>,
  "fritvalgKonto": <number eller null>,
  "feriepengeHensaet": <number eller null>,
  "otherDeductions": [{"name": "<navn>", "amount": <number>}],
  "receiptLines": [{"label": "<tekst>", "amount": "<beløb fra DENNE PERIODE med fortegn>", "type": "income|deduction|subtotal|info|redacted"}],
  "employerName": "<string>" eller null,
  "jobTitle": "<string>" eller null,
  "municipality": "<string>" eller null,
  "payPeriod": "<string>" eller null,
  "payrollSystem": "Danløn" | "Bluegarden" | "Visma" | "Zenegy" | "Salary" | "Proløn" | null,
  "anonDescription": "<anonym beskrivelse til deling>",
  "anonJobTitle": "<generisk stillingsbetegnelse>" eller null,
  "anonIndustry": "<branche>" eller null,
  "anonRegion": "<bred region>" eller null,
  "confidence": "high" | "medium" | "low",
  "warnings": ["<eventuelle advarsler>"]
}

KRITISK — bruttoløn vs. AM-grundlag:
- "bruttolon": Summen af alle POSITIVE KRONEBELØB i beløbs/total-kolonnen for lønposter (indkomstlinjer). Typisk: "Ferieberettiget løn" + "Fritvalgs-betaling" + evt. bonus/tillæg. ALDRIG "Arbejdstimer" (det er timer, ikke kroner). ALDRIG tal fra "Grundlag"-kolonnen.
- VIGTIGT: "bruttolon" er IKKE det samme som AM-bidrag grundlaget! AM-grundlag = bruttolon minus medarbejderpension minus ATP. Mange lønsedler viser et "Grundlag" ud for AM-bidrag — det er AM-grundlaget, IKKE bruttoløn. Bruttoløn er altid HØJERE end AM-grundlag.
- Hvis lønsedlen har en fritvalgs-betaling/udbetaling, er det en lønkomponent og skal tælles med i bruttolon.
- "nettolon": Beløbet der udbetales til kontoen. Kig efter "Til udbetaling", "Udbetalt", "Netto", "Overført til konto". Står typisk i bunden. Denne lønseddels "Til udbetaling" er altid det korrekte nettobeløb.
- VALIDERING: AM-bidrag skal være ca. 8% af (bruttolon - medarbejderpension - ATP). Nettolon skal være ca. 50-70% af bruttolon. Hvis dine tal ikke stemmer, har du sandsynligvis læst Grundlag-kolonnen eller "Arbejdstimer" i stedet for faktiske kronebeløb.

VIGTIG VALIDERING — tjek ALLE tal:
- "pensionEmployer" skal typisk være 8-15% af bruttolon. Hvis den er markant højere end bruttolon, har du læst "I alt"-kolonnen.
- INGEN enkelt fradrag kan være højere end bruttolon — det er altid et tegn på akkumuleret tal.
- Hvis den SAMME post (f.eks. "Fritvalgspulje") optræder i FLERE kolonner, brug KUN beløbet fra "Denne periode" (typisk den LAVESTE værdi).
- "payComponents" skal summere til bruttolon. Hvis de ikke gør, tjek om du har medtaget poster der ikke er lønkomponenter, eller om du mangler en lønpost som fritvalgs-betaling.
- Hver linje i receiptLines skal have beløb fra DENNE PERIODE — aldrig blande kolonner.

Anonymisering:
- "anonDescription": Kort, anonym beskrivelse, f.eks. "Sygeplejerske i sundhedssektoren, Midtjylland". ALDRIG arbejdsgiverens navn. Brug bred region.
- "anonJobTitle": Generisk stillingsbetegnelse.
- "anonIndustry": Bred branche: "IT", "Sundhed", "Finans", "Industri", "Detail", "Byggeri", "Transport", "Undervisning", "Offentlig administration" etc.
- "anonRegion": Bred region baseret på kommune.

Regler for udtræk:
- "grundlon": Grundlønnen/ferieberettiget løn UDEN bonus/tillæg/fritvalg. Sæt null hvis bruttoløn kun består af én lønlinje.
- "payComponents": Alle lønkomponenter der tilsammen udgør bruttoløn. Inkluder fritvalgs-betaling, ferietillæg-udbetaling, bonus etc. Brug præcis det navn der står på lønsedlen. KUN positive KRONEBELØB fra Total/Beløb-kolonnen. ALDRIG "Arbejdstimer" (det er timer). SKAL summere til bruttolon.
- "receiptLines": Komplet kopi af ALLE poster i rækkefølge. For "amount" brug beløbet fra DENNE PERIODE-kolonnen, ALDRIG "I alt". For persondata (navn, CPR, kontonr): type="redacted", label/amount="████████".
- "otherDeductions": Øvrige fradrag der ikke passer i felterne ovenfor (fx fitness, gruppeliv, kantineordning).
- AM-bidrag er altid 8% af AM-grundlag (= bruttoløn minus medarbejderpension minus ATP). Det er IKKE 8% af bruttoløn direkte.
- "traekkort": Læs den PRÆCISE trækprocent fra lønsedlen. Kig efter "Trækprocent", "Sats" ud for A-skat, eller "Skattekort". Typisk 33-45%. Brug det nøjagtige tal — gæt ikke.
- Adskil medarbejder- og arbejdsgiverpension hvis muligt
- Brug 0 for fradrag der kan læses men er 0, null for felter der ikke kan læses
- "fritvalgKonto": Beløb der OPSPARES til fritvalg pr. måned (typisk 1-9% af løn). Ikke det samme som en fritvalgs-BETALING/udbetaling, som er en lønkomponent.
- "feriepengeHensaet": Ferietillæg der opspares pr. måned (typisk 1% af løn). Ikke det samme som en ferie-UDBETALING.`;

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

  // Rate limit: 10/hour per IP (vision calls are expensive)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";

  const allowed = await checkRateLimit("payslip-ocr", ip, 10);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    // Check content length
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Filen er for stor (max 5 MB)" }),
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

    // Build the file content block — PDFs use "document", images use "image"
    const isPdf = mediaType === "application/pdf";
    const fileBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: image } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: image } };

    // Call Claude Vision
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
              { type: "text", text: "Udtræk alle felter fra denne lønseddel." },
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
      // Parse error detail for debugging
      let errDetail = `API ${anthropicRes.status}`;
      try {
        const errJson = JSON.parse(errBody);
        errDetail = errJson?.error?.message || errDetail;
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: "Kunne ikke analysere lønsedlen", detail: errDetail }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const result = await anthropicRes.json();

    const truncated = result?.stop_reason === "max_tokens";
    if (truncated) {
      console.warn("payslip-ocr: response truncated by max_tokens");
    }

    let text = result?.content?.[0]?.text || "";

    // We used assistant prefill with "{", so prepend it to the response
    text = "{" + text;

    // Strip markdown code block if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    // Extract JSON object from text — Claude may add preamble/postscript
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      text = text.slice(jsonStart, jsonEnd + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If truncated, try to repair by closing open arrays/objects
      if (truncated && jsonStart !== -1) {
        let repaired = text.slice(jsonStart);
        // Close any open strings
        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) repaired += '"';
        // Remove trailing incomplete key-value pairs (e.g. `"key": "incom`)
        repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"}\]]*$/, "");
        // Track bracket stack to close in correct order
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
        // Remove trailing commas before we close
        repaired = repaired.replace(/,\s*$/, "");
        // Close in reverse order
        while (stack.length > 0) repaired += stack.pop();
        try {
          parsed = JSON.parse(repaired);
          console.warn("payslip-ocr: repaired truncated JSON successfully");
        } catch {
          console.error("payslip-ocr: JSON repair failed. Response length:", text.length);
        }
      }
      if (!parsed) {
        console.error("payslip-ocr: JSON parse failed. Response length:", text.length);
        return new Response(
          JSON.stringify({ error: "Kunne ikke læse lønsedlen — prøv et tydeligere billede" }),
          { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Server-side sanity checks ──
    const p = parsed as Record<string, unknown>;
    const num = (k: string) => typeof p[k] === "number" ? p[k] as number : 0;
    const brutto = num("bruttolon");
    let netto = num("nettolon");
    const am = num("amBidrag");
    const warnings: string[] = Array.isArray(p.warnings) ? (p.warnings as string[]) : [];

    if (brutto > 0) {
      // ── 0. Fix accumulated values for individual fields ──
      // Pension employer: typically 8-15% of brutto. If > 25% of brutto, it's accumulated.
      const pensionEr = num("pensionEmployer");
      if (pensionEr > brutto * 0.25) {
        const estimated = Math.round(brutto * 0.12); // estimate 12%
        console.warn(`payslip-ocr: pensionEmployer ${pensionEr} > 25% of brutto ${brutto}, fixing → ${estimated}`);
        p.pensionEmployer = estimated;
        warnings.push(`Arbejdsgiverpension rettet (${pensionEr} → ${estimated}) — virkede akkumuleret.`);
      }

      // Any single deduction field > brutto is almost certainly accumulated
      const deductionFields = ["amBidrag", "aSkat", "atp", "pensionEmployee", "fagforening", "sundhedsforsikring", "fritvalgKonto", "feriepengeHensaet"] as const;
      for (const field of deductionFields) {
        const val = num(field);
        if (val > brutto && val > 0) {
          console.warn(`payslip-ocr: ${field} (${val}) > brutto (${brutto}), resetting to 0`);
          p[field] = 0;
          warnings.push(`${field} nulstillet — beløbet (${val}) var højere end bruttoløn.`);
        }
      }

      // ── 0b. Clean up otherDeductions — remove any > brutto and deduplicate ──
      if (Array.isArray(p.otherDeductions)) {
        const ods = p.otherDeductions as Array<{ name?: string; amount?: number }>;
        // Remove entries where amount > brutto (accumulated)
        const cleaned = ods.filter(d => {
          if (typeof d?.amount === "number" && d.amount > brutto) {
            console.warn(`payslip-ocr: otherDeduction "${d.name}" (${d.amount}) > brutto, removing`);
            warnings.push(`Fradrag "${d.name}" fjernet — beløbet (${d.amount}) var højere end bruttoløn.`);
            return false;
          }
          return true;
        });
        // Deduplicate: if same name appears multiple times, keep the smallest (likely "Denne periode")
        const byName = new Map<string, { name: string; amount: number }>();
        for (const d of cleaned) {
          if (!d?.name) continue;
          const key = d.name.toLowerCase().trim();
          const existing = byName.get(key);
          if (existing) {
            // Keep the smaller amount (likely from "Denne periode", not "I alt")
            if (typeof d.amount === "number" && d.amount < existing.amount) {
              byName.set(key, { name: d.name, amount: d.amount });
            }
          } else {
            byName.set(key, { name: d.name, amount: typeof d.amount === "number" ? d.amount : 0 });
          }
        }
        p.otherDeductions = Array.from(byName.values());
      }

      // ── 0c. Clean up payComponents — deduplicate same names ──
      if (Array.isArray(p.payComponents)) {
        const pcs = p.payComponents as Array<{ name?: string; amount?: number }>;
        const byName = new Map<string, { name: string; amount: number }>();
        for (const pc of pcs) {
          if (!pc?.name || typeof pc.amount !== "number") continue;
          const key = pc.name.toLowerCase().trim();
          const existing = byName.get(key);
          if (existing) {
            // For pay components with same name, keep the smaller (likely "Denne periode")
            if (pc.amount < existing.amount) {
              byName.set(key, { name: pc.name, amount: pc.amount });
            }
          } else {
            byName.set(key, { name: pc.name, amount: pc.amount });
          }
        }
        p.payComponents = Array.from(byName.values());
      }

      // ── 1. ATP default ──
      const atp = num("atp");
      if (atp === 0 && brutto >= 10000) {
        p.atp = 99;
        warnings.push("ATP sat til 99 kr/md (standard fuldtid).");
      }

      // NOTE: AM-bidrag, netto, and brutto reconciliation is now handled
      // client-side by payslipReconciler.ts which uses three-way brutto
      // cross-validation (AI vs AM-derived vs balance-derived).
      // Server only does data cleaning (dedup, accumulated values, ATP default).

      p.warnings = warnings;
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("payslip-ocr error:", err);
    return new Response(
      JSON.stringify({ error: "Der opstod en fejl. Prøv igen." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

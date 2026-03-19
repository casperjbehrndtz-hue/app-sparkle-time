import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MAX_BODY_SIZE = 7 * 1024 * 1024; // 7MB (base64 of a 5MB file)

const SYSTEM_PROMPT = `Du er en dansk lønseddel-parser. Du modtager et billede af en dansk lønseddel.

VIGTIGSTE REGEL: De fleste danske lønsedler har FLERE KOLONNER — typisk "Denne periode" (eller "Beløb") og "I alt"/"Akkumuleret"/"År til dato". Du SKAL kun bruge tal fra "Denne periode"-kolonnen. "I alt"-kolonnen viser summen over HELE ÅRET og er altid meget højere. Hvis du bruger tal fra "I alt"-kolonnen, vil ALLE dine tal være forkerte.

Sådan identificerer du den rigtige kolonne:
1. Find kolonneoverskrifterne — de står typisk øverst i tal-området
2. "Denne periode" / "Beløb" / "Md." / "Periode" = den rigtige kolonne
3. "I alt" / "Akk." / "År" / "Total" = den FORKERTE kolonne (akkumuleret)
4. Hvis der kun er én kolonne med tal, er det denne periode
5. Den rigtige kolonne har typisk LAVERE tal end "I alt"-kolonnen

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

KRITISK — bruttoløn og nettoløn:
- "bruttolon": Summen af alle lønkomponenter FØR fradrag for DENNE PERIODE.
- "nettolon": Beløbet der udbetales til kontoen. Kig efter "Til udbetaling", "Udbetalt", "Netto", "Overført til konto". Står typisk i bunden af lønsedlen.
- VALIDERING: AM-bidrag skal være ca. 8% af (bruttolon - arbejdsgiverpension). Nettolon skal være ca. 55-70% af bruttolon. Hvis dine tal ikke stemmer, har du sandsynligvis læst fra "I alt"-kolonnen.

Anonymisering:
- "anonDescription": Kort, anonym beskrivelse, f.eks. "Sygeplejerske i sundhedssektoren, Midtjylland". ALDRIG arbejdsgiverens navn. Brug bred region.
- "anonJobTitle": Generisk stillingsbetegnelse.
- "anonIndustry": Bred branche: "IT", "Sundhed", "Finans", "Industri", "Detail", "Byggeri", "Transport", "Undervisning", "Offentlig administration" etc.
- "anonRegion": Bred region baseret på kommune.

Regler for udtræk:
- "grundlon": Grundlønnen UDEN bonus/tillæg. Sæt null hvis bruttoløn kun består af én lønlinje.
- "payComponents": Alle lønkomponenter der tilsammen udgør bruttoløn. Brug præcis det navn der står på lønsedlen. KUN positive lønposter.
- "receiptLines": Komplet kopi af ALLE poster i rækkefølge. For "amount" brug beløbet fra DENNE PERIODE-kolonnen, ALDRIG "I alt". For persondata (navn, CPR, kontonr): type="redacted", label/amount="████████".
- "otherDeductions": Øvrige fradrag der ikke passer i felterne ovenfor (fx fitness, gruppeliv, kantineordning).
- AM-bidrag er altid 8% af (bruttoløn minus arbejdsgiverpension)
- Trækprocent er typisk 33-45%
- Adskil medarbejder- og arbejdsgiverpension hvis muligt
- Brug 0 for fradrag der kan læses men er 0, null for felter der ikke kan læses`;

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
          console.error("payslip-ocr: JSON repair failed. Raw text:", text.slice(0, 500));
        }
      }
      if (!parsed) {
        console.error("payslip-ocr: JSON parse failed. Raw text:", text.slice(0, 500));
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
    const netto = num("nettolon");
    const am = num("amBidrag");
    const warnings: string[] = Array.isArray(p.warnings) ? (p.warnings as string[]) : [];

    if (brutto > 0) {
      // Check AM-bidrag ≈ 8% of (brutto - employer pension) — if way off, AI likely read accumulated
      const expectedAm = Math.round((brutto - num("pensionEmployer")) * 0.08);
      const amOff = am > 0 && Math.abs(am - expectedAm) > expectedAm * 0.5; // >50% off

      // Check netto is reasonable (40-75% of brutto)
      const retentionPct = brutto > 0 ? (netto / brutto) * 100 : 0;
      const nettoOff = netto <= 0 || netto > brutto || retentionPct < 40 || retentionPct > 75;

      if (amOff || nettoOff) {
        console.warn(`payslip-ocr sanity: brutto=${brutto} netto=${netto} am=${am} expectedAm=${expectedAm} retention=${retentionPct.toFixed(1)}%`);

        // If AM-bidrag is wrong, recalculate it — it's always 8%
        if (amOff) {
          console.warn(`payslip-ocr: AM-bidrag ${am} ≠ expected ${expectedAm}, fixing`);
          p.amBidrag = expectedAm;
          warnings.push(`AM-bidrag rettet (${am} → ${expectedAm}).`);
        }

        // Recalculate netto from brutto minus all deductions
        const correctedAm = typeof p.amBidrag === "number" ? p.amBidrag as number : expectedAm;
        const askat = num("aSkat");
        const atp = num("atp");
        const pensEmp = num("pensionEmployee");

        // If A-skat looks accumulated too (> 50% of brutto alone), estimate it
        let correctedAskat = askat;
        if (askat > brutto * 0.5) {
          // Estimate: trækprocent applied to (brutto - AM - pension - personfradrag)
          const traek = num("traekkort");
          const fradrag = num("personfradrag") || Math.round(54100 / 12);
          const taxBase = brutto - correctedAm - pensEmp - fradrag;
          correctedAskat = traek > 0 ? Math.round(taxBase * traek / 100) : Math.round(taxBase * 0.37);
          p.aSkat = correctedAskat;
          warnings.push(`A-skat rettet (${askat} → ${correctedAskat}).`);
        }

        // Recalculate netto
        const fag = num("fagforening");
        const sundhed = num("sundhedsforsikring");
        const otherDeds = Array.isArray(p.otherDeductions)
          ? (p.otherDeductions as Array<{ amount?: number }>).reduce((s, d) => s + (typeof d?.amount === "number" ? d.amount : 0), 0)
          : 0;
        const totalDed = correctedAm + correctedAskat + atp + pensEmp + fag + sundhed + otherDeds;
        const calculatedNetto = brutto - totalDed;

        if (calculatedNetto > 0 && calculatedNetto < brutto) {
          console.warn(`payslip-ocr: netto recalculated: ${netto} → ${calculatedNetto}`);
          p.nettolon = calculatedNetto;
          if (nettoOff) warnings.push(`Nettoløn rettet (${netto} → ${calculatedNetto}).`);
        } else {
          // Last resort: 63% estimate
          p.nettolon = Math.round(brutto * 0.63);
          warnings.push("Nettoløn kunne ikke beregnes — estimeret. Ret venligst.");
        }

        p.confidence = "low";
      }

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

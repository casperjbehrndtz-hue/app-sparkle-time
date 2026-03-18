import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MAX_BODY_SIZE = 7 * 1024 * 1024; // 7MB (base64 of a 5MB file)

const SYSTEM_PROMPT = `Du er en dansk lønseddel-parser. Du modtager et billede af en dansk lønseddel.

Udtræk alle felter fra lønsedlen. Alle beløb i hele kroner (afrundet). Returner KUN valid JSON — ingen markdown, ingen kodeblok.

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
  "receiptLines": [{"label": "<tekst>", "amount": "<beløb med fortegn>", "type": "income|deduction|subtotal|info|redacted"}],
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

VIGTIGT — Anonymisering:
- "anonDescription": Skriv en kort, anonym beskrivelse af personen baseret på lønsedlen, f.eks. "Sygeplejerske i sundhedssektoren, Midtjylland" eller "IT-konsulent i privat sektor, Storkøbenhavn". Brug ALDRIG arbejdsgiverens navn. Brug den brede region (Storkøbenhavn, Østjylland, Nordjylland, Fyn, Sjælland etc.), ALDRIG specifik adresse.
- "anonJobTitle": Stillingsbetegnelsen i generisk form. "Software-udvikler", ikke "Senior Developer hos Netcompany".
- "anonIndustry": Branchen i bred forstand. "IT", "Sundhed", "Finans", "Industri", "Detail", "Byggeri", "Transport", "Undervisning", "Offentlig administration" etc.
- "anonRegion": Bred geografisk region baseret på kommune. Aldrig specifik adresse eller postnummer.

Regler for udtræk:
- "grundlon": Grundlønnen/basislønnen UDEN bonus, provision, tillæg, overtid. Hvis lønsedlen eksplicit viser en grundløn/månedsløn/gage separat fra variable dele, så brug den. Hvis bruttoløn kun består af én lønlinje (fx "Månedsløn"), sæt grundlon til null (den ER grundlønnen). Sæt kun grundlon hvis der tydeligt er variable komponenter oveni.
- "payComponents": Alle synlige lønkomponenter der TILSAMMEN udgør bruttoløn. Eksempler: grundløn/månedsløn/gage, bonus, provision, salær, overtid, vagtillæg, funktionstillæg, anciennitetstillæg, St. Bededag kompensation. Brug præcis det navn der står på lønsedlen. Medtag KUN positive lønposter (ikke fradrag). Hvis der kun er én lønlinje (fx "Månedsløn 60.000"), returner den som eneste element.
- "receiptLines": En komplet kopi af ALLE synlige poster på lønsedlen, i PRÆCIS den rækkefølge de står. Dette er en rå transskription af hele lønsedlen. For hvert linje-item: "label" er teksten (præcis som den står), "amount" er beløbet som string med fortegn og øre (fx "60.557,00", "-4.643,00", "+6.055,70"). "type" angiver linjetypen: "income" for lønposter, "deduction" for fradrag (negative beløb), "subtotal" for totallinjer (bruttoløn, nettoløn, AM-grundlag), "info" for informationslinjer uden beløb, "redacted" for linjer med persondata (navn, CPR, kontonr, adresse, lønnr) — skriv "████████" som amount og en generisk label (fx "Medarbejder", "CPR", "Kontonr"). Medtag ALT — også linjer som "Pensionsgivende md. løn", "AM-bidragsgrundlag", "A-indkomst", osv. Spring IKKE noget over.
- "otherDeductions": ALLE øvrige fradrag/tillæg der trækkes fra lønnen men ikke passer ind i felterne ovenfor. Eksempler: NNFitness, gruppeliv, heltidsulykke, kantineordning, medarbejderaktier, firmabil, fri telefon. Angiv dem med præcis det navn der står på lønsedlen og beløbet. Medtag KUN poster der reelt trækkes fra lønnen (ikke informationslinjer).
- AM-bidrag er altid 8% af bruttoløn — brug dette som sanity check
- Trækprocent er typisk 33-45% — markér "low" confidence hvis udenfor
- Adskil medarbejder- og arbejdsgiverpension hvis muligt
- Bruttoløn + nettoløn er de vigtigste — markér "low" confidence hvis de ikke stemmer overens med fradragene
- Brug 0 (ikke null) for standard-fradrag der kan læses men er 0
- Brug null for felter der slet ikke kan læses
- Sæt "confidence" baseret på hvor mange felter du kunne læse med sikkerhed
- Tilføj warnings for felter der var svære at læse eller virker usandsynlige`;

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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            fileBlock,
            { type: "text", text: "Udtræk alle felter fra denne lønseddel." },
          ],
        }],
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
        // Close open arrays and objects
        const opens = (repaired.match(/[{[]/g) || []).length;
        const closes = (repaired.match(/[}\]]/g) || []).length;
        for (let i = 0; i < opens - closes; i++) {
          // Guess whether to close array or object based on last opener
          const lastOpen = repaired.lastIndexOf("[") > repaired.lastIndexOf("{") ? "]" : "}";
          repaired += lastOpen;
        }
        // Remove trailing commas before closing brackets
        repaired = repaired.replace(/,\s*([}\]])/g, "$1");
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

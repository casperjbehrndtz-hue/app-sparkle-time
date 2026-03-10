const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Municipality name → postal code mapping ──────────────
const MUNICIPALITY_TO_POSTAL: Record<string, string> = {
  "Hele landet": "000",
  "København": "1000", "Frederiksberg": "2000", "Dragør": "2791", "Tårnby": "2770",
  "Albertslund": "2620", "Ballerup": "2750", "Brøndby": "2605", "Gentofte": "2820",
  "Gladsaxe": "2860", "Glostrup": "2600", "Herlev": "2730", "Hvidovre": "2650",
  "Høje-Taastrup": "2630", "Ishøj": "2635", "Lyngby-Taarbæk": "2800", "Rødovre": "2610",
  "Vallensbæk": "2625", "Allerød": "3450", "Egedal": "3660", "Fredensborg": "3480",
  "Frederikssund": "3600", "Furesø": "3520", "Gribskov": "3230", "Halsnæs": "3300",
  "Helsingør": "3000", "Hillerød": "3400", "Hørsholm": "2970", "Rudersdal": "2840",
  "Bornholm": "3700",
  "Greve": "2670", "Køge": "4600", "Lejre": "4320", "Roskilde": "4000", "Solrød": "2680",
  "Faxe": "4640", "Guldborgsund": "4800", "Holbæk": "4300", "Kalundborg": "4400",
  "Lolland": "4900", "Næstved": "4700", "Odsherred": "4500", "Ringsted": "4100",
  "Slagelse": "4200", "Sorø": "4180", "Stevns": "4660", "Vordingborg": "4760",
  "Assens": "5610", "Faaborg-Midtfyn": "5750", "Kerteminde": "5300", "Langeland": "5900",
  "Middelfart": "5500", "Nordfyns": "5400", "Nyborg": "5800", "Odense": "5000",
  "Svendborg": "5700", "Ærø": "5970",
  "Billund": "7190", "Esbjerg": "6700", "Fanø": "6720", "Fredericia": "7000",
  "Haderslev": "6100", "Kolding": "6000", "Sønderborg": "6400", "Tønder": "6270",
  "Varde": "6800", "Vejen": "6600", "Vejle": "7100", "Aabenraa": "6200",
  "Favrskov": "8382", "Hedensted": "8722", "Horsens": "8700", "Norddjurs": "8500",
  "Odder": "8300", "Randers": "8900", "Samsø": "8305", "Silkeborg": "8600",
  "Skanderborg": "8660", "Syddjurs": "8410", "Aarhus": "8000",
  "Herning": "7400", "Holstebro": "7500", "Ikast-Brande": "7430", "Lemvig": "7620",
  "Ringkøbing-Skjern": "6950", "Skive": "7800", "Struer": "7600", "Viborg": "8800",
  "Brønderslev": "9700", "Frederikshavn": "9900", "Hjørring": "9800", "Jammerbugt": "9490",
  "Læsø": "9940", "Mariagerfjord": "9550", "Morsø": "7900", "Rebild": "9520",
  "Thisted": "7700", "Vesthimmerlands": "9600", "Aalborg": "9000",
};

// ─── Danmarks Statistik: Average disposable income by municipality ────
async function fetchDSTIncome(): Promise<Record<string, number>> {
  try {
    // Get latest year only (2024)
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "INDKP101",
        format: "CSV",
        lang: "da",
        variables: [
          { code: "INDKOMSTTYPE", values: ["100"] },   // Disponibel indkomst
          { code: "ENHED", values: ["116"] },           // Gennemsnit for alle personer (kr.)
          { code: "KOEN", values: ["MOK"] },            // Mænd og kvinder i alt
          { code: "OMRÅDE", values: ["*"] },
          { code: "Tid", values: ["2024"] },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("DST INDKP101 failed:", res.status, text.slice(0, 300));
      return {};
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    const result: Record<string, number> = {};

    // CSV header: INDKOMSTTYPE;ENHED;KOEN;OMRÅDE;TID;INDHOLD
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < 6) continue;
      const munCode = cols[3]?.trim();
      const value = parseFloat(cols[5]?.trim());

      if (!munCode || isNaN(value)) continue;
      // Skip landsdele (2-digit codes like "01", "02")
      if (munCode.length < 3 && munCode !== "000") continue;

      // Map municipality code to postal code
      const postalCode = MUNICIPALITY_TO_POSTAL[munCode] || munCode;
      // Value is annual → monthly
      result[postalCode] = Math.round(value / 12);
    }

    // Also store the national average under "000"
    console.log(`DST income: ${Object.keys(result).length} areas mapped`);
    return result;
  } catch (err) {
    console.error("DST income fetch error:", err);
    return {};
  }
}

// ─── Energi Data Service: Current electricity spot prices ──────
async function fetchElPrices(): Promise<{ dk1: number; dk2: number; avgKwhDkk: number }> {
  try {
    const url = `https://api.energidataservice.dk/dataset/Elspotprices?limit=48&sort=HourUTC%20DESC&filter=%7B%22PriceArea%22:%5B%22DK1%22,%22DK2%22%5D%7D`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.warn("Energi Data Service failed:", res.status, text.slice(0, 200));
      return { dk1: 0, dk2: 0, avgKwhDkk: 0 };
    }

    const json = await res.json();
    const records = json?.records ?? [];

    let dk1Sum = 0, dk1Count = 0, dk2Sum = 0, dk2Count = 0;

    for (const r of records) {
      const price = r.SpotPriceDKK;
      if (price == null || price === 0) continue;
      const kwhPrice = price / 1000; // MWh → kWh

      if (r.PriceArea === "DK1") { dk1Sum += kwhPrice; dk1Count++; }
      else if (r.PriceArea === "DK2") { dk2Sum += kwhPrice; dk2Count++; }
    }

    const dk1Avg = dk1Count > 0 ? Math.round(dk1Sum / dk1Count * 100) / 100 : 0;
    const dk2Avg = dk2Count > 0 ? Math.round(dk2Sum / dk2Count * 100) / 100 : 0;

    // Total consumer price = spot + transport + PSO + elafgift + moms
    // Approx. +1.10 kr/kWh for all extras (2026 rates)
    const avgSpot = dk1Count + dk2Count > 0 ? (dk1Sum + dk2Sum) / (dk1Count + dk2Count) : 0;
    const allInPrice = Math.round((avgSpot + 1.10) * 100) / 100;

    console.log(`El prices: DK1=${dk1Avg}, DK2=${dk2Avg}, all-in=${allInPrice}`);

    return { dk1: dk1Avg, dk2: dk2Avg, avgKwhDkk: allInPrice };
  } catch (err) {
    console.error("El price fetch error:", err);
    return { dk1: 0, dk2: 0, avgKwhDkk: 0 };
  }
}

// ─── Nationalbanken: Mortgage rate via MPK3 ────────────────
async function fetchMortgageRate(): Promise<number> {
  try {
    // MPK3: Rentesatser, ultimo - use bond average for mortgage estimate
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "MPK3",
        format: "CSV",
        variables: [
          { code: "TYPE", values: ["5500701001"] }, // Enhedspriotitetsobligationer
          { code: "Tid", values: ["*"] },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("MPK3 failed:", res.status, text.slice(0, 200));
      return 4.0;
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");

    // Find the latest non-empty value
    let latestRate = 4.0;
    for (let i = lines.length - 1; i >= 1; i--) {
      const cols = lines[i].split(";");
      const val = parseFloat(cols[cols.length - 1]?.trim().replace(",", "."));
      if (!isNaN(val) && val > 0) {
        // Bond rate ≈ mortgage rate (realkreditobligationer are directly the mortgage cost)
        // Add ~0.6% for bidragssats
        latestRate = Math.round((val + 0.6) * 100) / 100;
        break;
      }
    }

    console.log(`Mortgage rate estimate: ${latestRate}%`);
    return latestRate;
  } catch (err) {
    console.error("Mortgage rate fetch error:", err);
    return 4.0;
  }
}

// ─── Main handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [incomeData, elPrices, mortgageRate] = await Promise.all([
      fetchDSTIncome(),
      fetchElPrices(),
      fetchMortgageRate(),
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      income: incomeData,
      electricity: elPrices,
      mortgageRate,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("market-data error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch market data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

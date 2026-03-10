const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Municipality code → postal code mapping ──────────────
// DST uses municipality codes; our app uses postal codes
const MUNICIPALITY_TO_POSTAL: Record<string, string> = {
  "101": "1000", "147": "2000", "155": "2770", "185": "2770",
  "165": "2620", "151": "2750", "153": "2605", "157": "2820",
  "159": "2860", "161": "2600", "163": "2730", "167": "2650",
  "169": "2630", "183": "2635", "173": "2800", "175": "2610", "187": "2625",
  "201": "3450", "240": "3660", "210": "3480", "250": "3600",
  "190": "3520", "270": "3230", "260": "3300", "217": "3000",
  "219": "3400", "223": "2970", "230": "2840",
  "400": "3700",
  "253": "2670", "259": "4600", "350": "4320", "265": "4000", "269": "2680",
  "320": "4640", "376": "4800", "316": "4300", "326": "4400",
  "360": "4900", "370": "4700", "306": "4500", "329": "4100",
  "330": "4200", "340": "4180", "336": "4660", "390": "4760",
  "420": "5610", "430": "5750", "440": "5300", "482": "5900",
  "410": "5500", "480": "5400", "450": "5800", "461": "5000", "479": "5700", "492": "5970",
  "530": "7190", "561": "6700", "563": "6720", "607": "7000",
  "510": "6100", "621": "6000", "540": "6400", "550": "6270",
  "573": "6800", "575": "6600", "630": "7100", "580": "6200",
  "710": "8382", "766": "8722", "615": "8700", "707": "8500",
  "727": "8300", "730": "8900", "741": "8305", "740": "8600",
  "746": "8660", "706": "8410", "751": "8000",
  "657": "7400", "661": "7500", "756": "7430", "665": "7620",
  "760": "6950", "779": "7800", "671": "7600", "791": "8800",
  "810": "9700", "813": "9900", "860": "9800", "849": "9490",
  "825": "9940", "846": "9550", "773": "7900", "840": "9520",
  "787": "7700", "820": "9600", "851": "9000",
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

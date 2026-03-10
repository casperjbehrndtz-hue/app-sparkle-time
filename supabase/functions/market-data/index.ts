const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Danmarks Statistik: Average disposable income by municipality ────
async function fetchDSTIncome(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "INDKP101",
        format: "CSV",
        lang: "da",
        variables: [
          { code: "INDKOMSTTYPE", values: ["100"] },  // Disponibel indkomst
          { code: "ENHED", values: ["101"] },          // Gennemsnit (kr.)
          { code: "KØN", values: ["TOT"] },            // I alt
          { code: "OMRÅDE", values: ["*"] },
          { code: "Tid", values: ["*"] },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("DST INDKP101 failed:", res.status, text.slice(0, 200));
      return {};
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    const result: Record<string, number> = {};

    // CSV format: INDKOMSTTYPE;ENHED;KØN;OMRÅDE;TID;INDHOLD
    // We want the latest year for each OMRÅDE
    const latestByArea: Record<string, { year: number; value: number }> = {};

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < 6) continue;
      const area = cols[3]?.trim();
      const year = parseInt(cols[4]?.trim());
      const value = parseFloat(cols[5]?.trim());

      if (!area || isNaN(year) || isNaN(value)) continue;

      // Only use municipality codes (3-digit), skip landsdele (2-digit)
      if (area.length !== 3 && area !== "000") continue;

      if (!latestByArea[area] || year > latestByArea[area].year) {
        latestByArea[area] = { year, value };
      }
    }

    for (const [area, { value }] of Object.entries(latestByArea)) {
      // Value is annual → monthly
      result[area] = Math.round(value / 12);
    }

    console.log(`DST income: ${Object.keys(result).length} municipalities`);
    return result;
  } catch (err) {
    console.error("DST income fetch error:", err);
    return {};
  }
}

// ─── Energi Data Service: Current electricity spot prices ──────
async function fetchElPrices(): Promise<{ dk1: number; dk2: number; avgKwhDkk: number }> {
  try {
    // Use limit=48 to get latest records without date filtering
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

// ─── Nationalbanken: Interest rates via DST ────────────────
async function fetchMortgageRate(): Promise<number> {
  try {
    // DNREN: Nationalbankens officielle rentesatser
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "DNREN",
        format: "CSV",
        variables: [
          { code: "RENTETYPE", values: ["TELEUD"] }, // Udlånsrente
          { code: "Tid", values: ["*"] },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("DNREN failed:", res.status);
      // Try simple fallback - use a sensible current rate
      return 4.0;
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");

    // Find the latest value
    let latestRate = 4.0;
    for (let i = lines.length - 1; i >= 1; i--) {
      const cols = lines[i].split(";");
      const val = parseFloat(cols[cols.length - 1]?.trim());
      if (!isNaN(val) && val > 0) {
        // Nationalbankens udlånsrente is policy rate;
        // typical mortgage spread is ~2-3% above
        latestRate = Math.round((val + 2.5) * 100) / 100;
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
        "Cache-Control": "public, max-age=3600", // Cache 1 hour
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

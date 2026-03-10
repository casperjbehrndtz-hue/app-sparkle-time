const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Danmarks Statistik: Average rent by municipality ──────
async function fetchDSTRent(): Promise<Record<string, number>> {
  try {
    // HUSLE2: Husleje for lejligheder, gennemsnit pr. m² pr. kommune
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "HUSLE2",
        format: "JSONSTAT",
        variables: [
          { code: "BOLTYP", values: ["LEJL"] },
          { code: "OMRÅDE", values: ["*"] },
          { code: "Tid", values: ["(1)"] }, // latest period
        ],
      }),
    });

    if (!res.ok) {
      console.warn("DST HUSLE2 failed:", res.status);
      return {};
    }

    const json = await res.json();
    const dataset = json?.dataset ?? json;
    const dims = dataset?.dimension;
    const values = dataset?.value;

    if (!dims || !values) return {};

    // Parse JSONSTAT format
    const areas = dims?.OMRÅDE?.category?.label ?? {};
    const areaIndex = dims?.OMRÅDE?.category?.index ?? {};
    const result: Record<string, number> = {};

    for (const [code, label] of Object.entries(areas)) {
      const idx = areaIndex[code];
      if (idx !== undefined && values[idx] != null) {
        // Value is kr/m²/year → convert to monthly for 70m²
        const prPerM2Year = values[idx] as number;
        const monthlyRent70m2 = Math.round((prPerM2Year * 70) / 12);
        result[code] = monthlyRent70m2;
      }
    }

    return result;
  } catch (err) {
    console.error("DST rent fetch error:", err);
    return {};
  }
}

// ─── Danmarks Statistik: Average income by municipality ────
async function fetchDSTIncome(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "INDKP101",
        format: "JSONSTAT",
        variables: [
          { code: "INDKOMSTTYPE", values: ["100"] }, // Disponibel indkomst
          { code: "ENHED", values: ["GNSNIT"] }, // Gennemsnit
          { code: "OMRÅDE", values: ["*"] },
          { code: "Tid", values: ["(1)"] },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("DST INDKP101 failed:", res.status);
      return {};
    }

    const json = await res.json();
    const dataset = json?.dataset ?? json;
    const dims = dataset?.dimension;
    const values = dataset?.value;

    if (!dims || !values) return {};

    const areas = dims?.OMRÅDE?.category?.label ?? {};
    const areaIndex = dims?.OMRÅDE?.category?.index ?? {};
    const result: Record<string, number> = {};

    for (const [code, _label] of Object.entries(areas)) {
      const idx = areaIndex[code];
      if (idx !== undefined && values[idx] != null) {
        // Value is annual → monthly
        result[code] = Math.round((values[idx] as number) / 12);
      }
    }

    return result;
  } catch (err) {
    console.error("DST income fetch error:", err);
    return {};
  }
}

// ─── Energi Data Service: Current electricity prices ───────
async function fetchElPrices(): Promise<{ dk1: number; dk2: number; avgKwhDkk: number }> {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const url = `https://api.energidataservice.dk/dataset/Elspotprices?start=${start}&filter={"PriceArea":["DK1","DK2"]}&sort=HourUTC DESC&limit=48`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Energi Data Service failed:", res.status);
      return { dk1: 0, dk2: 0, avgKwhDkk: 0 };
    }

    const json = await res.json();
    const records = json?.records ?? [];

    let dk1Sum = 0, dk1Count = 0, dk2Sum = 0, dk2Count = 0;

    for (const r of records) {
      const price = r.SpotPriceDKK; // DKK per MWh
      if (price == null) continue;
      const kwhPrice = price / 1000; // Convert to DKK per kWh

      if (r.PriceArea === "DK1") {
        dk1Sum += kwhPrice;
        dk1Count++;
      } else if (r.PriceArea === "DK2") {
        dk2Sum += kwhPrice;
        dk2Count++;
      }
    }

    const dk1Avg = dk1Count > 0 ? Math.round(dk1Sum / dk1Count * 100) / 100 : 0;
    const dk2Avg = dk2Count > 0 ? Math.round(dk2Sum / dk2Count * 100) / 100 : 0;
    const totalAvg = (dk1Avg + dk2Avg) / 2;

    // Estimate monthly cost (avg Danish household ~3500 kWh/year solo, 5000 par)
    // totalAvg is raw spot price, add transport + afgifter (~1.1 kr/kWh total typically)
    const allInPrice = totalAvg + 1.1; // rough total price per kWh

    return {
      dk1: dk1Avg,
      dk2: dk2Avg,
      avgKwhDkk: Math.round(allInPrice * 100) / 100,
    };
  } catch (err) {
    console.error("El price fetch error:", err);
    return { dk1: 0, dk2: 0, avgKwhDkk: 0 };
  }
}

// ─── Nationalbanken: Leading mortgage interest rate ────────
async function fetchMortgageRate(): Promise<number> {
  try {
    // Nationalbanken publishes key rates - use the official lending rate as proxy
    // Their statistical data API
    const res = await fetch(
      "https://api.statbank.dk/v1/data",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "MPK3",
          format: "JSONSTAT",
          variables: [
            { code: "RENTETYPE", values: ["EFFREN"] }, // Effektiv rente
            { code: "LAANTYP", values: ["FAST30"] },   // 30-års fastforrentet
            { code: "Tid", values: ["(1)"] },
          ],
        }),
      }
    );

    if (!res.ok) {
      // Fallback: try DNRENTM (Nationalbankens udlånsrente)
      console.warn("MPK3 failed, trying fallback");
      return 4.0; // sensible default
    }

    const json = await res.json();
    const dataset = json?.dataset ?? json;
    const values = dataset?.value;

    if (values && values.length > 0 && values[0] != null) {
      return Math.round(values[0] * 100) / 100;
    }

    return 4.0;
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
    // Fetch all in parallel
    const [rentData, incomeData, elPrices, mortgageRate] = await Promise.all([
      fetchDSTRent(),
      fetchDSTIncome(),
      fetchElPrices(),
      fetchMortgageRate(),
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      rent: rentData,           // municipality code → monthly rent (70m²)
      income: incomeData,       // municipality code → monthly disposable income
      electricity: elPrices,    // dk1, dk2 spot prices + avgKwhDkk
      mortgageRate,             // current 30-year fixed rate
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("market-data error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch market data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

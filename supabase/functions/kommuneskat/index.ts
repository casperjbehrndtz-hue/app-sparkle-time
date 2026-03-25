import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// All 98 Danish municipalities with 2026 tax rates
// Source: skm.dk 2026 satser (kommunale skatteprocenter)
const MUNICIPALITIES = [
  // Region Hovedstaden
  { name: "Albertslund", taxRate: 0.2560, churchTaxRate: 0.0056, region: "Hovedstaden" },
  { name: "Allerød", taxRate: 0.2510, churchTaxRate: 0.0054, region: "Hovedstaden" },
  { name: "Ballerup", taxRate: 0.2555, churchTaxRate: 0.0053, region: "Hovedstaden" },
  { name: "Bornholm", taxRate: 0.2600, churchTaxRate: 0.0073, region: "Hovedstaden" },
  { name: "Brøndby", taxRate: 0.2550, churchTaxRate: 0.0052, region: "Hovedstaden" },
  { name: "Dragør", taxRate: 0.2510, churchTaxRate: 0.0047, region: "Hovedstaden" },
  { name: "Egedal", taxRate: 0.2550, churchTaxRate: 0.0054, region: "Hovedstaden" },
  { name: "Fredensborg", taxRate: 0.2540, churchTaxRate: 0.0054, region: "Hovedstaden" },
  { name: "Frederiksberg", taxRate: 0.2280, churchTaxRate: 0.0044, region: "Hovedstaden" },
  { name: "Frederikssund", taxRate: 0.2545, churchTaxRate: 0.0059, region: "Hovedstaden" },
  { name: "Furesø", taxRate: 0.2505, churchTaxRate: 0.0054, region: "Hovedstaden" },
  { name: "Gentofte", taxRate: 0.2290, churchTaxRate: 0.0046, region: "Hovedstaden" },
  { name: "Gladsaxe", taxRate: 0.2450, churchTaxRate: 0.0050, region: "Hovedstaden" },
  { name: "Glostrup", taxRate: 0.2450, churchTaxRate: 0.0055, region: "Hovedstaden" },
  { name: "Gribskov", taxRate: 0.2590, churchTaxRate: 0.0062, region: "Hovedstaden" },
  { name: "Halsnæs", taxRate: 0.2630, churchTaxRate: 0.0064, region: "Hovedstaden" },
  { name: "Helsingør", taxRate: 0.2585, churchTaxRate: 0.0053, region: "Hovedstaden" },
  { name: "Herlev", taxRate: 0.2530, churchTaxRate: 0.0050, region: "Hovedstaden" },
  { name: "Hillerød", taxRate: 0.2545, churchTaxRate: 0.0055, region: "Hovedstaden" },
  { name: "Hvidovre", taxRate: 0.2550, churchTaxRate: 0.0051, region: "Hovedstaden" },
  { name: "Høje-Taastrup", taxRate: 0.2490, churchTaxRate: 0.0055, region: "Hovedstaden" },
  { name: "Hørsholm", taxRate: 0.2390, churchTaxRate: 0.0048, region: "Hovedstaden" },
  { name: "Ishøj", taxRate: 0.2550, churchTaxRate: 0.0056, region: "Hovedstaden" },
  { name: "København", taxRate: 0.2346, churchTaxRate: 0.0044, region: "Hovedstaden" },
  { name: "Lyngby-Taarbæk", taxRate: 0.2370, churchTaxRate: 0.0049, region: "Hovedstaden" },
  { name: "Rudersdal", taxRate: 0.2380, churchTaxRate: 0.0049, region: "Hovedstaden" },
  { name: "Rødovre", taxRate: 0.2555, churchTaxRate: 0.0049, region: "Hovedstaden" },
  { name: "Tårnby", taxRate: 0.2355, churchTaxRate: 0.0054, region: "Hovedstaden" },
  { name: "Vallensbæk", taxRate: 0.2530, churchTaxRate: 0.0049, region: "Hovedstaden" },
  // Region Sjælland
  { name: "Faxe", taxRate: 0.2630, churchTaxRate: 0.0068, region: "Sjælland" },
  { name: "Greve", taxRate: 0.2550, churchTaxRate: 0.0056, region: "Sjælland" },
  { name: "Guldborgsund", taxRate: 0.2660, churchTaxRate: 0.0074, region: "Sjælland" },
  { name: "Holbæk", taxRate: 0.2625, churchTaxRate: 0.0066, region: "Sjælland" },
  { name: "Kalundborg", taxRate: 0.2620, churchTaxRate: 0.0068, region: "Sjælland" },
  { name: "Køge", taxRate: 0.2575, churchTaxRate: 0.0061, region: "Sjælland" },
  { name: "Lejre", taxRate: 0.2610, churchTaxRate: 0.0062, region: "Sjælland" },
  { name: "Lolland", taxRate: 0.2680, churchTaxRate: 0.0083, region: "Sjælland" },
  { name: "Næstved", taxRate: 0.2635, churchTaxRate: 0.0066, region: "Sjælland" },
  { name: "Odsherred", taxRate: 0.2625, churchTaxRate: 0.0067, region: "Sjælland" },
  { name: "Ringsted", taxRate: 0.2590, churchTaxRate: 0.0064, region: "Sjælland" },
  { name: "Roskilde", taxRate: 0.2485, churchTaxRate: 0.0058, region: "Sjælland" },
  { name: "Slagelse", taxRate: 0.2655, churchTaxRate: 0.0068, region: "Sjælland" },
  { name: "Solrød", taxRate: 0.2530, churchTaxRate: 0.0055, region: "Sjælland" },
  { name: "Sorø", taxRate: 0.2620, churchTaxRate: 0.0066, region: "Sjælland" },
  { name: "Stevns", taxRate: 0.2580, churchTaxRate: 0.0067, region: "Sjælland" },
  { name: "Vordingborg", taxRate: 0.2650, churchTaxRate: 0.0072, region: "Sjælland" },
  // Region Syddanmark
  { name: "Assens", taxRate: 0.2645, churchTaxRate: 0.0072, region: "Syddanmark" },
  { name: "Billund", taxRate: 0.2600, churchTaxRate: 0.0073, region: "Syddanmark" },
  { name: "Esbjerg", taxRate: 0.2565, churchTaxRate: 0.0068, region: "Syddanmark" },
  { name: "Faaborg-Midtfyn", taxRate: 0.2650, churchTaxRate: 0.0072, region: "Syddanmark" },
  { name: "Fanø", taxRate: 0.2610, churchTaxRate: 0.0075, region: "Syddanmark" },
  { name: "Fredericia", taxRate: 0.2535, churchTaxRate: 0.0065, region: "Syddanmark" },
  { name: "Haderslev", taxRate: 0.2615, churchTaxRate: 0.0071, region: "Syddanmark" },
  { name: "Kerteminde", taxRate: 0.2640, churchTaxRate: 0.0070, region: "Syddanmark" },
  { name: "Kolding", taxRate: 0.2531, churchTaxRate: 0.0063, region: "Syddanmark" },
  { name: "Langeland", taxRate: 0.2710, churchTaxRate: 0.0080, region: "Syddanmark" },
  { name: "Middelfart", taxRate: 0.2600, churchTaxRate: 0.0066, region: "Syddanmark" },
  { name: "Nordfyns", taxRate: 0.2665, churchTaxRate: 0.0074, region: "Syddanmark" },
  { name: "Nyborg", taxRate: 0.2650, churchTaxRate: 0.0070, region: "Syddanmark" },
  { name: "Odense", taxRate: 0.2506, churchTaxRate: 0.0065, region: "Syddanmark" },
  { name: "Svendborg", taxRate: 0.2645, churchTaxRate: 0.0070, region: "Syddanmark" },
  { name: "Sønderborg", taxRate: 0.2625, churchTaxRate: 0.0074, region: "Syddanmark" },
  { name: "Tønder", taxRate: 0.2650, churchTaxRate: 0.0077, region: "Syddanmark" },
  { name: "Varde", taxRate: 0.2600, churchTaxRate: 0.0072, region: "Syddanmark" },
  { name: "Vejen", taxRate: 0.2600, churchTaxRate: 0.0070, region: "Syddanmark" },
  { name: "Vejle", taxRate: 0.2515, churchTaxRate: 0.0064, region: "Syddanmark" },
  { name: "Ærø", taxRate: 0.2730, churchTaxRate: 0.0085, region: "Syddanmark" },
  { name: "Aabenraa", taxRate: 0.2600, churchTaxRate: 0.0072, region: "Syddanmark" },
  // Region Midtjylland
  { name: "Favrskov", taxRate: 0.2575, churchTaxRate: 0.0067, region: "Midtjylland" },
  { name: "Hedensted", taxRate: 0.2600, churchTaxRate: 0.0067, region: "Midtjylland" },
  { name: "Herning", taxRate: 0.2535, churchTaxRate: 0.0072, region: "Midtjylland" },
  { name: "Holstebro", taxRate: 0.2585, churchTaxRate: 0.0074, region: "Midtjylland" },
  { name: "Horsens", taxRate: 0.2575, churchTaxRate: 0.0067, region: "Midtjylland" },
  { name: "Ikast-Brande", taxRate: 0.2570, churchTaxRate: 0.0073, region: "Midtjylland" },
  { name: "Lemvig", taxRate: 0.2620, churchTaxRate: 0.0078, region: "Midtjylland" },
  { name: "Norddjurs", taxRate: 0.2650, churchTaxRate: 0.0076, region: "Midtjylland" },
  { name: "Odder", taxRate: 0.2545, churchTaxRate: 0.0066, region: "Midtjylland" },
  { name: "Randers", taxRate: 0.2635, churchTaxRate: 0.0075, region: "Midtjylland" },
  { name: "Ringkøbing-Skjern", taxRate: 0.2580, churchTaxRate: 0.0077, region: "Midtjylland" },
  { name: "Samsø", taxRate: 0.2700, churchTaxRate: 0.0084, region: "Midtjylland" },
  { name: "Silkeborg", taxRate: 0.2555, churchTaxRate: 0.0070, region: "Midtjylland" },
  { name: "Skanderborg", taxRate: 0.2540, churchTaxRate: 0.0066, region: "Midtjylland" },
  { name: "Skive", taxRate: 0.2620, churchTaxRate: 0.0077, region: "Midtjylland" },
  { name: "Struer", taxRate: 0.2615, churchTaxRate: 0.0078, region: "Midtjylland" },
  { name: "Syddjurs", taxRate: 0.2620, churchTaxRate: 0.0069, region: "Midtjylland" },
  { name: "Viborg", taxRate: 0.2595, churchTaxRate: 0.0073, region: "Midtjylland" },
  { name: "Aarhus", taxRate: 0.2505, churchTaxRate: 0.0064, region: "Midtjylland" },
  // Region Nordjylland
  { name: "Brønderslev", taxRate: 0.2650, churchTaxRate: 0.0078, region: "Nordjylland" },
  { name: "Frederikshavn", taxRate: 0.2645, churchTaxRate: 0.0078, region: "Nordjylland" },
  { name: "Hjørring", taxRate: 0.2645, churchTaxRate: 0.0078, region: "Nordjylland" },
  { name: "Jammerbugt", taxRate: 0.2650, churchTaxRate: 0.0079, region: "Nordjylland" },
  { name: "Læsø", taxRate: 0.2700, churchTaxRate: 0.0085, region: "Nordjylland" },
  { name: "Mariagerfjord", taxRate: 0.2620, churchTaxRate: 0.0076, region: "Nordjylland" },
  { name: "Morsø", taxRate: 0.2665, churchTaxRate: 0.0082, region: "Nordjylland" },
  { name: "Rebild", taxRate: 0.2600, churchTaxRate: 0.0075, region: "Nordjylland" },
  { name: "Thisted", taxRate: 0.2620, churchTaxRate: 0.0079, region: "Nordjylland" },
  { name: "Vesthimmerland", taxRate: 0.2640, churchTaxRate: 0.0078, region: "Nordjylland" },
  { name: "Aalborg", taxRate: 0.2589, churchTaxRate: 0.0075, region: "Nordjylland" },
];

const RESPONSE_BODY = JSON.stringify({
  year: 2026,
  source: "skm.dk",
  count: MUNICIPALITIES.length,
  municipalities: MUNICIPALITIES,
});

// Public API — no auth, aggressive caching
serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  // Optional: filter by ?region= or ?name=
  const url = new URL(req.url);
  const regionFilter = url.searchParams.get("region");
  const nameFilter = url.searchParams.get("name");

  if (regionFilter || nameFilter) {
    let filtered = MUNICIPALITIES;
    if (regionFilter) {
      filtered = filtered.filter(m => m.region.toLowerCase() === regionFilter.toLowerCase());
    }
    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
    }

    return new Response(JSON.stringify({
      year: 2026,
      source: "skm.dk",
      count: filtered.length,
      municipalities: filtered,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  }

  // Full dataset — pre-serialized for speed
  return new Response(RESPONSE_BODY, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
});

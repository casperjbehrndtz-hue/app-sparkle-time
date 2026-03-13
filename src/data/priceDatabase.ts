// Kassen Prisdatabase – alle priser i DKK/md.
// Kilde: Officielle priser pr. februar 2026

// Streaming priser – verificeret januar 2026 (officielle dk-priser)
export const SUBSCRIPTIONS = {
  netflix: { label: "Netflix", price: 129, icon: "🎬", category: "Streaming" },      // Standard HD
  spotify: {
    label: "Spotify",
    price_solo: 109,   // Premium Individual
    price_par: 139,    // Premium Duo
    icon: "🎵",
    category: "Musik",
  },
  hbo: { label: "HBO Max", price: 89, icon: "🎭", category: "Streaming" },            // Standard
  viaplay: { label: "Viaplay", price: 149, icon: "⚽", category: "Streaming" },       // Total
  appleTV: { label: "Apple TV+", price: 59, icon: "🍎", category: "Streaming" },
  amazonPrime: { label: "Amazon Prime", price: 89, icon: "📦", category: "Streaming" }, // Prime Monthly
  disney: { label: "Disney+", price: 79, icon: "✨", category: "Streaming" },          // Standard
};

export const TRANSPORT = {
  car: {
    label: "Bil (gennemsnit inkl. benzin, forsikring, afgift)",
    price: 3800,
    icon: "🚗",
    category: "Transport",
  },
};

export const UTILITIES = {
  internet: { label: "Internet", price: 299, icon: "📡", category: "Forsyning" },
  electricity: {
    label: "El",
    price_solo: 800,
    price_par: 1100,
    icon: "⚡",
    category: "Forsyning",
  },
  heating: {
    label: "Varme/vand",
    price_solo: 600,
    price_par: 900,
    icon: "🔥",
    category: "Forsyning",
  },
  mobile: {
    label: "Mobil",
    price_per_person: 199,
    icon: "📱",
    category: "Forsyning",
  },
  dr_licens: {
    label: "DR (medielicens)",
    price: 181,
    icon: "📺",
    category: "Forsyning",
  },
};

export const INSURANCE = {
  solo: { label: "Forsikring (indbo + ulykke)", price: 650 },
  par: { label: "Forsikring (indbo + ulykke + bil)", price: 1200 },
  family: { label: "Forsikring (familie)", price: 1600 },
};

export const UNION = {
  default: { label: "Fagforening + A-kasse", price: 550 },
};

export const FITNESS = {
  default: { label: "Fitness", price: 299 },
};

export const PET = {
  default: { label: "Kæledyr (foder, forsikring, dyrlæge)", price: 800 },
};

export const PUBLIC_TRANSPORT = {
  default: { label: "Offentlig transport", price: 600 },
};

export const HEALTH = {
  default: { label: "Sundhed (læge, tandlæge, medicin)", price: 350 },
};

export const HOMEOWNER_ASSOCIATION = {
  default: { label: "Grundejerforening / ejerforening", price: 1500 },
};

export const PROPERTY_TAX = {
  default: { label: "Ejendomsskat", price: 800 },
};

export const FOOD = {
  solo: 4500,
  par: 7500,
  per_child: 1200,
};

// Kommunale institution takster (landsgennemsnit DK 2026, kilde: KL/DST/kommunerne)
export const CHILDCARE = {
  age_0_2: { label: "Vuggestue (0-2 år)", price: 4500 },
  age_3_5: { label: "Børnehave (3-5 år)", price: 2600 },
  age_6_9: { label: "SFO (6-9 år)", price: 2300 },
  age_10_14: { label: "Fritidsklub (10-14 år)", price: 900 },
  age_15_plus: { label: "Ingen institutionsudgift (15+ år)", price: 0 },
};

// Børnepenge (børne- og ungeydelse) 2026, kilde: borger.dk / Skattestyrelsen
// Udbetales kvartalsvis, her omregnet til månedligt beløb
export const CHILD_BENEFIT = {
  age_0_2: { label: "Børnepenge (0-2 år)", monthly: 1532 },   // 4.596 kr/kvartal
  age_3_6: { label: "Børnepenge (3-6 år)", monthly: 1212 },   // 3.636 kr/kvartal
  age_7_14: { label: "Børnepenge (7-14 år)", monthly: 954 },   // 2.862 kr/kvartal
  age_15_17: { label: "Børnepenge (15-17 år)", monthly: 954 }, // 2.862 kr/kvartal
};

export function getChildBenefit(age: number): { label: string; monthly: number } {
  if (age <= 2) return CHILD_BENEFIT.age_0_2;
  if (age <= 6) return CHILD_BENEFIT.age_3_6;
  if (age <= 14) return CHILD_BENEFIT.age_7_14;
  if (age <= 17) return CHILD_BENEFIT.age_15_17;
  return { label: "Ingen børnepenge (18+ år)", monthly: 0 };
}

// Rentefradrag: skatteværdi af renteudgifter (2026)
// Efter 2012-reformens fulde indfasning (afsluttet 2019):
// Negativ nettokapitalindkomst giver fradrag svarende til ~25,6%
// (bundskat + kommuneskat, ekskl. AM-bidrag, ekskl. topskatteeffekt)
// Kilde: Skattestyrelsen / Ligningsloven § 11C stk. 2-3 (L28/2012)
export const TAX_DEDUCTION_RATE = 0.256;

// Gennemsnitlig månedlig boligydelse (ydelse + bidrag) pr. postnummer
// Beregnet ud fra typisk belåning (~70-80% af ejendomsværdi), blandet rente ~4%, 30 år
export const MORTGAGE_ESTIMATES: Record<string, number> = {
  default: 8500,
  // København/Frederiksberg (høje ejendomsværdier)
  "1000": 22000, "1100": 21000, "1200": 19500, "1300": 17500,
  "2000": 24000,  // Frederiksberg: ~7M × 80% belåning ≈ 24.000/md.
  "2100": 18500,  // Østerbro
  "2200": 14000,  // Nørrebro
  "2300": 13500,  // Amager
  "2400": 12800, "2500": 11800, "2600": 10800, "2700": 11500,
  "2800": 18500,  // Kgs. Lyngby
  "2900": 22000,  // Hellerup
  "3000": 10800,
  // Sjælland
  "4000": 11800, "4200": 6500, "4400": 5500, "4600": 9500,
  // Fyn
  "5000": 9500, "5200": 8200, "5700": 7000,
  // Jylland
  "6000": 8500, "6400": 6500, "6700": 7500, "6800": 5800,
  "7000": 7800, "7400": 7000, "7500": 6200,
  // Aarhus
  "8000": 14200, "8200": 12800, "8210": 10800, "8220": 8800,
  "8300": 10200, "8400": 7500, "8500": 5800, "8600": 9500,
  "8700": 8500, "8800": 7500, "8900": 7000,
  // Nordjylland
  "9000": 10200, "9200": 8800, "9400": 8200, "9700": 6200,
  "9800": 5500, "9900": 5200,
};

// Realistiske huslejer for privat lejemarked (kilde: Boligportalen/BoligZonen 2025, typisk 55-70m² solo, 75-95m² par)
export const RENT_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 8000, par: 11000 },
  // København indre by (1000-1799)
  "1000": { solo: 13500, par: 17000 }, "1100": { solo: 13000, par: 16500 },
  "1200": { solo: 12500, par: 16000 }, "1300": { solo: 12000, par: 15500 },
  "1500": { solo: 12000, par: 15000 }, // Vesterbro
  "1600": { solo: 11500, par: 14500 }, "1700": { solo: 11500, par: 14500 },
  // Frederiksberg
  "2000": { solo: 11500, par: 15000 },
  // København bydele
  "2100": { solo: 11000, par: 14500 },  // Østerbro
  "2200": { solo: 10000, par: 13000 },  // Nørrebro
  "2300": { solo: 9500, par: 12500 },   // Amager Øst
  "2400": { solo: 9000, par: 12000 },   // NV
  "2450": { solo: 9500, par: 12500 },   // Sydhavn
  "2500": { solo: 9000, par: 12000 },   // Valby
  "2600": { solo: 8000, par: 10500 },   // Glostrup
  "2605": { solo: 8000, par: 10500 },   // Brøndby
  "2610": { solo: 8000, par: 10500 },   // Rødovre
  "2620": { solo: 8500, par: 11000 },   // Albertslund
  "2625": { solo: 8000, par: 10500 },   // Vallensbæk
  "2630": { solo: 8000, par: 10500 },   // Taastrup
  "2650": { solo: 8500, par: 11000 },   // Hvidovre
  "2670": { solo: 8500, par: 11000 },   // Greve
  "2700": { solo: 9000, par: 12000 },   // Brønshøj
  "2720": { solo: 8500, par: 11000 },   // Vanløse
  "2730": { solo: 8500, par: 11000 },   // Herlev
  "2740": { solo: 8000, par: 10500 },   // Skovlunde
  "2750": { solo: 8500, par: 11000 },   // Ballerup
  "2800": { solo: 10500, par: 13500 },  // Kgs. Lyngby
  "2820": { solo: 10000, par: 13000 },  // Gentofte
  "2830": { solo: 9500, par: 12500 },   // Virum
  "2840": { solo: 10000, par: 13000 },  // Holte
  "2850": { solo: 9500, par: 12500 },   // Nærum
  "2860": { solo: 9000, par: 12000 },   // Søborg
  "2900": { solo: 12000, par: 15500 },  // Hellerup
  "2920": { solo: 10000, par: 13000 },  // Charlottenlund
  "2930": { solo: 8500, par: 11000 },   // Klampenborg
  "2950": { solo: 8500, par: 11000 },   // Vedbæk
  "2960": { solo: 8000, par: 10500 },   // Rungsted Kyst
  "2970": { solo: 8500, par: 11000 },   // Hørsholm
  "3000": { solo: 7500, par: 10000 },   // Helsingør
  "3400": { solo: 8000, par: 10500 },   // Hillerød
  "3460": { solo: 7500, par: 10000 },   // Birkerød
  "3500": { solo: 7000, par: 9500 },    // Værløse
  // Sjælland
  "4000": { solo: 8000, par: 10500 },   // Roskilde
  "4200": { solo: 6500, par: 8500 },    // Slagelse
  "4400": { solo: 6000, par: 8000 },    // Kalundborg
  "4600": { solo: 7500, par: 10000 },   // Køge
  "4700": { solo: 6500, par: 8500 },    // Næstved
  // Fyn
  "5000": { solo: 8000, par: 10500 },   // Odense C
  "5200": { solo: 7000, par: 9500 },    // Odense V
  "5700": { solo: 6500, par: 8500 },    // Svendborg
  // Jylland syd/midt
  "6000": { solo: 7500, par: 10000 },   // Kolding
  "6400": { solo: 6000, par: 8000 },    // Sønderborg
  "6700": { solo: 7000, par: 9500 },    // Esbjerg
  "6800": { solo: 6000, par: 8000 },    // Varde
  "7000": { solo: 7000, par: 9500 },    // Fredericia
  "7100": { solo: 7500, par: 10000 },   // Vejle
  "7400": { solo: 6500, par: 8500 },    // Herning
  "7500": { solo: 6000, par: 8000 },    // Holstebro
  // Aarhus
  "8000": { solo: 9500, par: 12500 },   // Aarhus C
  "8200": { solo: 9000, par: 12000 },   // Aarhus N
  "8210": { solo: 8000, par: 10500 },   // Aarhus V
  "8220": { solo: 7500, par: 10000 },   // Brabrand
  "8300": { solo: 7000, par: 9500 },    // Odder
  "8600": { solo: 7000, par: 9500 },    // Silkeborg
  "8700": { solo: 7500, par: 10000 },   // Horsens
  "8800": { solo: 7000, par: 9500 },    // Viborg
  "8900": { solo: 7000, par: 9500 },    // Randers
  // Nordjylland
  "9000": { solo: 7500, par: 10000 },   // Aalborg
  "9200": { solo: 7000, par: 9500 },    // Aalborg SV
  "9400": { solo: 6500, par: 8500 },    // Nørresundby
  "9700": { solo: 6000, par: 8000 },    // Brønderslev
  "9800": { solo: 5500, par: 7500 },    // Hjørring
  "9900": { solo: 5500, par: 7500 },    // Frederikshavn
};

// Andelsbolig-estimater (boligafgift) pr. region
// Andelsbolig boligafgift (kilde: ABF 2025, typisk 55-70m² solo, 75-90m² par)
export const ANDEL_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 6000, par: 8000 },
  "1000": { solo: 9000, par: 11500 }, "1100": { solo: 8500, par: 11000 },
  "1200": { solo: 8000, par: 10500 }, "1300": { solo: 7500, par: 10000 },
  "1500": { solo: 8000, par: 10000 }, // Vesterbro
  "2000": { solo: 8000, par: 10500 },  // Frederiksberg
  "2100": { solo: 7500, par: 10000 },  // Østerbro
  "2200": { solo: 6500, par: 8500 },   // Nørrebro
  "2300": { solo: 6000, par: 8000 },   // Amager
  "2400": { solo: 6000, par: 7500 },   // NV
  "2500": { solo: 6000, par: 7500 },   // Valby
  "2700": { solo: 6000, par: 7500 },   // Brønshøj
  "2800": { solo: 7000, par: 9000 },   // Kgs. Lyngby
  "2900": { solo: 8000, par: 10500 },  // Hellerup
  "5000": { solo: 5500, par: 7500 },   // Odense
  "8000": { solo: 6500, par: 8500 },   // Aarhus C
  "8200": { solo: 6000, par: 8000 },   // Aarhus N
  "9000": { solo: 5500, par: 7000 },   // Aalborg
};

// Gennemsnitlig boligværdi pr. postnummer (kilde: Boliga/Boligsiden Q3 2025, blanding lejlighed/hus)
// København/Frederiksberg: primært ejerlejligheder (~70-90m² × kvm-pris)
// Øvrige: primært huse (~120-140m² × kvm-pris)
export const PROPERTY_VALUE_ESTIMATES: Record<string, number> = {
  default: 2500000,
  // København (ejerlejligheder, ~75-85m², kvm 55.000-86.000)
  "1000": 6500000, "1100": 6200000, "1200": 5800000, "1300": 5200000,
  "2000": 7000000,  // Frederiksberg: 86.000 kr/m² × 80m²
  "2100": 5500000,  // Østerbro: ~68.000 × 80m²
  "2200": 4200000,  // Nørrebro: ~55.000 × 75m²
  "2300": 4000000,  // Amager: ~52.000 × 75m²
  "2400": 3800000,  // NV: ~50.000 × 75m²
  "2500": 3500000,  // Valby: ~46.000 × 75m²
  "2600": 3200000,  // Glostrup: huse ~30.000 × 110m²
  "2700": 3400000,  // Brønshøj: ~45.000 × 75m²
  "2800": 5500000,  // Kgs. Lyngby: huse ~42.000 × 130m²
  "2900": 6500000,  // Hellerup: ~55.000 × 120m²
  "3000": 3200000,  // Helsingør: huse ~25.000 × 130m²
  // Sjælland (huse, ~120-140m²)
  "4000": 3500000,  // Roskilde: ~28.000 × 125m²
  "4200": 1800000, "4400": 1500000, "4600": 2800000,
  // Fyn
  "5000": 2800000, "5200": 2400000, "5700": 2000000,
  // Jylland syd
  "6000": 2500000, "6400": 1800000, "6700": 2200000, "6800": 1600000,
  "7000": 2300000, "7400": 2000000, "7500": 1700000,
  // Aarhus (blanding)
  "8000": 4200000,  // Aarhus C: lejligheder ~48.000 × 85m²
  "8200": 3800000, "8210": 3200000, "8220": 2600000,
  "8300": 3000000, "8400": 2200000, "8500": 1600000, "8600": 2800000,
  "8700": 2500000, "8800": 2200000, "8900": 2000000,
  // Nordjylland
  "9000": 3000000,  // Aalborg: ~24.000 × 125m²
  "9200": 2600000, "9400": 2400000, "9700": 1700000,
  "9800": 1500000, "9900": 1400000,
};

export function getPropertyValueEstimate(postalCode: string): number {
  return PROPERTY_VALUE_ESTIMATES[postalCode] ?? PROPERTY_VALUE_ESTIMATES.default;
}

// Postnummer → by-navn (udvalgte)
export const POSTAL_NAMES: Record<string, string> = {
  "1000": "København K", "1100": "København K", "1200": "København K", "1300": "København K",
  "2000": "Frederiksberg", "2100": "København Ø", "2200": "København N", "2300": "København S",
  "2400": "København NV", "2500": "Valby", "2600": "Glostrup", "2700": "Brønshøj",
  "2800": "Kgs. Lyngby", "2900": "Hellerup", "3000": "Helsingør",
  "4000": "Roskilde", "4200": "Slagelse", "4400": "Kalundborg", "4600": "Køge",
  "5000": "Odense C", "5200": "Odense V", "5700": "Svendborg",
  "6000": "Kolding", "6400": "Sønderborg", "6700": "Esbjerg", "6800": "Varde",
  "7000": "Fredericia", "7400": "Herning", "7500": "Holstebro",
  "8000": "Aarhus C", "8200": "Aarhus N", "8210": "Aarhus V", "8220": "Brabrand",
  "8300": "Odder", "8400": "Ebeltoft", "8500": "Grenaa", "8600": "Silkeborg",
  "8700": "Horsens", "8800": "Viborg", "8900": "Randers",
  "9000": "Aalborg", "9200": "Aalborg SV", "9400": "Nørresundby", "9700": "Brønderslev",
  "9800": "Hjørring", "9900": "Frederikshavn",
};

export function getMortgageEstimate(postalCode: string): number {
  return MORTGAGE_ESTIMATES[postalCode] ?? MORTGAGE_ESTIMATES.default;
}

export function getRentEstimate(postalCode: string, isPar: boolean): number {
  // Try exact match first, then first-digit prefix, then default
  const entry = RENT_ESTIMATES[postalCode]
    ?? RENT_ESTIMATES[postalCode.substring(0, 1) + "000"]
    ?? RENT_ESTIMATES.default;
  return isPar ? entry.par : entry.solo;
}

export function getAndelEstimate(postalCode: string, isPar: boolean): number {
  const entry = ANDEL_ESTIMATES[postalCode]
    ?? ANDEL_ESTIMATES[postalCode.substring(0, 1) + "000"]
    ?? ANDEL_ESTIMATES.default;
  return isPar ? entry.par : entry.solo;
}

export function getPostalName(postalCode: string): string | null {
  return POSTAL_NAMES[postalCode] ?? null;
}

export function getEstimateSource(housingType: string): string {
  if (housingType === "ejer") return "Baseret på gennemsnitlig boligydelse for ejerboliger i området (kilde: Boligsiden/Finans Danmark 2025)";
  if (housingType === "andel") return "Baseret på gennemsnitlig boligafgift for andelsboliger i området (kilde: ABF 2025)";
  return "Baseret på gennemsnitlig husleje for lejeboliger i området (kilde: Danmarks Statistik 2025)";
}

export function getChildcarePrice(age: number): { label: string; price: number } {
  if (age <= 2) return CHILDCARE.age_0_2;
  if (age <= 5) return CHILDCARE.age_3_5;
  if (age <= 9) return CHILDCARE.age_6_9;
  if (age <= 14) return CHILDCARE.age_10_14;
  return CHILDCARE.age_15_plus;
}

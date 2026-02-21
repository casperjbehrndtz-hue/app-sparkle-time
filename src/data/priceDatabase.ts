// Kassen Prisdatabase – alle priser i DKK/md.
// Kilde: Officielle priser pr. februar 2026

export const SUBSCRIPTIONS = {
  netflix: { label: "Netflix", price: 149, icon: "🎬", category: "Streaming" },
  spotify: {
    label: "Spotify",
    price_solo: 99,
    price_par: 159,
    icon: "🎵",
    category: "Musik",
  },
  hbo: { label: "HBO Max", price: 109, icon: "🎭", category: "Streaming" },
  viaplay: { label: "Viaplay", price: 149, icon: "⚽", category: "Streaming" },
  appleTV: { label: "Apple TV+", price: 59, icon: "🍎", category: "Streaming" },
  amazonPrime: { label: "Amazon Prime", price: 59, icon: "📦", category: "Streaming" },
  disney: { label: "Disney+", price: 79, icon: "✨", category: "Streaming" },
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

export const FOOD = {
  solo: 4500,
  par: 7500,
  per_child: 1200,
};

// Kommunale institution takster (gennemsnit DK)
export const CHILDCARE = {
  age_0_2: { label: "Vuggestue (0-2 år)", price: 3800 },
  age_3_5: { label: "Børnehave (3-5 år)", price: 2600 },
  age_6_9: { label: "SFO (6-9 år)", price: 2100 },
  age_10_14: { label: "Fritidsklub (10-14 år)", price: 900 },
  age_15_plus: { label: "Ingen institutionsudgift (15+ år)", price: 0 },
};

// Gennemsnitlig boligudgift til eje pr. region
export const MORTGAGE_ESTIMATES: Record<string, number> = {
  default: 8500,
  "1000": 16000, "1100": 15500, "1200": 14500, "1300": 13000,
  "2000": 12000, "2100": 11500, "2200": 10500, "2300": 9500,
  "2400": 9000, "2500": 8500, "2600": 8000, "2700": 7800,
  "2800": 10000, "2900": 9200, "3000": 7500,
  "4000": 7000, "4200": 6800, "4400": 6500, "4600": 6200,
  "5000": 7500, "5200": 7000, "5700": 6500,
  "6000": 7200, "6400": 6800, "6700": 6500, "6800": 6000,
  "7000": 6800, "7400": 6500, "7500": 6200,
  "8000": 9500, "8200": 8800, "8210": 8500, "8220": 8200,
  "8300": 7800, "8400": 7200, "8500": 7000, "8600": 6800,
  "8700": 6500, "8800": 6200, "8900": 6000,
  "9000": 8000, "9200": 7500, "9400": 7000, "9700": 6500,
  "9800": 6200, "9900": 6000,
};

export const RENT_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 7000, par: 9500 },
  "1000": { solo: 11000, par: 14000 },
  "2000": { solo: 9000, par: 12000 },
  "5000": { solo: 7000, par: 9500 },
  "8000": { solo: 7500, par: 10000 },
  "9000": { solo: 6500, par: 8500 },
};

// Andelsbolig-estimater (boligafgift) pr. region
export const ANDEL_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 5500, par: 7000 },
  "1000": { solo: 8500, par: 10500 },
  "2000": { solo: 7000, par: 9000 },
  "5000": { solo: 5500, par: 7000 },
  "8000": { solo: 6000, par: 7500 },
  "9000": { solo: 5000, par: 6500 },
};

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
  const prefix = postalCode.substring(0, 1) + "000";
  const entry = RENT_ESTIMATES[prefix] ?? RENT_ESTIMATES.default;
  return isPar ? entry.par : entry.solo;
}

export function getAndelEstimate(postalCode: string, isPar: boolean): number {
  const prefix = postalCode.substring(0, 1) + "000";
  const entry = ANDEL_ESTIMATES[prefix] ?? ANDEL_ESTIMATES.default;
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

// NemtBudget Prisdatabase – alle priser i DKK/md.
// Kilde: Officielle priser pr. februar 2026

// Streaming priser – opdateret marts 2026 (officielle dk-priser)
export const SUBSCRIPTIONS = {
  netflix: { label: "Netflix", price: 139, icon: "tv", category: "Streaming" },      // Standard (HD)
  spotify: {
    label: "Spotify",
    price_solo: 109,   // Premium Individual
    price_par: 149,    // Premium Duo
    icon: "music",
    category: "Musik",
  },
  hbo: { label: "HBO Max", price: 99, icon: "clapperboard", category: "Streaming" },            // Standard
  viaplay: { label: "Viaplay", price: 179, icon: "play", category: "Streaming" },       // Total
  appleTV: { label: "Apple TV+", price: 69, icon: "tv", category: "Streaming" },
  amazonPrime: { label: "Amazon Prime", price: 109, icon: "package", category: "Streaming" }, // Prime Monthly
  disney: { label: "Disney+", price: 89, icon: "sparkles", category: "Streaming" },          // Standard
};

export const TRANSPORT = {
  car: {
    label: "Bil (gennemsnit inkl. benzin, forsikring, afgift)",
    price: 3800,
    icon: "car",
    category: "Transport",
  },
};

export const UTILITIES = {
  internet: { label: "Internet", price: 299, icon: "wifi", category: "Forsyning" },
  electricity: {
    label: "El",
    price_solo: 800,
    price_par: 1100,
    icon: "zap",
    category: "Forsyning",
  },
  heating: {
    label: "Varme/vand",
    price_solo: 600,
    price_par: 900,
    icon: "flame",
    category: "Forsyning",
  },
  mobile: {
    label: "Mobil",
    price_per_person: 199,
    icon: "smartphone",
    category: "Forsyning",
  },
  dr_licens: {
    label: "DR (medielicens)",
    price: 181,
    icon: "radio",
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

// Postnummer → by-navn (komplet dansk postnummerliste)
export const POSTAL_NAMES: Record<string, string> = {
  // København indre by (1000–1799)
  "1000": "København K", "1050": "København K", "1100": "København K", "1150": "København K",
  "1200": "København K", "1250": "København K", "1300": "København K", "1350": "København K",
  "1400": "København K", "1450": "København K", "1500": "København V", "1550": "København V",
  "1600": "København V", "1650": "København V", "1700": "København V", "1750": "København V",
  "1760": "København V", "1770": "København V", "1780": "København V", "1790": "København V",
  "1799": "København V", "1800": "Frederiksberg C", "1850": "Frederiksberg C",
  "1900": "Frederiksberg C", "1950": "Frederiksberg C",
  // Storkøbenhavn
  "2000": "Frederiksberg", "2100": "København Ø", "2150": "Nordhavn",
  "2200": "København N", "2300": "København S", "2400": "København NV",
  "2450": "København SV", "2500": "Valby", "2600": "Glostrup",
  "2605": "Brøndby", "2610": "Rødovre", "2620": "Albertslund",
  "2625": "Vallensbæk", "2630": "Taastrup", "2635": "Ishøj",
  "2640": "Hedehusene", "2650": "Hvidovre", "2660": "Brøndby Strand",
  "2665": "Vallensbæk Strand", "2670": "Greve", "2680": "Solrød Strand",
  "2690": "Karlslunde", "2700": "Brønshøj", "2720": "Vanløse",
  "2730": "Herlev", "2740": "Skovlunde", "2750": "Ballerup",
  "2760": "Måløv", "2765": "Smørum", "2770": "Kastrup",
  "2791": "Dragør", "2800": "Kgs. Lyngby", "2820": "Gentofte",
  "2830": "Virum", "2840": "Holte", "2850": "Nærum",
  "2860": "Søborg", "2870": "Dyssegård", "2880": "Bagsværd",
  "2900": "Hellerup", "2920": "Charlottenlund", "2930": "Klampenborg",
  "2942": "Skodsborg", "2950": "Vedbæk", "2960": "Rungsted Kyst",
  "2970": "Hørsholm", "2980": "Kokkedal", "2990": "Nivå",
  // Nordsjælland
  "3000": "Helsingør", "3050": "Humlebæk", "3060": "Espergærde",
  "3070": "Snekkersten", "3080": "Tikøb", "3100": "Hornbæk",
  "3120": "Dronningmølle", "3140": "Ålsgårde", "3150": "Hellebæk",
  "3200": "Helsinge", "3210": "Vejby", "3220": "Tisvildeleje",
  "3230": "Græsted", "3250": "Gilleleje", "3300": "Frederiksværk",
  "3310": "Ølsted", "3320": "Skævinge", "3330": "Gørløse",
  "3360": "Liseleje", "3370": "Melby", "3390": "Hundested",
  "3400": "Hillerød", "3450": "Allerød", "3460": "Birkerød",
  "3480": "Fredensborg", "3490": "Kvistgård", "3500": "Værløse",
  "3520": "Farum", "3540": "Lynge", "3550": "Slangerup",
  "3600": "Frederikssund", "3630": "Jægerspris", "3650": "Ølstykke",
  "3660": "Stenløse", "3670": "Veksø Sjælland",
  // Midt- og Sydsjælland
  "4000": "Roskilde", "4030": "Tune", "4040": "Jyllinge",
  "4050": "Skibby", "4060": "Kirke Såby", "4070": "Kirke Hyllinge",
  "4100": "Ringsted", "4130": "Viby Sjælland", "4140": "Borup",
  "4160": "Herlufmagle", "4171": "Glumsø", "4173": "Fjenneslev",
  "4174": "Jystrup", "4180": "Sorø", "4190": "Munke Bjergby",
  "4200": "Slagelse", "4220": "Korsør", "4230": "Skælskør",
  "4241": "Vemmelev", "4242": "Boeslunde", "4243": "Rude",
  "4250": "Fuglebjerg", "4261": "Dalmose", "4262": "Sandved",
  "4270": "Høng", "4281": "Gørlev", "4291": "Ruds Vedby",
  "4293": "Dianalund", "4295": "Stenlille", "4296": "Nyrup",
  "4300": "Holbæk", "4320": "Lejre", "4330": "Hvalsø",
  "4340": "Tølløse", "4350": "Ugerløse", "4360": "Kirke Eskilstrup",
  "4370": "Store Merløse", "4390": "Vipperød", "4400": "Kalundborg",
  "4420": "Regstrup", "4440": "Mørkøv", "4450": "Jyderup",
  "4460": "Snertinge", "4470": "Svebølle", "4480": "Store Fuglede",
  "4490": "Jerslev Sjælland", "4500": "Nykøbing Sj.",
  "4520": "Svinninge", "4532": "Gislinge", "4534": "Hørve",
  "4540": "Fårevejle", "4550": "Asnæs", "4560": "Vig",
  "4571": "Grevinge", "4572": "Nørre Asmindrup", "4573": "Højby",
  "4581": "Rørvig", "4583": "Sjællands Odde", "4591": "Føllenslev",
  "4592": "Sejerø", "4593": "Eskebjerg", "4600": "Køge",
  "4621": "Gadstrup", "4622": "Havdrup", "4623": "Lille Skensved",
  "4632": "Bjæverskov", "4640": "Faxe", "4652": "Hårlev",
  "4653": "Karise", "4654": "Faxe Ladeplads", "4660": "Store Heddinge",
  "4671": "Strøby", "4672": "Klippinge", "4673": "Rødvig Stevns",
  "4681": "Herfølge", "4682": "Tureby", "4683": "Rønnede",
  "4684": "Holmegaard", "4690": "Haslev", "4700": "Næstved",
  "4720": "Præstø", "4733": "Tappernøje", "4735": "Mern",
  "4736": "Karrebæksminde", "4750": "Lundby", "4760": "Vordingborg",
  "4771": "Kalvehave", "4772": "Langebæk", "4773": "Stensved",
  "4780": "Stege", "4791": "Borre", "4792": "Askeby",
  "4793": "Bogø By", "4800": "Nykøbing F.", "4840": "Nørre Alslev",
  "4850": "Stubbekøbing", "4862": "Guldborg", "4863": "Eskilstrup",
  "4871": "Horbelev", "4872": "Idestrup", "4873": "Væggerløse",
  "4874": "Gedser", "4880": "Nysted", "4891": "Toreby L.",
  "4892": "Kettinge", "4893": "Øster Ulslev", "4894": "Øster Ulslev",
  "4895": "Errindlev", "4900": "Nakskov", "4912": "Harpelunde",
  "4913": "Horslunde", "4920": "Søllested", "4930": "Maribo",
  "4941": "Bandholm", "4943": "Torrig L.", "4944": "Fejø",
  "4951": "Nørreballe", "4952": "Stokkemarke", "4953": "Vesterborg",
  "4960": "Holeby", "4970": "Rødby", "4983": "Dannemare",
  "4990": "Sakskøbing",
  // Fyn
  "5000": "Odense C", "5200": "Odense V", "5210": "Odense NV",
  "5220": "Odense SØ", "5230": "Odense M", "5240": "Odense NØ",
  "5250": "Odense SV", "5260": "Odense S", "5270": "Odense N",
  "5290": "Marslev", "5300": "Kerteminde", "5320": "Agedrup",
  "5330": "Munkebo", "5350": "Rynkeby", "5370": "Mesinge",
  "5380": "Dalby", "5390": "Martofte", "5400": "Bogense",
  "5450": "Otterup", "5462": "Morud", "5463": "Harndrup",
  "5464": "Brenderup Fyn", "5466": "Asperup", "5471": "Søndersø",
  "5474": "Veflinge", "5485": "Skamby", "5491": "Blommenslyst",
  "5492": "Vissenbjerg", "5500": "Middelfart", "5540": "Ullerslev",
  "5550": "Langeskov", "5560": "Aarup", "5580": "Nørre Aaby",
  "5591": "Gelsted", "5592": "Ejby", "5600": "Faaborg",
  "5610": "Assens", "5620": "Glamsbjerg", "5631": "Ebberup",
  "5642": "Millinge", "5672": "Broby", "5683": "Haarby",
  "5690": "Tommerup", "5700": "Svendborg", "5750": "Ringe",
  "5762": "Vester Skerninge", "5771": "Stenstrup", "5772": "Kværndrup",
  "5792": "Årslev", "5800": "Nyborg", "5853": "Ørbæk",
  "5854": "Gislev", "5856": "Ryslinge", "5863": "Ferritslev Fyn",
  "5871": "Frørup", "5874": "Hesselager", "5881": "Skårup Fyn",
  "5882": "Vejstrup", "5883": "Oure", "5884": "Gudme",
  "5892": "Gudbjerg Sydfyn", "5900": "Rudkøbing", "5932": "Humble",
  "5935": "Bagenkop", "5953": "Tranekær", "5960": "Marstal",
  "5970": "Ærøskøbing", "5985": "Søby Ærø",
  // Sønderjylland & Trekantområdet
  "6000": "Kolding", "6040": "Egtved", "6051": "Almind",
  "6052": "Viuf", "6064": "Jordrup", "6070": "Christiansfeld",
  "6091": "Bjert", "6092": "Sønder Stenderup", "6093": "Sjølund",
  "6094": "Hejls", "6100": "Haderslev", "6200": "Aabenraa",
  "6230": "Rødekro", "6240": "Løgumkloster", "6261": "Bredebro",
  "6270": "Tønder", "6280": "Højer", "6300": "Gråsten",
  "6310": "Broager", "6320": "Egernsund", "6330": "Padborg",
  "6340": "Kruså", "6360": "Tinglev", "6372": "Bylderup-Bov",
  "6392": "Bolderslev", "6400": "Sønderborg", "6430": "Nordborg",
  "6440": "Augustenborg", "6470": "Sydals", "6500": "Vojens",
  "6510": "Gram", "6520": "Toftlund", "6534": "Agerskov",
  "6535": "Branderup J.", "6541": "Bevtoft", "6560": "Sommersted",
  "6580": "Vamdrup", "6600": "Vejen", "6621": "Gesten",
  "6622": "Bække", "6623": "Vorbasse", "6630": "Rødding",
  "6640": "Lunderskov", "6650": "Brørup", "6660": "Lintrup",
  "6670": "Holsted", "6682": "Hovborg", "6683": "Føvling",
  "6690": "Gørding", "6700": "Esbjerg", "6705": "Esbjerg Ø",
  "6710": "Esbjerg V", "6715": "Esbjerg N", "6720": "Fanø",
  "6731": "Tjæreborg", "6740": "Bramming", "6752": "Glejbjerg",
  "6753": "Agerbæk", "6760": "Ribe", "6771": "Gredstedbro",
  "6780": "Skærbæk", "6792": "Rømø", "6800": "Varde",
  "6818": "Årre", "6823": "Ansager", "6830": "Nørre Nebel",
  "6840": "Oksbøl", "6851": "Janderup Vestj.", "6852": "Billum",
  "6853": "Vejers Strand", "6854": "Henne", "6855": "Outrup",
  "6857": "Blåvand", "6862": "Tistrup", "6870": "Ølgod",
  "6880": "Tarm", "6893": "Hemmet", "6900": "Skjern",
  "6920": "Videbæk", "6933": "Kibæk", "6940": "Lem St.",
  "6950": "Ringkøbing", "6960": "Hvide Sande", "6971": "Spjald",
  "6980": "Tim", "6990": "Ulfborg",
  // Østjylland & Trekantsområdet
  "7000": "Fredericia", "7007": "Fredericia", "7080": "Børkop",
  "7100": "Vejle", "7120": "Vejle Øst", "7130": "Juelsminde",
  "7140": "Stouby", "7150": "Barrit", "7160": "Tørring",
  "7171": "Uldum", "7173": "Vonge", "7182": "Bredsten",
  "7183": "Randbøl", "7184": "Vandel", "7190": "Billund",
  "7200": "Grindsted", "7250": "Hejnsvig", "7260": "Sønder Omme",
  "7270": "Stakroge", "7280": "Sønder Felding", "7300": "Jelling",
  "7321": "Gadbjerg", "7323": "Give", "7330": "Brande",
  "7361": "Ejstrupholm", "7362": "Hampen", "7400": "Herning",
  "7430": "Ikast", "7441": "Bording", "7442": "Engesvang",
  "7451": "Sunds", "7470": "Karup J.", "7480": "Vildbjerg",
  "7490": "Aulum", "7500": "Holstebro", "7540": "Haderup",
  "7550": "Sørvad", "7560": "Hjerm", "7570": "Vemb",
  "7600": "Struer", "7620": "Lemvig", "7650": "Bøvlingbjerg",
  "7660": "Bækmarksbro", "7673": "Harboøre", "7680": "Thyborøn",
  "7700": "Thisted", "7730": "Hanstholm", "7741": "Frøstrup",
  "7742": "Vesløs", "7752": "Snedsted", "7755": "Bedsted Thy",
  "7760": "Hurup Thy", "7770": "Vestervig", "7790": "Thyholm",
  // Aarhus-området
  "8000": "Aarhus C", "8200": "Aarhus N", "8210": "Aarhus V",
  "8220": "Brabrand", "8230": "Åbyhøj", "8240": "Risskov",
  "8245": "Risskov Ø", "8250": "Egå", "8260": "Viby J.",
  "8270": "Højbjerg", "8300": "Odder", "8305": "Samsø",
  "8310": "Tranbjerg J.", "8320": "Mårslet", "8330": "Beder",
  "8340": "Malling", "8350": "Hundslund", "8355": "Solbjerg",
  "8361": "Hasselager", "8362": "Hørning", "8370": "Hadsten",
  "8380": "Trige", "8381": "Tilst", "8382": "Hinnerup",
  "8400": "Ebeltoft", "8410": "Rønde", "8420": "Knebel",
  "8444": "Balle", "8450": "Hammel", "8462": "Harlev J.",
  "8464": "Galten", "8471": "Sabro", "8472": "Sporup",
  "8500": "Grenaa", "8520": "Lystrup", "8530": "Hjortshøj",
  "8541": "Skødstrup", "8543": "Hornslet", "8544": "Mørke",
  "8550": "Ryomgård", "8560": "Kolind", "8570": "Trustrup",
  "8581": "Nimtofte", "8585": "Glesborg", "8586": "Ørum Djurs",
  "8592": "Anholt", "8600": "Silkeborg", "8620": "Kjellerup",
  "8632": "Lemming", "8641": "Sorring", "8643": "Ans By",
  "8653": "Them", "8654": "Bryrup", "8660": "Skanderborg",
  "8670": "Låsby", "8680": "Ry", "8700": "Horsens",
  "8721": "Daugård", "8722": "Hedensted", "8723": "Løsning",
  "8732": "Hovedgård", "8740": "Brædstrup", "8751": "Gedved",
  "8752": "Østbirk", "8762": "Flemming", "8763": "Rask Mølle",
  "8765": "Klovborg", "8766": "Nørre Snede", "8800": "Viborg",
  "8830": "Tjele", "8831": "Løgstrup", "8832": "Skals",
  "8840": "Rødkærsbro", "8850": "Bjerringbro", "8860": "Ulstrup",
  "8870": "Langå", "8881": "Thorsø", "8882": "Fårvang",
  "8883": "Gjern", "8900": "Randers C", "8920": "Randers NV",
  "8930": "Randers NØ", "8940": "Randers SV", "8950": "Ørsted",
  "8960": "Randers SØ", "8961": "Allingåbro", "8963": "Auning",
  "8970": "Havndal", "8981": "Spentrup", "8983": "Gjerlev J.",
  "8990": "Fårup",
  // Nordjylland
  "9000": "Aalborg", "9200": "Aalborg SV", "9210": "Aalborg SØ",
  "9220": "Aalborg Øst", "9230": "Svenstrup J.", "9240": "Nibe",
  "9260": "Gistrup", "9270": "Klarup", "9280": "Storvorde",
  "9293": "Kongerslev", "9300": "Sæby", "9310": "Vodskov",
  "9320": "Hjallerup", "9330": "Dronninglund", "9340": "Asaa",
  "9352": "Dybvad", "9362": "Gandrup", "9370": "Hals",
  "9380": "Vestbjerg", "9381": "Sulsted", "9382": "Tylstrup",
  "9400": "Nørresundby", "9430": "Vadum", "9440": "Aabybro",
  "9460": "Brovst", "9480": "Løkken", "9490": "Pandrup",
  "9492": "Blokhus", "9493": "Saltum", "9500": "Hobro",
  "9510": "Arden", "9520": "Skørping", "9530": "Støvring",
  "9541": "Suldrup", "9550": "Mariager", "9560": "Hadsund",
  "9574": "Bælum", "9575": "Terndrup", "9600": "Aars",
  "9610": "Nørager", "9620": "Aalestrup", "9631": "Gedsted",
  "9632": "Møldrup", "9640": "Farsø", "9670": "Løgstør",
  "9681": "Ranum", "9690": "Fjerritslev", "9700": "Brønderslev",
  "9740": "Jerslev J.", "9750": "Østervrå", "9760": "Vrå",
  "9800": "Hjørring", "9830": "Tårs", "9850": "Hirtshals",
  "9870": "Sindal", "9881": "Bindslev", "9900": "Frederikshavn",
  "9940": "Læsø", "9970": "Strandby", "9981": "Jerup",
  "9982": "Ålbæk", "9990": "Skagen",
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

import { parseProfile } from "./profileSchema";
import { formatKr } from "./budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "./types";

/** Optional context the sharer adds — only what we can't derive from profile */
export interface ShareMeta {
  age?: number;       // e.g. 28
  job?: string;       // e.g. "Sygeplejerske" (max 30 chars)
  city?: string;      // e.g. "Aarhus" (max 20 chars)
  question?: string;  // e.g. "Kan jeg tillade mig at lease en bil?" (max 150 chars)
}

const EMPTY_META: ShareMeta = {};

// ── Version ──
const VERSION = "1";
const MAX_ENCODED_LENGTH = 4000; // reject suspiciously large payloads

// ── Key mappings: full field name ↔ 2-char compact key ──
const FIELD_TO_KEY: Record<string, string> = {
  householdType: "ht",
  income: "in",
  partnerIncome: "pi",
  housingType: "ho",
  hasMortgage: "hm",
  rentAmount: "ra",
  mortgageAmount: "ma",
  propertyValue: "pv",
  interestRate: "ir",
  hasChildren: "hc",
  childrenAges: "ca",
  hasCar: "cr",
  carAmount: "cm",
  carLoan: "cl",
  carFuel: "cf",
  carInsurance: "ci",
  carTax: "ct",
  carService: "cs",
  hasInternet: "hi",
  internetAmount: "ia",
  mobileAmount: "mb",
  electricityAmount: "el",
  heatingAmount: "he",
  drAmount: "dr",
  hasInsurance: "hs",
  insuranceAmount: "is",
  hasUnion: "hu",
  unionAmount: "un",
  hasFitness: "hf",
  fitnessAmount: "fi",
  hasPet: "hp",
  petAmount: "pe",
  hasLoan: "hl",
  loanAmount: "lo",
  hasSavings: "hv",
  savingsAmount: "sa",
  foodAmount: "fo",
  leisureAmount: "le",
  clothingAmount: "co",
  healthAmount: "hh",
  restaurantAmount: "re",
  additionalIncome: "ai",
  customExpenses: "cx",
};

const KEY_TO_FIELD: Record<string, string> = {};
for (const [field, key] of Object.entries(FIELD_TO_KEY)) {
  KEY_TO_FIELD[key] = field;
}

// ── Subscription bitmask ──
const SUB_FLAGS = [
  "hasNetflix",
  "hasSpotify",
  "hasHBO",
  "hasViaplay",
  "hasAppleTV",
  "hasDisney",
  "hasAmazonPrime",
] as const;

function packSubscriptions(profile: BudgetProfile): number {
  let mask = 0;
  SUB_FLAGS.forEach((flag, i) => {
    if (profile[flag]) mask |= 1 << i;
  });
  return mask;
}

function unpackSubscriptions(mask: number): Partial<BudgetProfile> {
  const result: Record<string, boolean> = {};
  SUB_FLAGS.forEach((flag, i) => {
    result[flag] = (mask & (1 << i)) !== 0;
  });
  return result as Partial<BudgetProfile>;
}

// ── Default values to omit (matches Zod schema defaults) ──
const DEFAULTS: Record<string, unknown> = {
  partnerIncome: 0,
  hasMortgage: false,
  rentAmount: 0,
  mortgageAmount: 0,
  propertyValue: 0,
  interestRate: 4.0,
  hasChildren: false,
  hasCar: false,
  carAmount: 0,
  carLoan: 0,
  carFuel: 0,
  carInsurance: 0,
  carTax: 0,
  carService: 0,
  hasInternet: true,
  hasInsurance: false,
  insuranceAmount: 0,
  hasUnion: false,
  unionAmount: 0,
  hasFitness: false,
  fitnessAmount: 0,
  hasPet: false,
  petAmount: 0,
  hasLoan: false,
  loanAmount: 0,
  hasSavings: false,
  savingsAmount: 0,
  foodAmount: 3500,
  leisureAmount: 1500,
  clothingAmount: 800,
  healthAmount: 350,
  restaurantAmount: 800,
};

// Fields that are always included (required enums + income)
const REQUIRED_FIELDS = new Set(["householdType", "income", "housingType"]);
// Fields handled separately (arrays, subscriptions)
const SPECIAL_FIELDS = new Set(["additionalIncome", "customExpenses", "childrenAges"]);

// ── Base64url helpers ──
function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Stream helpers ──
async function collectStream(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function pipeThrough(
  input: Uint8Array,
  transform: TransformStream<Uint8Array, Uint8Array>,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  writer.write(input);
  writer.close();
  return collectStream(transform.readable);
}

// ── Compression (DeflateRaw via CompressionStream) ──
async function compress(data: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(data);
  if (typeof CompressionStream === "undefined") return input;
  return pipeThrough(input, new CompressionStream("deflate-raw"));
}

async function decompress(data: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    return new TextDecoder().decode(data);
  }
  const bytes = await pipeThrough(data, new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(bytes);
}

// ── Compact array item ──
function compactArrayItem(item: { label: string; amount: number; frequency: string }) {
  return { l: item.label.slice(0, 20), a: item.amount, f: item.frequency };
}

function expandArrayItem(item: Record<string, unknown>) {
  return {
    label: (item.l as string) ?? "",
    amount: (item.a as number) ?? 0,
    frequency: (item.f as string) ?? "monthly",
  };
}

// ── Auto-derive context tags from profile ──
export function deriveProfileTags(
  profile: BudgetProfile,
  t: (key: string) => string,
): string[] {
  const tags: string[] = [];
  tags.push(profile.householdType === "par" ? t("share.tagCouple") : t("share.tagSolo"));
  if (profile.hasChildren && profile.childrenAges?.length) {
    const ages = profile.childrenAges.join(", ");
    tags.push(
      t("share.tagChildren")
        .replace("{count}", String(profile.childrenAges.length))
        .replace("{ages}", ages)
    );
  }
  const housingKey = { lejer: "share.tagRenter", ejer: "share.tagOwner", andel: "share.tagCoop" }[profile.housingType];
  if (housingKey) tags.push(t(housingKey));
  if (profile.hasCar) tags.push(t("share.tagCar"));
  if (profile.hasSavings && profile.savingsAmount > 0) tags.push(t("share.tagSaves"));
  return tags;
}

// ── Reddit-optimized text export ──
export function generateRedditText(
  profile: BudgetProfile,
  budget: ComputedBudget,
  meta: ShareMeta,
  t: (key: string) => string,
  currencyLocale: string,
): string {
  const parts: string[] = [];

  // Header with context
  const contextBits: string[] = [];
  if (meta.age) contextBits.push(String(meta.age));
  if (meta.city) contextBits.push(meta.city);
  if (meta.job) contextBits.push(meta.job);
  const ctx = contextBits.length ? ` (${contextBits.join(", ")})` : "";
  parts.push(`📊 ${t("share.textHeader")}${ctx}`);
  parts.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Income
  parts.push(`${t("cockpit.income")}:${" ".repeat(Math.max(1, 22 - t("cockpit.income").length))}${formatKr(budget.totalIncome, currencyLocale)}`);
  parts.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Fixed expenses (non-zero, sorted by amount)
  for (const expense of budget.fixedExpenses.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount)) {
    const label = expense.label;
    const pad = " ".repeat(Math.max(1, 22 - label.length));
    parts.push(`${label}:${pad}${formatKr(expense.amount, currencyLocale)}`);
  }

  parts.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Disposable
  const dispLabel = t("cockpit.disposable");
  const dispPad = " ".repeat(Math.max(1, 22 - dispLabel.length));
  const sign = budget.disposableIncome >= 0 ? "+" : "";
  parts.push(`${dispLabel}:${dispPad}${sign}${formatKr(budget.disposableIncome, currencyLocale)}`);
  parts.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Question
  if (meta.question) {
    parts.push("");
    parts.push(`💬 ${meta.question}`);
  }

  // Footer
  parts.push("");
  parts.push(`${t("share.textFooter")}`);

  return parts.join("\n");
}

// ── Encode ──
export async function encodeProfile(profile: BudgetProfile, meta?: ShareMeta): Promise<string> {
  const compact: Record<string, unknown> = {};

  // Required fields (always include)
  for (const field of REQUIRED_FIELDS) {
    compact[FIELD_TO_KEY[field]] = (profile as Record<string, unknown>)[field];
  }

  // Pack subscriptions as bitmask
  const subMask = packSubscriptions(profile);
  if (subMask > 0) compact["sb"] = subMask;

  // Optional scalar fields: only include if different from default
  for (const [field, key] of Object.entries(FIELD_TO_KEY)) {
    if (REQUIRED_FIELDS.has(field) || SPECIAL_FIELDS.has(field)) continue;

    const value = (profile as Record<string, unknown>)[field];
    const defaultVal = DEFAULTS[field];

    if (defaultVal !== undefined && value === defaultVal) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "number" && value === 0 && defaultVal === undefined) continue;

    compact[key] = value;
  }

  // Arrays: only include if non-empty
  if (profile.childrenAges?.length) {
    compact[FIELD_TO_KEY.childrenAges] = profile.childrenAges;
  }
  if (profile.additionalIncome?.length) {
    compact[FIELD_TO_KEY.additionalIncome] = profile.additionalIncome.map(compactArrayItem);
  }
  if (profile.customExpenses?.length) {
    compact[FIELD_TO_KEY.customExpenses] = profile.customExpenses.slice(0, 10).map(compactArrayItem);
  }

  // Meta: only include non-empty fields
  if (meta) {
    const m: Record<string, unknown> = {};
    if (meta.age && meta.age > 0 && meta.age < 120) m.a = meta.age;
    if (meta.job) m.j = meta.job.slice(0, 30);
    if (meta.city) m.c = meta.city.slice(0, 20);
    if (meta.question) m.q = meta.question.slice(0, 150);
    if (Object.keys(m).length > 0) compact["_m"] = m;
  }

  const json = JSON.stringify(compact);
  const compressed = await compress(json);
  return VERSION + toBase64url(compressed);
}

// ── Decode ──
export interface DecodeResult {
  profile: BudgetProfile;
  meta: ShareMeta;
}

export async function decodeProfile(encoded: string): Promise<DecodeResult | null> {
  try {
    if (!encoded || encoded[0] !== VERSION) return null;
    if (encoded.length > MAX_ENCODED_LENGTH) return null;

    const bytes = fromBase64url(encoded.slice(1));
    const json = await decompress(bytes);
    const compact = JSON.parse(json) as Record<string, unknown>;

    const expanded: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(compact)) {
      if (key === "sb" || key === "_m") continue;
      const field = KEY_TO_FIELD[key];
      if (!field) continue;

      if ((field === "additionalIncome" || field === "customExpenses") && Array.isArray(value)) {
        expanded[field] = value.map(expandArrayItem);
      } else {
        expanded[field] = value;
      }
    }

    // Unpack subscription bitmask
    if (typeof compact["sb"] === "number") {
      Object.assign(expanded, unpackSubscriptions(compact["sb"]));
    }

    const profile = parseProfile(expanded);
    if (!profile) return null;

    // Extract meta
    const meta: ShareMeta = { ...EMPTY_META };
    if (compact["_m"] && typeof compact["_m"] === "object") {
      const m = compact["_m"] as Record<string, unknown>;
      if (typeof m.a === "number") meta.age = m.a;
      if (typeof m.j === "string") meta.job = m.j;
      if (typeof m.c === "string") meta.city = m.c;
      if (typeof m.q === "string") meta.question = m.q;
    }

    return { profile, meta };
  } catch (e) {
    console.warn("[decodeProfile] Failed to decode shared budget:", e);
    return null;
  }
}

// ── Share URL helpers ──

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Create a short link via edge function, fallback to inline URL */
export async function generateShareUrl(profile: BudgetProfile, meta?: ShareMeta): Promise<string> {
  const encoded = await encodeProfile(profile, meta);
  const base = window.location.origin;

  // Try server-side short link
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/share-budget`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ payload: encoded }),
    });
    if (res.ok) {
      const { id } = await res.json();
      if (id) return `${base}/s/${id}`;
    }
  } catch {
    // Fallback to inline URL
  }

  return `${base}/?b=${encoded}`;
}

/** Resolve a short link ID to encoded payload */
export async function resolveShortLink(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/share-budget?id=${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) return null;
    const { payload } = await res.json();
    return typeof payload === "string" ? payload : null;
  } catch {
    return null;
  }
}

export function generateRedditUrl(shareUrl: string, question?: string): string {
  const title = encodeURIComponent("Vurder mit budget — lavet med NemtBudget");
  const questionLine = question ? `\n\n${question}` : "";
  const body = encodeURIComponent(
    `Her er mit budget visualiseret:\n${shareUrl}${questionLine}\n\nHvad tænker I? Feedback er velkomment!`
  );
  return `https://www.reddit.com/r/dkfinance/submit?type=TEXT&title=${title}&text=${body}`;
}

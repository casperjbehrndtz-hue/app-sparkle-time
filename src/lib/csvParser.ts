import type { BankStatementRaw, BankTransaction } from "./bankStatementTypes";
import { matchMerchant } from "./merchantDatabase";

// ─── Danish number parsing ──────────────────────────

function parseDanishNumber(val: string): number {
  if (!val) return 0;
  // Remove whitespace and non-breaking spaces
  let s = val.replace(/[\s\u00A0]/g, "").trim();
  // Remove currency markers
  s = s.replace(/kr\.?|DKK/gi, "").trim();

  // Detect format: Danish uses dot as thousands sep, comma as decimal
  // "1.234,56" → 1234.56
  // "-1.234,56" → -1234.56
  // "1234,56" → 1234.56
  // "1234.56" → 1234.56 (already standard)
  if (s.includes(",")) {
    // Danish format — dots are thousands, comma is decimal
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

// ─── Date parsing ───────────────────────────────────

function parseDate(val: string): string {
  const s = val.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    return `${m[3]}-${month}-${day}`;
  }

  // DD-MM-YY
  const m2 = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m2) {
    const year = parseInt(m2[3]) > 50 ? `19${m2[3]}` : `20${m2[3]}`;
    const day = m2[1].padStart(2, "0");
    const month = m2[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

// ─── Column detection ───────────────────────────────

interface ColumnMap {
  date: number;
  text: number;
  amount: number;
  balance: number | null;
}

const DATE_HEADERS = ["dato", "date", "bogført", "bogfoert", "valørdato", "posteringsdato", "transaktionsdato"];
const TEXT_HEADERS = ["tekst", "text", "beskrivelse", "description", "modtager", "afsender", "note", "forklaring", "meddelelse"];
const AMOUNT_HEADERS = ["beløb", "belob", "amount", "sum", "kr", "transaktion"];
const BALANCE_HEADERS = ["saldo", "balance", "beholdning"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-zæøå0-9]/g, "").trim();
}

function detectColumns(headers: string[]): ColumnMap | null {
  const normalized = headers.map(normalizeHeader);

  let date = -1;
  let text = -1;
  let amount = -1;
  let balance: number | null = null;

  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (date === -1 && DATE_HEADERS.some(d => h.includes(d))) date = i;
    else if (text === -1 && TEXT_HEADERS.some(t => h.includes(t))) text = i;
    else if (amount === -1 && AMOUNT_HEADERS.some(a => h.includes(a))) amount = i;
    else if (balance === null && BALANCE_HEADERS.some(b => h.includes(b))) balance = i;
  }

  // If we couldn't find all required columns, try positional fallback
  if (date === -1 || text === -1 || amount === -1) {
    // Common pattern: Date, Text, Amount, Balance (4 columns)
    if (headers.length >= 3) {
      // Check if first column looks like dates
      return null; // can't auto-detect, fail gracefully
    }
    return null;
  }

  return { date, text, amount, balance };
}

// ─── Delimiter detection ────────────────────────────

function detectDelimiter(content: string): string {
  const firstLines = content.split("\n").slice(0, 5).join("\n");

  // Count occurrences of common delimiters
  const semicolons = (firstLines.match(/;/g) || []).length;
  const commas = (firstLines.match(/,/g) || []).length;
  const tabs = (firstLines.match(/\t/g) || []).length;

  // Danish banks typically use semicolons
  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

// ─── Smart CSV line splitting (handles quoted fields) ─

function splitCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Main parser ────────────────────────────────────

export function parseCSV(content: string): BankStatementRaw | null {
  // Normalize line endings
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());

  if (lines.length < 2) return null; // need header + at least 1 row

  const delimiter = detectDelimiter(content);

  // Find the header row — skip metadata lines (common in Danish exports)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const fields = splitCSVLine(lines[i], delimiter);
    const cols = detectColumns(fields);
    if (cols) {
      headerIdx = i;
      break;
    }
    // If we're past 10 lines without finding headers, bail
    if (i === Math.min(9, lines.length - 1)) return null;
  }

  const headers = splitCSVLine(lines[headerIdx], delimiter);
  const cols = detectColumns(headers);
  if (!cols) return null;

  const transaktioner: BankTransaction[] = [];
  let firstBalance: number | null = null;
  let lastBalance: number | null = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = splitCSVLine(lines[i], delimiter);
    if (fields.length <= Math.max(cols.date, cols.text, cols.amount)) continue;

    const dato = parseDate(fields[cols.date]);
    const tekst = fields[cols.text]?.replace(/^["']|["']$/g, "").trim() || "";
    const beløb = parseDanishNumber(fields[cols.amount]);

    if (!dato && !tekst) continue; // skip empty rows
    if (beløb === 0 && !tekst) continue;

    // Track balance for period detection
    if (cols.balance !== null && fields[cols.balance]) {
      const bal = parseDanishNumber(fields[cols.balance]);
      if (bal !== 0) {
        if (firstBalance === null) firstBalance = bal - beløb; // opening = first balance minus first transaction
        lastBalance = bal;
      }
    }

    // Categorize via merchant database
    let kategori = "Andet";
    let merchantName: string | undefined;
    const match = matchMerchant(tekst);
    if (match) {
      kategori = match.kategori;
      merchantName = match.cleanName;
    } else if (beløb > 0 && beløb > 5000) {
      kategori = "Løn"; // large deposits are likely salary
    } else if (beløb > 0) {
      kategori = "Overførsel";
    }

    transaktioner.push({
      dato,
      tekst,
      beløb,
      kategori,
      erAbonnement: false, // CSV can't detect this — analyzer will find recurring charges later
      merchantName,
    });
  }

  if (transaktioner.length === 0) return null;

  // Detect period from transaction dates
  const dates = transaktioner.map(t => t.dato).filter(Boolean).sort();
  const periodeStart = dates[0] || null;
  const periodeSlut = dates[dates.length - 1] || null;

  const warnings: string[] = [];

  // Balance validation
  if (firstBalance !== null && lastBalance !== null) {
    const sumTx = transaktioner.reduce((s, t) => s + t.beløb, 0);
    const expected = firstBalance + sumTx;
    const diff = Math.abs(expected - lastBalance);
    if (diff > 100) {
      warnings.push(
        `Saldo-tjek: Beregnet slutsaldo (${Math.round(expected).toLocaleString("da-DK")} kr) afviger fra den viste (${Math.round(lastBalance).toLocaleString("da-DK")} kr).`
      );
    }
  }

  return {
    transaktioner,
    periodeStart,
    periodeSlut,
    startSaldo: firstBalance,
    slutSaldo: lastBalance,
    kontoNavn: null,
    bankNavn: null,
    confidence: warnings.length > 0 ? "medium" : "high",
    warnings,
    truncated: false,
  };
}

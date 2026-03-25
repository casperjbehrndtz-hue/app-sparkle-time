/**
 * Shared regex patterns for detecting sensitive personal data
 * in Danish payslips and financial documents.
 *
 * Used by both cprRedact.ts (image OCR) and pdfToImage.ts (PDF text extraction).
 */

// Danish CPR: DDMMYY-XXXX with valid day (01-31) and month (01-12)
export const CPR_RE = /(?<!\d)((?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2})[\s\-\.\/]?(\d{4})(?!\d)/;

// Bank account: reg.nr (4 digits) + separator + account (6-10 digits)
export const ACCOUNT_RE = /(?<!\d)\d{4}[\s\-\.]\d{6,10}(?!\d)/;

// Danish postal code: 4 digits + space + capitalized city name
export const POSTAL_RE = /(?<!\d)\d{4}\s+[A-ZÆØÅ]/;

// Labels that mark sensitive fields (case-insensitive)
export const SENSITIVE_LABELS = /\b(CPR|Lønnr|Lønr|Medarb\.?nr|NemKonto|Lønkonto|Bankkonto|Konto\s*nr|SE[\-\s]?nr|SE[\-\s]?nummer|Personnr|Personale\s*nr)\b/i;

// Labels that indicate the line contains ONLY financial data (safe to keep)
export const SAFE_LABELS = /\b(Månedsløn|Bruttoløn|Nettoløn|A-skat|AM-bidrag|ATP|Pension|Feriepenge|Fradrag|Skat|Indkomst|Disposition|Supplerende|periode|Side\s*:?\s*\d|Firmabidrag|solidarisk|helbreds|År til dato|Ferie)/i;

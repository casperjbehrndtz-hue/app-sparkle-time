import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  archivePayslip,
  getArchive,
  deleteFromArchive,
  clearArchive,
  normalizePeriod,
  type ArchivedPayslip,
} from "./payslipArchive";
import type { ExtractedPayslip } from "./payslipTypes";

// ── Mock localStorage ──
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

function makePayslip(overrides: Partial<ExtractedPayslip> = {}): ExtractedPayslip {
  return {
    bruttolon: 35000,
    nettolon: 22000,
    amBidrag: 2680,
    aSkat: 7800,
    atp: 99,
    pensionEmployee: 1400,
    pensionEmployer: 2800,
    traekkort: 37,
    personfradrag: 4508,
    grundlon: null,
    payComponents: [],
    otherDeductions: [],
    receiptLines: [],
    anonDescription: "Lønmodtager",
    confidence: "high",
    warnings: [],
    payPeriod: "2026-03",
    ...overrides,
  };
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
});

describe("getArchive", () => {
  it("returns empty array when nothing is stored", () => {
    expect(getArchive()).toEqual([]);
  });

  it("returns empty array when stored data is invalid JSON", () => {
    store["nemtbudget_payslip_archive"] = "not json";
    expect(getArchive()).toEqual([]);
  });

  it("returns empty array when stored data is not an array", () => {
    store["nemtbudget_payslip_archive"] = '{"foo": "bar"}';
    expect(getArchive()).toEqual([]);
  });
});

describe("archivePayslip", () => {
  it("stores a payslip correctly", () => {
    const payslip = makePayslip();
    const entry = archivePayslip(payslip);

    expect(entry.bruttolon).toBe(35000);
    expect(entry.nettolon).toBe(22000);
    expect(entry.period).toBe("2026-03");
    expect(entry.id).toContain("ps_2026-03_");

    const archive = getArchive();
    expect(archive).toHaveLength(1);
    expect(archive[0].bruttolon).toBe(35000);
  });

  it("replaces existing entry for the same period", () => {
    archivePayslip(makePayslip({ payPeriod: "2026-03", bruttolon: 30000 }));
    archivePayslip(makePayslip({ payPeriod: "2026-03", bruttolon: 35000 }));

    const archive = getArchive();
    expect(archive).toHaveLength(1);
    expect(archive[0].bruttolon).toBe(35000);
  });

  it("stores multiple entries for different periods", () => {
    archivePayslip(makePayslip({ payPeriod: "2026-01" }));
    archivePayslip(makePayslip({ payPeriod: "2026-02" }));
    archivePayslip(makePayslip({ payPeriod: "2026-03" }));

    const archive = getArchive();
    expect(archive).toHaveLength(3);
  });

  it("enforces max 24 entries", () => {
    // Archive 26 different months
    for (let i = 1; i <= 26; i++) {
      const month = String(i <= 12 ? i : i - 12).padStart(2, "0");
      const year = i <= 12 ? "2024" : "2025";
      archivePayslip(makePayslip({ payPeriod: `${year}-${month}` }));
    }

    const archive = getArchive();
    expect(archive.length).toBeLessThanOrEqual(24);
  });

  it("sorts entries by period descending", () => {
    archivePayslip(makePayslip({ payPeriod: "2026-01" }));
    archivePayslip(makePayslip({ payPeriod: "2026-03" }));
    archivePayslip(makePayslip({ payPeriod: "2026-02" }));

    const archive = getArchive();
    expect(archive[0].period).toBe("2026-03");
    expect(archive[1].period).toBe("2026-02");
    expect(archive[2].period).toBe("2026-01");
  });
});

describe("deleteFromArchive", () => {
  it("removes the correct entry by id", () => {
    const entry1 = archivePayslip(makePayslip({ payPeriod: "2026-01" }));
    const entry2 = archivePayslip(makePayslip({ payPeriod: "2026-02" }));

    deleteFromArchive(entry1.id);

    const archive = getArchive();
    expect(archive).toHaveLength(1);
    expect(archive[0].period).toBe("2026-02");
  });

  it("does nothing when id does not exist", () => {
    archivePayslip(makePayslip({ payPeriod: "2026-01" }));
    deleteFromArchive("nonexistent_id");

    const archive = getArchive();
    expect(archive).toHaveLength(1);
  });
});

describe("clearArchive", () => {
  it("removes all entries", () => {
    archivePayslip(makePayslip({ payPeriod: "2026-01" }));
    archivePayslip(makePayslip({ payPeriod: "2026-02" }));

    clearArchive();
    expect(getArchive()).toEqual([]);
  });
});

describe("normalizePeriod", () => {
  it("handles 'marts 2026' (Danish month name)", () => {
    expect(normalizePeriod("marts 2026")).toBe("2026-03");
  });

  it("handles '03/2026' format", () => {
    expect(normalizePeriod("03/2026")).toBe("2026-03");
  });

  it("handles '2026-03' ISO format", () => {
    expect(normalizePeriod("2026-03")).toBe("2026-03");
  });

  it("handles 'januar 2025'", () => {
    expect(normalizePeriod("januar 2025")).toBe("2025-01");
  });

  it("handles 'december 2025'", () => {
    expect(normalizePeriod("december 2025")).toBe("2025-12");
  });

  it("handles '3/2026' (single-digit month)", () => {
    expect(normalizePeriod("3/2026")).toBe("2026-03");
  });

  it("handles 'MM-YYYY' format with dash", () => {
    expect(normalizePeriod("03-2026")).toBe("2026-03");
  });

  it("falls back to current YYYY-MM when input is undefined", () => {
    const result = normalizePeriod();
    // Should be in YYYY-MM format
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("falls back to current YYYY-MM for unrecognized input", () => {
    const result = normalizePeriod("something weird");
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

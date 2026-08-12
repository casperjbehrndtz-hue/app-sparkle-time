// Donor mode — honor-system unlock after voluntary MobilePay donation (29 kr+).
// Not a paywall. NemtBudget is a hobby project; gated features are objectively
// available, donor-mode is a thank-you to supporters. localStorage-backed only.

const DONOR_KEY = "nb_donor_mode";
const DONOR_SINCE_KEY = "nb_donor_since";

export const DONOR_MIN_AMOUNT = 29;
export const DONOR_MOBILEPAY_BOX = "4266mc";
export const DONOR_MOBILEPAY_URL = `https://mobilepay.dk/box/${DONOR_MOBILEPAY_BOX}`;

export function isDonor(): boolean {
  try {
    return localStorage.getItem(DONOR_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDonor(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(DONOR_KEY, "1");
      if (!localStorage.getItem(DONOR_SINCE_KEY)) {
        localStorage.setItem(DONOR_SINCE_KEY, new Date().toISOString());
      }
    } else {
      localStorage.removeItem(DONOR_KEY);
      localStorage.removeItem(DONOR_SINCE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function donorSince(): string | null {
  try {
    return localStorage.getItem(DONOR_SINCE_KEY);
  } catch {
    return null;
  }
}

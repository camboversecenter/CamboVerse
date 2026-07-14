/**
 * Geo-aware fulfillment — the core of the CamboVerse digital economy (see
 * DIGITAL_ECONOMY.md). A visitor's country decides which merchant fulfils the
 * order, how they pay, and who delivers — so virtual tourism becomes real,
 * region-local commerce. Pure data, shared by the client UI and the Worker.
 */
export interface Fulfillment {
  country: string; // ISO-3166 alpha-2, uppercased
  countryName: string;
  flag: string;
  /** Region-appropriate payment rail. */
  payMethod: string;
  delivery: string;
}

const REGIONS: Record<string, Omit<Fulfillment, "country">> = {
  KH: { countryName: "Cambodia", flag: "🇰🇭", payMethod: "KHQR · Bakong", delivery: "Nham24 / Grab" },
  US: { countryName: "United States", flag: "🇺🇸", payMethod: "Card · Stripe", delivery: "DoorDash / Uber Eats" },
  GB: { countryName: "United Kingdom", flag: "🇬🇧", payMethod: "Card · Stripe", delivery: "Deliveroo" },
  FR: { countryName: "France", flag: "🇫🇷", payMethod: "Card · Stripe", delivery: "Uber Eats" },
  JP: { countryName: "Japan", flag: "🇯🇵", payMethod: "Card · Stripe", delivery: "Demae-can" },
  SG: { countryName: "Singapore", flag: "🇸🇬", payMethod: "PayNow · Stripe", delivery: "GrabFood" },
  AU: { countryName: "Australia", flag: "🇦🇺", payMethod: "Card · Stripe", delivery: "Uber Eats" },
};

const DEFAULT: Omit<Fulfillment, "country"> = {
  countryName: "your region",
  flag: "🌐",
  payMethod: "Card · Stripe",
  delivery: "Local courier",
};

/** Countries offered in the demo "viewing as" switcher. */
export const DEMO_COUNTRIES = ["KH", "US", "GB", "FR", "JP", "SG", "AU"];

export function fulfillmentFor(country?: string | null): Fulfillment {
  const cc = (country || "").toUpperCase();
  return { country: cc || "??", ...(REGIONS[cc] ?? DEFAULT) };
}

export function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const SLOT_LABELS = {
  back_cover: "Back cover",
  inside_front_cover: "Inside front cover",
  inside_back_cover: "Inside back cover",
  full: "Full page",
  half: "Half page",
  quarter: "Quarter page",
} as const;

export type Slot = keyof typeof SLOT_LABELS;
export const SLOTS = Object.keys(SLOT_LABELS) as Slot[];

export const BOOKING_STATUS_LABELS = {
  lead: "Lead",
  contacted: "Contacted",
  confirmed: "Confirmed",
  artwork_received: "Artwork received",
  artwork_approved: "Artwork approved",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS_LABELS;

export const PAYMENT_METHODS = ["Cash", "UPI", "Cheque", "Bank transfer"] as const;

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Indian-style amount in words, for invoices ("Five Thousand Rupees Only"). */
export function inrInWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`);
  const three = (x: number) => (x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}` : two(x));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return `${parts.join(" ")} Rupees Only`;
}

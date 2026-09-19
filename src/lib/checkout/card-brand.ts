export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

/** BIN-prefix detection for common schemes. */
export function detectCardBrand(raw: string): CardBrand {
  const n = raw.replace(/\D/g, "");
  if (!n) return "unknown";
  if (/^3[47]/.test(n)) return "amex";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "mastercard";
  if (/^(6011|65|64[4-9]|622)/.test(n)) return "discover";
  return "unknown";
}

export function formatCardNumber(raw: string, brand: CardBrand) {
  const digits = raw.replace(/\D/g, "").slice(0, brand === "amex" ? 15 : 16);
  if (brand === "amex") {
    const a = digits.slice(0, 4);
    const b = digits.slice(4, 10);
    const c = digits.slice(10, 15);
    return [a, b, c].filter(Boolean).join(" ");
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function cvcLength(brand: CardBrand) {
  return brand === "amex" ? 4 : 3;
}

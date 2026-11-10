// ============================================================
// DandoEv — Nigerian phone number helpers (shared by auth routes)
// All numbers are stored in canonical E.164 form: +234XXXXXXXXXX
// ============================================================

/**
 * Normalises a Nigerian phone number to E.164 (+234XXXXXXXXXX).
 * Accepts: 08031234567, 8031234567, 2348031234567, +234 803 123 4567,
 * 0803-123-4567, 00234 803 123 4567.
 * Returns null when the input is not a valid Nigerian mobile number.
 */
export function normalizeNigerianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const str = String(input).trim();
  if (/[a-zA-Z]/.test(str)) return null;
  let digits = str.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);

  let national: string;
  if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;

  // Nigerian mobile numbers: 10 digits after the country code, starting 7, 8 or 9.
  if (!/^[789]\d{9}$/.test(national)) return null;
  return `+234${national}`;
}

/** True when the string looks like an email address (contains "@"). */
export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes("@");
}

/**
 * Phone-only accounts still need a unique email for Supabase Auth.
 * This deterministic, non-routable address is never shown to the customer.
 */
export const PHONE_PLACEHOLDER_DOMAIN = "phone.dandoev.app";

export function phoneToPlaceholderEmail(e164Phone: string): string {
  return `${e164Phone.replace(/\D/g, "")}@${PHONE_PLACEHOLDER_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${PHONE_PLACEHOLDER_DOMAIN}`));
}

/** Every stored form a given phone might exist in (legacy records were free-text). */
export function phoneLookupVariants(input: string): string[] {
  const normalized = normalizeNigerianPhone(input);
  const raw = String(input || "").trim();
  const set = new Set<string>();
  if (raw) set.add(raw);
  if (normalized) {
    const national = normalized.replace(/^\+234/, "");
    set.add(normalized);
    set.add(`234${national}`);
    set.add(`0${national}`);
    set.add(national);
    set.add(`+234 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`);
    set.add(`0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`);
  }
  return Array.from(set);
}

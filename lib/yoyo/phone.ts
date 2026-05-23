/**
 * Yoyo expects mobileNumber in international format: digits only, no + or spaces.
 * Example: 27790415295 (+27 79 041 5295)
 * @see https://developer.yoyogroup.com — error 7018 Invalid mobile number
 */

/** South Africa mobile: 27 + 9 digits, leading mobile digit 6–8 */
const SA_MOBILE_REGEX = /^27[6-8]\d{8}$/;

export function formatYoyoMobileNumber(
  raw: string | null | undefined
): string | undefined {
  if (!raw?.trim()) return undefined;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // +27… or 0xx… (local SA)
  if (digits.startsWith("27") && digits.length >= 11) {
    digits = digits.slice(0, 11);
  } else if (digits.startsWith("0") && digits.length >= 10) {
    digits = `27${digits.slice(1, 10)}`;
  } else if (digits.length === 9 && /^[6-8]/.test(digits)) {
    digits = `27${digits}`;
  }

  if (!SA_MOBILE_REGEX.test(digits)) {
    return undefined;
  }

  return digits;
}

export function isValidYoyoMobileNumber(raw: string | null | undefined): boolean {
  return formatYoyoMobileNumber(raw) !== undefined;
}

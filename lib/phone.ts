/**
 * General E.164 phone formatting for auth and profiles.
 * Default country code: 27 (South Africa).
 */

const DEFAULT_COUNTRY_CODE = "27";

/** Minimum digits after country code for a valid mobile number */
const MIN_NATIONAL_LENGTH = 9;
const MAX_NATIONAL_LENGTH = 10;

export function formatE164(
  raw: string | null | undefined,
  defaultCountry: string = DEFAULT_COUNTRY_CODE
): string | undefined {
  if (!raw?.trim()) return undefined;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const country = defaultCountry.replace(/\D/g, "") || DEFAULT_COUNTRY_CODE;

  if (digits.startsWith(country) && digits.length >= country.length + MIN_NATIONAL_LENGTH) {
    digits = digits.slice(0, country.length + MAX_NATIONAL_LENGTH);
  } else if (digits.startsWith("0") && digits.length >= 10) {
    digits = `${country}${digits.slice(1, 1 + MAX_NATIONAL_LENGTH)}`;
  } else if (
    digits.length >= MIN_NATIONAL_LENGTH &&
    digits.length <= MAX_NATIONAL_LENGTH &&
    !digits.startsWith(country)
  ) {
    digits = `${country}${digits}`;
  }

  const nationalPart = digits.startsWith(country)
    ? digits.slice(country.length)
    : digits;

  if (
    nationalPart.length < MIN_NATIONAL_LENGTH ||
    nationalPart.length > MAX_NATIONAL_LENGTH
  ) {
    return undefined;
  }

  return `+${country}${nationalPart}`;
}

export function isValidPhone(
  raw: string | null | undefined,
  defaultCountry?: string
): boolean {
  return formatE164(raw, defaultCountry) !== undefined;
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  defaultCountry?: string
): boolean {
  const fa = formatE164(a, defaultCountry);
  const fb = formatE164(b, defaultCountry);
  if (!fa || !fb) return false;
  return fa === fb;
}

export function profileHasPhone(phone: string | null | undefined): boolean {
  return Boolean(phone?.trim());
}

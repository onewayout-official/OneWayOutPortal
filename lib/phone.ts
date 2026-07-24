/**
 * Phone formatting and validation (E.164).
 * International numbers (+...) are accepted globally.
 * Local 0-prefix numbers default to South Africa (27) for backward compatibility.
 */

const DEFAULT_COUNTRY_CODE = "27";
const SA_MIN_NATIONAL_LENGTH = 9;
const SA_MAX_NATIONAL_LENGTH = 10;
const E164_MIN_DIGITS = 7;
const E164_MAX_DIGITS = 15;

export const PHONE_VALIDATION_HINT =
  "Please enter a valid mobile number in international format (e.g. +1 555 000 0000).";

export const PHONE_INPUT_PLACEHOLDER = "+1 555 000 0000";

export function formatE164(
  raw: string | null | undefined,
  defaultCountry: string = DEFAULT_COUNTRY_CODE
): string | undefined {
  if (!raw?.trim()) return undefined;

  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  const isInternational = trimmed.startsWith("+") || digits.startsWith("00");

  if (isInternational) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }
    if (digits.length < E164_MIN_DIGITS || digits.length > E164_MAX_DIGITS) {
      return undefined;
    }
    return `+${digits}`;
  }

  const country = defaultCountry.replace(/\D/g, "") || DEFAULT_COUNTRY_CODE;

  if (digits.startsWith(country) && digits.length >= country.length + SA_MIN_NATIONAL_LENGTH) {
    digits = digits.slice(0, country.length + SA_MAX_NATIONAL_LENGTH);
  } else if (digits.startsWith("0") && digits.length >= 10) {
    digits = `${country}${digits.slice(1, 1 + SA_MAX_NATIONAL_LENGTH)}`;
  } else if (
    digits.length >= SA_MIN_NATIONAL_LENGTH &&
    digits.length <= SA_MAX_NATIONAL_LENGTH &&
    !digits.startsWith(country)
  ) {
    digits = `${country}${digits}`;
  } else {
    return undefined;
  }

  const nationalPart = digits.startsWith(country)
    ? digits.slice(country.length)
    : digits;

  if (
    nationalPart.length < SA_MIN_NATIONAL_LENGTH ||
    nationalPart.length > SA_MAX_NATIONAL_LENGTH
  ) {
    return undefined;
  }

  return `+${digits}`;
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

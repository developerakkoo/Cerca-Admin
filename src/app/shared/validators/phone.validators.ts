export function normalizePhoneDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export type SanitizePhoneOptions = { allowLeadingPlus?: boolean };

/**
 * For live input: digits only, or optional single leading + then digits (intl).
 */
export function sanitizePhoneInput(
  value: unknown,
  options: SanitizePhoneOptions = {}
): string {
  const raw = String(value ?? '');
  if (options.allowLeadingPlus && raw.trim().startsWith('+')) {
    const rest = raw.replace(/^\s*\+/, '').replace(/\D/g, '');
    return rest ? `+${rest}` : '+';
  }
  return normalizePhoneDigits(value);
}

export function isDigitsOnlyPhone(value: unknown): boolean {
  const phone = String(value ?? '').trim();
  return phone.length > 0 ? /^\d+$/.test(phone) : true;
}

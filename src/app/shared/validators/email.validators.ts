export const EMAIL_MAX_LENGTH = 254;

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(value: unknown): boolean {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && BASIC_EMAIL_REGEX.test(email);
}

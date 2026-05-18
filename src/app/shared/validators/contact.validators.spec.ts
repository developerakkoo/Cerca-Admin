import { EMAIL_MAX_LENGTH, isValidEmail } from './email.validators';
import { isDigitsOnlyPhone, normalizePhoneDigits } from './phone.validators';

describe('contact validators', () => {
  const buildEmail = (len: number) => `${'a'.repeat(len - '@x.io'.length)}@x.io`;

  it('accepts 253 and 254 email lengths, rejects 255', () => {
    expect(isValidEmail(buildEmail(253))).toBeTrue();
    expect(isValidEmail(buildEmail(EMAIL_MAX_LENGTH))).toBeTrue();
    expect(isValidEmail(buildEmail(255))).toBeFalse();
  });

  it('normalizes and validates digits-only phone values', () => {
    expect(normalizePhoneDigits('+91 98-76ab')).toBe('919876');
    expect(isDigitsOnlyPhone('987654')).toBeTrue();
    expect(isDigitsOnlyPhone('98a765')).toBeFalse();
  });
});

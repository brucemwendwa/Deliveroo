// §12 — the client-side checks for the sign-in form. They exist to catch a typo
// before it costs a round trip; the server stays the authority on everything.
//
// Deliberately *not* here: any check that would tell an anonymous visitor whether
// an account exists. requestOtp answers the same way for a known and an unknown
// address, and nothing in this file may narrow that down (§7 enumeration).

/** Permissive on purpose: the mail server, not a regex, decides what is deliverable. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Kenyan mobiles are 9 digits after the country code; allow 7–15 for the rest. */
const PHONE_DIGITS = /^\d{7,15}$/;

export const digitsOf = (value) => value.replace(/\D/g, '');

export function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL.test(trimmed)) return 'That does not look like an email address. Check for a typo.';
  return null;
}

export function validatePhone(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your phone number.';
  if (!PHONE_DIGITS.test(digitsOf(trimmed))) {
    return 'Enter a full phone number, including the country or network code.';
  }
  return null;
}

export const validateIdentifier = (value, channel) =>
  channel === 'email' ? validateEmail(value) : validatePhone(value);

export function validateName(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your name so couriers know who to ask for.';
  if (trimmed.length < 2) return 'That is a little short — enter your full name.';
  return null;
}

export const CODE_LENGTH = 6;

export function validateCode(value) {
  if (!value) return 'Enter the 6-digit code we sent you.';
  if (value.length < CODE_LENGTH) return `The code is ${CODE_LENGTH} digits — you have entered ${value.length}.`;
  return null;
}

/**
 * A fetch that never reached the server reads as a TypeError with no status. Say so
 * plainly rather than showing the visitor a stack-trace-shaped string.
 */
export function readableError(message, fallback) {
  if (!message) return fallback;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  // Errors thrown by api() carry the request line; visitors should not read that.
  if (/^(GET|POST|PATCH|DELETE) \/api/.test(message)) {
    return /\b5\d\d\b/.test(message)
      ? 'Something went wrong on our side. Please try again in a moment.'
      : fallback;
  }
  return message;
}

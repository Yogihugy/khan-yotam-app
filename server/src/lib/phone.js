/**
 * Normalize to E.164 (+countrycode...) for Twilio / shared phone identity.
 * Accepts +972…, 972…, or Israeli local 05… forms used in this app.
 */
export function normalizeToE164(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';

  // Local IL mobile/landline: 05… / 02… → drop leading 0, prefix 972
  if (digits.startsWith('0')) {
    digits = `972${digits.slice(1)}`;
  }

  return `+${digits}`;
}

/** Digits-only form for WATI (no leading +). */
export function toWhatsAppDigits(phone) {
  return normalizeToE164(phone).replace(/^\+/, '');
}

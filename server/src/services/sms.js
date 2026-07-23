import twilio from 'twilio';
import { getConfig } from '../config.js';
import { normalizeToE164 } from '../lib/phone.js';

export { normalizeToE164 };

/**
 * Sends an SMS via Twilio.
 * When SMS_MOCK=true (default) or Twilio env is incomplete, logs and returns a stub.
 * Return shape matches sendWhatsAppMessage: { ok, mocked, data? }.
 */
export async function sendSmsMessage({ phone, messageText }) {
  const { twilio: twilioCfg } = getConfig();
  const to = normalizeToE164(phone);

  if (!to || !/^\+\d{8,15}$/.test(to)) {
    throw Object.assign(new Error('Invalid SMS phone number'), { status: 400 });
  }

  const missingCreds =
    !twilioCfg.accountSid || !twilioCfg.authToken || !twilioCfg.fromNumber;

  if (twilioCfg.mock || missingCreds) {
    console.log('[SMS MOCK] send', {
      to,
      from: twilioCfg.fromNumber || '(TWILIO_FROM_NUMBER unset)',
      messageText,
      reason: twilioCfg.mock ? 'SMS_MOCK' : 'missing Twilio env',
    });
    return { ok: true, mocked: true };
  }

  const client = twilio(twilioCfg.accountSid, twilioCfg.authToken);
  const data = await client.messages.create({
    to,
    from: twilioCfg.fromNumber,
    body: messageText,
  });

  return {
    ok: true,
    mocked: false,
    data: { sid: data.sid, status: data.status },
  };
}

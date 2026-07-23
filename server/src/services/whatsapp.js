import { getConfig } from '../config.js';
import { toWhatsAppDigits } from '../lib/phone.js';

/**
 * Sends a WhatsApp message via WATI.
 * When WATI_MOCK=true or API key is missing, logs and returns a stub result.
 * Invites use template messages (required outside an open session).
 */
export async function sendWhatsAppMessage({ phone, messageText, template }) {
  const { wati } = getConfig();
  const whatsappNumber = toWhatsAppDigits(phone);

  if (!whatsappNumber) {
    throw Object.assign(new Error('Invalid WhatsApp phone number'), { status: 400 });
  }

  if (wati.mock || !wati.apiKey || !wati.endpoint) {
    console.log('[WATI MOCK] send', {
      phone: whatsappNumber,
      messageText,
      template,
    });
    return { ok: true, mocked: true };
  }

  const base = wati.endpoint.replace(/\/$/, '');

  if (template?.name) {
    const url = `${base}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(whatsappNumber)}`;
    const body = {
      template_name: template.name,
      broadcast_name: template.broadcastName || `invite_${Date.now()}`,
      language: template.language || wati.inviteTemplateLanguage,
      parameters: template.parameters || [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${wati.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw Object.assign(new Error(`WATI template send failed: ${response.status} ${text}`), {
        status: 502,
      });
    }

    return { ok: true, mocked: false, data: await response.json().catch(() => null) };
  }

  const url = `${base}/api/v1/sendSessionMessage/${encodeURIComponent(whatsappNumber)}`;
  const params = new URLSearchParams({ messageText });
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wati.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(`WATI session send failed: ${response.status} ${text}`), {
      status: 502,
    });
  }

  return { ok: true, mocked: false, data: await response.json().catch(() => null) };
}

export async function sendInviteWhatsApp({ phone, inviteUrl, name }) {
  const { wati } = getConfig();
  const displayName = String(name || '').trim() || 'אורח/ת';
  const messageText = `שלום ${displayName}, מוזמנים להצטרף לקהילת חאן יותם! לחצו על הקישור כדי להתחיל: ${inviteUrl}`;

  return sendWhatsAppMessage({
    phone,
    messageText,
    template: wati.mock
      ? null
      : {
          name: wati.inviteTemplateName,
          language: wati.inviteTemplateLanguage,
          parameters: [
            { name: 'name', value: displayName },
            { name: 'invite_link', value: inviteUrl },
          ],
        },
  });
}

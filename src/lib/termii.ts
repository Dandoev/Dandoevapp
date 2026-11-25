import { normalizeNigerianPhone } from '@/lib/phone';

const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'DandoEv';

function termiiPhoneNumber(to: string) {
  const normalized = normalizeNigerianPhone(to);
  if (!normalized) throw new Error('Enter a valid Nigerian phone number');
  return normalized.replace(/^\+/, '');
}

function termiiBaseUrl() {
  return (process.env.TERMII_BASE_URL || 'https://v4.api.termii.com').replace(/\/$/, '');
}

export async function sendSms(to: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii is not configured: TERMII_API_KEY is missing');
  const response = await fetch(`${termiiBaseUrl()}/api/sms/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: termiiPhoneNumber(to), from: TERMII_SENDER_ID, sms: message, type: 'plain', channel: 'generic', api_key: apiKey }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || (data?.code && data.code !== 'ok')) throw new Error(data?.message || 'Failed to send SMS via Termii');
  return data;
}

export async function sendWhatsApp(to: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii is not configured: TERMII_API_KEY is missing');
  const response = await fetch(`${termiiBaseUrl()}/api/sms/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: termiiPhoneNumber(to), from: TERMII_SENDER_ID, sms: message, type: 'plain', channel: 'whatsapp', api_key: apiKey }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || (data?.code && data.code !== 'ok')) throw new Error(data?.message || 'Failed to send WhatsApp via Termii');
  return data;
}

function config() {
  const apiKey = process.env.TERMII_API_KEY;
  const baseUrl = (process.env.TERMII_BASE_URL || 'https://api.ng.termii.com').replace(/\/$/, '');
  if (!apiKey) throw new Error('Termii is not configured');
  return { apiKey, baseUrl };
}

export async function sendPhoneOtp(phone: string) {
  const normalized = normalizeNigerianPhone(phone);
  if (!normalized) throw new Error('Enter a valid Nigerian phone number');
  const { apiKey, baseUrl } = config();
  const generateResponse = await fetch(`${baseUrl}/api/sms/otp/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, pin_type: 'NUMERIC', phone_number: normalized.replace(/^\+/, ''), pin_attempts: 3, pin_time_to_live: 10, pin_length: 6 }),
  });
  const generated = await generateResponse.json().catch(() => null);
  if (!generateResponse.ok || !generated?.pin_id || !generated?.otp)
    throw new Error(generated?.message || 'Unable to generate verification code');

  // /otp/generate creates a verifiable Termii PIN but does not deliver it.
  // Dispatch the generated PIN separately over the transactional DND route so
  // login codes reach Nigerian numbers that have DND enabled.
  const deliveryResponse = await fetch(`${baseUrl}/api/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to: normalized.replace(/^\+/, ''),
      from: TERMII_SENDER_ID,
      sms: `${generated.otp} is your DandoEv verification code. It expires in 10 minutes. Do not share this code.`,
      type: 'plain',
      channel: process.env.TERMII_OTP_CHANNEL || 'dnd',
    }),
  });
  const delivery = await deliveryResponse.json().catch(() => null);
  if (!deliveryResponse.ok || (delivery?.code && String(delivery.code).toLowerCase() !== 'ok'))
    throw new Error(delivery?.message || 'Unable to deliver verification code by SMS');

  return { pinId: generated.pin_id, phone: normalized, messageId: delivery?.message_id || null };
}

export async function verifyPhoneOtp(pinId: string, pin: string) {
  const { apiKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}/api/sms/otp/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, pin_id: pinId, pin }),
  });
  const payload = await response.json().catch(() => null);
  return { verified: response.ok && String(payload?.verified).toLowerCase() === 'true', phone: payload?.msisdn || null };
}

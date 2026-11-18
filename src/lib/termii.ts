import { normalizeNigerianPhone } from '@/lib/phone';
import logger from './logger';

const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'DandoEv';

export async function sendSms(to: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) { logger.warn({ to }, 'Termii API key missing, skipping SMS'); return; }
  const response = await fetch(`${(process.env.TERMII_BASE_URL || 'https://v4.api.termii.com').replace(/\/$/, '')}/api/sms/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: to.replace(/^\+/, ''), from: TERMII_SENDER_ID, sms: message, type: 'plain', channel: 'generic', api_key: apiKey }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || (data?.code && data.code !== 'ok')) throw new Error(data?.message || 'Failed to send SMS via Termii');
  return data;
}

export async function sendWhatsApp(to: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) { logger.warn({ to }, 'Termii API key missing, skipping WhatsApp'); return; }
  const response = await fetch(`${(process.env.TERMII_BASE_URL || 'https://v4.api.termii.com').replace(/\/$/, '')}/api/sms/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: to.replace(/^\+/, ''), from: TERMII_SENDER_ID, sms: message, type: 'plain', channel: 'whatsapp', api_key: apiKey }),
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
  const response = await fetch(`${baseUrl}/api/sms/otp/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, pin_type: 'NUMERIC', phone_number: normalized.replace(/^\+/, ''), pin_attempts: 3, pin_time_to_live: 10, pin_length: 6 }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.pin_id) throw new Error(payload?.message || 'Unable to send verification code');
  return { pinId: payload.pin_id, phone: normalized };
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

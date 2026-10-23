import logger from './logger';

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'DandoEv';
const TERMII_BASE_URL = (process.env.TERMII_BASE_URL || 'https://v4.api.termii.com').replace(/\/+$/, '');

/**
 * Send an SMS using Termii API.
 */
export async function sendSms(to: string, message: string) {
  if (!TERMII_API_KEY) {
    logger.warn({ to }, 'Termii API key missing, skipping SMS');
    return;
  }

  // Ensure phone number is in international format without '+'
  const formattedPhone = to.startsWith('+') ? to.slice(1) : to;

  try {
    const response = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 'ok') {
      throw new Error(data.message || 'Failed to send SMS via Termii');
    }

    logger.info({ to, messageId: data.message_id }, 'SMS sent successfully via Termii');
    return data;
  } catch (error: any) {
    logger.error({ to, error: error.message }, 'Termii SMS dispatch failed');
    throw error;
  }
}

/**
 * Send a WhatsApp message using Termii API.
 */
export async function sendWhatsApp(to: string, message: string) {
  if (!TERMII_API_KEY) {
    logger.warn({ to }, 'Termii API key missing, skipping WhatsApp');
    return;
  }

  const formattedPhone = to.startsWith('+') ? to.slice(1) : to;

  try {
    const response = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'whatsapp',
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 'ok') {
      throw new Error(data.message || 'Failed to send WhatsApp via Termii');
    }

    logger.info({ to, messageId: data.message_id }, 'WhatsApp sent successfully via Termii');
    return data;
  } catch (error: any) {
    logger.error({ to, error: error.message }, 'Termii WhatsApp dispatch failed');
    throw error;
  }
}

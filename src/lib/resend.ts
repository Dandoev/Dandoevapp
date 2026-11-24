import logger from './logger';

export interface SendBatchEmailItem {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendBatchEmailResult {
  sent: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
}

/**
 * Dynamically resolves Resend configuration from environment variables.
 */
export function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@dandoev.com';
  const fromName = process.env.RESEND_FROM_NAME || 'DandoEv';
  return { apiKey, fromEmail, fromName };
}

/**
 * Format sender address to comply with RFC 5322 (e.g. "DandoEv <notifications@dandoev.com>")
 */
function formatFromAddress(fromEmail: string, fromName: string): string {
  if (fromEmail.includes('<') && fromEmail.includes('>')) {
    return fromEmail;
  }
  return `${fromName} <${fromEmail}>`;
}

/**
 * Send a single email using Resend API.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options?: { replyTo?: string }
) {
  const { apiKey, fromEmail, fromName } = getResendConfig();

  if (!apiKey) {
    const errorMsg = 'Resend API key missing (RESEND_API_KEY is not set)';
    logger.error({ to, subject }, errorMsg);
    throw new Error(errorMsg);
  }

  const recipients = Array.isArray(to) ? to : [to];
  const from = formatFromAddress(fromEmail, fromName);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        ...(options?.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || `Resend dispatch failed with status ${response.status}`;
      throw new Error(message);
    }

    logger.info({ to: recipients, subject, resendId: data.id }, 'Email sent successfully via Resend');
    return data as { id: string };
  } catch (error: any) {
    logger.error({ to: recipients, subject, error: error.message }, 'Resend email dispatch failed');
    throw error;
  }
}

/**
 * Send bulk emails in batches of up to 100 per request using Resend Batch API.
 * Prevents hitting single-endpoint rate limits (2 req/s) during large campaigns.
 */
export async function sendBatchEmails(
  items: SendBatchEmailItem[],
  options?: { replyTo?: string }
): Promise<SendBatchEmailResult> {
  const { apiKey, fromEmail, fromName } = getResendConfig();

  if (!apiKey) {
    const errorMsg = 'Resend API key missing (RESEND_API_KEY is not set)';
    logger.error({ count: items.length }, errorMsg);
    throw new Error(errorMsg);
  }

  if (items.length === 0) {
    return { sent: 0, failed: 0, failures: [] };
  }

  const from = formatFromAddress(fromEmail, fromName);
  const CHUNK_SIZE = 100;
  const chunks: SendBatchEmailItem[][] = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  let totalSent = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const chunk of chunks) {
    try {
      const payload = chunk.map((item) => ({
        from,
        to: Array.isArray(item.to) ? item.to : [item.to],
        subject: item.subject,
        html: item.html,
        ...(item.replyTo || options?.replyTo
          ? { reply_to: item.replyTo || options?.replyTo }
          : {}),
      }));

      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || `Resend batch failed with status ${response.status}`;
        logger.error({ chunkCount: chunk.length, error: errorMsg }, 'Resend batch chunk failed');
        for (const item of chunk) {
          const emailStr = Array.isArray(item.to) ? item.to.join(', ') : item.to;
          failures.push({ email: emailStr, error: errorMsg });
        }
      } else if (Array.isArray(data.data)) {
        totalSent += data.data.length;
        logger.info({ sentCount: data.data.length }, 'Resend batch chunk sent successfully');
      } else {
        totalSent += chunk.length;
        logger.info({ sentCount: chunk.length }, 'Resend batch chunk accepted');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network exception during Resend batch dispatch';
      logger.error({ error: errorMsg }, 'Resend batch exception');
      for (const item of chunk) {
        const emailStr = Array.isArray(item.to) ? item.to.join(', ') : item.to;
        failures.push({ email: emailStr, error: errorMsg });
      }
    }
  }

  return {
    sent: totalSent,
    failed: failures.length,
    failures,
  };
}

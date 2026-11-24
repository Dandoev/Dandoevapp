import { Job } from 'bullmq';
import logger from '../logger';
import prisma from '../prisma';
import { sendEmail } from '../resend';
import { sendSms } from '../termii';

export async function processNotificationJob(job: Job) {
  const { userId, type, title, message, channels = ['email'] } = job.data as {
    userId: string;
    type: string;
    title: string;
    message: string;
    channels?: ('email' | 'sms' | 'push' | 'whatsapp')[];
  };

  logger.info({ jobId: job.id, userId, type }, 'Processing notification job');

  try {
    // 1. Fetch user to get email/phone
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.error({ userId }, 'User not found for notification');
      throw new Error(`User ${userId} not found`);
    }

    // 2. Dispatch to external channels with per-channel isolation
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await sendEmail(user.email, title, message);
            break;
          case 'sms':
            if (user.phone) await sendSms(user.phone, message);
            break;
          case 'push':
            if ((user as any).pushToken) {
              await sendPushNotification((user as any).pushToken, title, message);
            } else {
              logger.info({ userId }, 'Push notification triggered but no token found');
            }
            break;
          case 'whatsapp':
            if (user.phone) {
              const { sendWhatsApp } = await import('../termii');
              await sendWhatsApp(user.phone, message);
            }
            break;
          default:
            logger.warn({ channel }, 'Unsupported notification channel');
        }
      } catch (channelErr: any) {
        logger.warn({ channel, error: channelErr.message, userId }, 'Notification channel dispatch failed');
      }
    }

    // 3. Ensure saved to in-app Notification table if not already created
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        title,
        message,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          createdAt: new Date(),
        },
      });
    }

  } catch (error: any) {
    logger.error({ jobId: job.id, error: error.message }, 'Notification job failed');
    throw error;
  }
}

async function sendPushNotification(token: string, title: string, body: string) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: { withSome: 'data' },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
       throw new Error(JSON.stringify(data));
    }
    logger.info({ token, title }, 'Push notification sent via Expo');
  } catch (error: any) {
    logger.error({ token, error: error.message }, 'Failed to send push notification');
  }
}

// ============================================================
// DandoEv — Real-Time Notification & Security Alert Dispatcher
// Dispatches In-App, Termii SMS, and Resend Email alerts
// ============================================================
import { sendSms } from './termii';
import { sendEmail } from './resend';
import prisma from './prisma';
import logger from './logger';

export interface UserContactInfo {
  id: string;
  email: string;
  phone?: string | null;
  firstName?: string;
}

/**
 * Internal helper to record an in-app notification in PostgreSQL.
 */
async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'system'
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as any,
        isRead: false,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    if (user?.pushToken) {
      await sendExpoPushNotification(user.pushToken, title, message);
    }
  } catch (err: any) {
    logger.warn({ err: err.message, userId }, 'Could not persist in-app notification');
  }
}

async function sendExpoPushNotification(to: string, title: string, body: string) {
  if (!to.startsWith('ExponentPushToken[')) return;
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: { screen: 'Notifications' },
    }),
  });
  if (!response.ok) {
    logger.warn({ status: response.status }, 'Expo push notification request failed');
  }
}

/**
 * 1. Security Alert: MFA Status Change
 */
export async function notifyMfaChanged(user: UserContactInfo, action: 'ENABLED' | 'DISABLED') {
  const title = action === 'ENABLED' ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled';
  const msg = `Security Alert: 2FA was ${action.toLowerCase()} on your DandoEv account. If you did not perform this action, contact security immediately.`;

  await createInAppNotification(user.id, title, msg, 'security');

  if (user.phone) {
    await sendSms(user.phone, `[DandoEv Security] 2FA has been ${action.toLowerCase()} on your account. If this was not you, alert support.`).catch(() => {});
  }

  if (user.email) {
    await sendEmail(
      user.email,
      `[Security Alert] Two-Factor Authentication ${action}`,
      `<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2>DandoEv Security Notification</h2>
        <p>Hello ${user.firstName || 'Customer'},</p>
        <p>Two-Factor Authentication (2FA) was just <strong>${action}</strong> on your DandoEv account.</p>
        <p>If you made this change, no further action is required.</p>
        <p style="color: #c00;"><strong>If you did not make this change, please lock your account or reply to this email immediately.</strong></p>
      </div>`
    ).catch(() => {});
  }
}

/**
 * 2. Security Alert: Unrecognized Device / IP Login
 */
export async function notifyNewDeviceLogin(
  user: UserContactInfo,
  ipAddress: string,
  userAgent: string = 'Unknown Device'
) {
  const title = 'New Login Detected';
  const msg = `Your account was just accessed from IP ${ipAddress} (${userAgent}).`;

  await createInAppNotification(user.id, title, msg, 'security');

  if (user.email) {
    await sendEmail(
      user.email,
      'Security Alert: New Sign-in to DandoEv',
      `<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2>New Sign-in Alert</h2>
        <p>Hello ${user.firstName || 'Customer'},</p>
        <p>We noticed a new login to your DandoEv account:</p>
        <ul>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Client:</strong> ${userAgent}</li>
          <li><strong>Time:</strong> ${new Date().toUTCString()}</li>
        </ul>
        <p>If this was you, you can safely ignore this email.</p>
      </div>`
    ).catch(() => {});
  }
}

/**
 * 3. KYC Status Changed Alert (Mono Verification)
 */
export async function notifyKycStatusChanged(
  user: UserContactInfo,
  status: 'verified' | 'failed' | 'expired',
  details?: string
) {
  const title = status === 'verified' ? 'KYC Verification Approved' : 'KYC Verification Update';
  const msg = details || `Your identity verification status is now: ${status.toUpperCase()}.`;

  await createInAppNotification(user.id, title, msg, 'kyc');

  if (user.phone) {
    await sendSms(user.phone, `[DandoEv KYC] Your identity verification has been ${status}. Log in to view your loan status.`).catch(() => {});
  }

  if (user.email) {
    await sendEmail(
      user.email,
      `KYC Status Update: ${status.toUpperCase()}`,
      `<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2>Identity Verification Update</h2>
        <p>Hello ${user.firstName || 'Customer'},</p>
        <p>Your KYC status has been updated to: <strong style="color: ${status === 'verified' ? 'green' : 'red'};">${status.toUpperCase()}</strong>.</p>
        <p>${details || ''}</p>
        <p>Visit your <a href="https://dandoev.com/dashboard">DandoEv Dashboard</a> to continue.</p>
      </div>`
    ).catch(() => {});
  }
}

/**
 * 4. BNPL Loan Status Changed Alert
 */
export async function notifyLoanStatusChanged(
  user: UserContactInfo,
  loanId: string,
  status: string,
  rejectionReason?: string
) {
  const title = `BNPL Loan Application ${status.toUpperCase()}`;
  const msg = rejectionReason
    ? `Your loan application was ${status}: ${rejectionReason}`
    : `Your BNPL loan application has been updated to ${status}.`;

  await createInAppNotification(user.id, title, msg, 'loan');

  if (user.phone) {
    await sendSms(user.phone, `[DandoEv] Your BNPL loan application #${loanId.slice(0, 8)} status is now ${status.toUpperCase()}.`).catch(() => {});
  }

  if (user.email) {
    await sendEmail(
      user.email,
      `DandoEv BNPL Application: ${status.toUpperCase()}`,
      `<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2>BNPL Loan Status: ${status.toUpperCase()}</h2>
        <p>Hello ${user.firstName || 'Customer'},</p>
        <p>Your loan application (ID: ${loanId}) status is now <strong>${status.toUpperCase()}</strong>.</p>
        ${rejectionReason ? `<p style="color: #c00;">Reason: ${rejectionReason}</p>` : ''}
        <p>Thank you for choosing DandoEv.</p>
      </div>`
    ).catch(() => {});
  }
}

/**
 * Sends the branded approval packet after operations assigns the vehicle.
 * The message deliberately contains the agreement, invoice and receipt
 * references so the customer has an auditable record even before a PDF
 * document service is configured.
 */
export async function notifyBikeAssigned(
  user: UserContactInfo,
  details: {
    loanId: string;
    bikeName: string;
    bikeSerialNumber?: string | null;
    chassisNumber?: string | null;
    totalRepayable: number;
    tenureMonths: number;
    approvedAt: Date;
  }
) {
  const invoiceRef = `DND-INV-${details.loanId.slice(0, 8).toUpperCase()}`;
  const receiptRef = `DND-RCP-${details.loanId.slice(0, 8).toUpperCase()}`;
  const agreementRef = `DND-AGR-${details.loanId.slice(0, 8).toUpperCase()}`;
  const title = 'Your DandoEv bike has been approved and assigned';
  const message = `${details.bikeName} is assigned to your account. Bike serial: ${details.bikeSerialNumber || 'Pending fleet entry'}. Agreement: ${agreementRef}. Invoice: ${invoiceRef}. Receipt: ${receiptRef}.`;

  await createInAppNotification(user.id, title, message, 'loan');
  if (!user.email) return;

  await sendEmail(user.email, `[DandoEv] Bike assigned — ${details.bikeName}`, `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0A154F">
      <div style="background:#0A154F;padding:24px;border-radius:12px 12px 0 0;color:#fff"><h1 style="margin:0">DandoEv</h1><p style="margin:6px 0 0;color:#B7F4E1">Approved mobility, delivered with confidence.</p></div>
      <div style="padding:24px;border:1px solid #E2E8F0;border-top:0">
        <h2>Congratulations, ${user.firstName || 'Customer'}!</h2>
        <p>Your approved BNPL bike has now been assigned to your account.</p>
        <table style="width:100%;border-collapse:collapse"><tr><td><b>Vehicle</b></td><td>${details.bikeName}</td></tr><tr><td><b>Serial</b></td><td>${details.bikeSerialNumber || 'Pending fleet entry'}</td></tr><tr><td><b>Chassis</b></td><td>${details.chassisNumber || 'Pending fleet entry'}</td></tr><tr><td><b>Term</b></td><td>${details.tenureMonths} months</td></tr><tr><td><b>Total repayable</b></td><td>₦${details.totalRepayable.toLocaleString()}</td></tr></table>
        <hr style="border:0;border-top:1px solid #E2E8F0;margin:24px 0"/>
        <p><b>Agreement:</b> ${agreementRef}<br/><b>Custom invoice:</b> ${invoiceRef}<br/><b>Payment receipt:</b> ${receiptRef}</p>
        <p>Your agreement and assigned vehicle details are now available in the DandoEv app.</p>
      </div>
    </div>`).catch(() => {});
}

/**
 * 5. Repayment Successful Alert
 */
export async function notifyRepaymentSuccess(
  user: UserContactInfo,
  amount: number,
  reference: string
) {
  const formattedAmount = `₦${amount.toLocaleString()}`;
  const title = `Repayment Received: ${formattedAmount}`;
  const msg = `We have successfully received your payment of ${formattedAmount}. Ref: ${reference}`;

  await createInAppNotification(user.id, title, msg, 'payment');

  if (user.phone) {
    await sendSms(user.phone, `[DandoEv] Payment of ${formattedAmount} received. Ref: ${reference}. Thank you!`).catch(() => {});
  }
}

/**
 * 6. Repayment Failed / Overdue Alert
 */
export async function notifyRepaymentFailed(
  user: UserContactInfo,
  amount: number,
  reason?: string
) {
  const formattedAmount = `₦${amount.toLocaleString()}`;
  const title = `Repayment Attempt Failed: ${formattedAmount}`;
  const msg = `Direct debit attempt for ${formattedAmount} failed. ${reason || 'Please top up your linked account.'}`;

  await createInAppNotification(user.id, title, msg, 'payment');

  if (user.phone) {
    await sendSms(user.phone, `[DandoEv Alert] Payment deduction of ${formattedAmount} failed. Please fund your account to avoid late fees.`).catch(() => {});
  }
}

/**
 * 7. Generic Multi-Channel Notification Dispatcher
 */
export interface DispatchNotificationOptions {
  userId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type?: string;
  title: string;
  message: string;
  channels?: ('sms' | 'email' | 'in_app')[];
}

export async function dispatchNotification(options: DispatchNotificationOptions) {
  const { userId, recipientEmail, recipientPhone, title, message, type = 'system', channels = ['in_app'] } = options;

  const tasks: Promise<any>[] = [];

  if (channels.includes('in_app')) {
    tasks.push(createInAppNotification(userId, title, message, type));
  }

  if (channels.includes('sms') && recipientPhone) {
    tasks.push(
      sendSms(recipientPhone, `[DandoEv] ${title}: ${message}`).catch((err) => {
        logger.warn({ err: err.message, recipientPhone }, 'Failed to dispatch SMS notification');
      })
    );
  }

  if (channels.includes('email') && recipientEmail) {
    tasks.push(
      sendEmail(
        recipientEmail,
        `[DandoEv] ${title}`,
        `<div style="font-family: sans-serif; padding: 20px; color: #111;">
          <h2>${title}</h2>
          <p>${message.replace(/\n/g, '<br/>')}</p>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">DandoEv Electric Vehicle Financing</p>
        </div>`
      ).catch((err) => {
        logger.warn({ err: err.message, recipientEmail }, 'Failed to dispatch email notification');
      })
    );
  }

  await Promise.allSettled(tasks);
}

/**
 * 8. Order Confirmed & Paid Notification (Customer + Admins)
 */
export async function notifyOrderConfirmed(orderId: string, paymentReference?: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bike: { select: { name: true, brand: true, model: true } },
        accessories: { include: { accessory: { select: { name: true } } } },
      },
    });

    if (!order || !order.user) {
      logger.warn({ orderId }, 'Cannot dispatch order confirmed notification: order or user not found');
      return;
    }

    const customer = order.user;
    const customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Customer';
    const shortOrderId = order.id.slice(0, 8).toUpperCase();
    const itemName = order.bike?.name || order.accessories?.[0]?.accessory?.name || 'Commercial E-Bike';
    const formattedTotal = `₦${Number(order.totalAmount).toLocaleString()}`;
    const formattedInsurance = `₦${Number(order.insuranceFee || 0).toLocaleString()}`;
    const formattedDelivery = Number(order.deliveryFee || 0) === 0 ? 'FREE (₦0)' : `₦${Number(order.deliveryFee).toLocaleString()}`;

    const isPickup = order.deliveryType === 'pickup';
    const deliveryLocation = isPickup
      ? 'DandoEv Central Hub (Ikeja, Lagos)'
      : `${order.deliveryAddress || ''}, ${order.deliveryCity || ''}, ${order.deliveryState || ''}`.trim();
    const contactPhone = order.deliveryPhone || customer.phone || 'Not provided';

    // 1. In-App Notification to Customer
    const customerTitle = `Order Confirmed: ${itemName} 🚀`;
    const customerMsg = `Your payment of ${formattedTotal} has been verified (Ref: ${paymentReference || shortOrderId}). Our operations team is preparing your order #${shortOrderId}.`;
    await createInAppNotification(customer.id, customerTitle, customerMsg, 'payment');

    // 2. Customer SMS via Termii
    const smsPhone = order.deliveryPhone || customer.phone;
    if (smsPhone) {
      const smsBody = `[DandoEv] Your order #${shortOrderId} for ${itemName} (${formattedTotal}) is confirmed! Ref: ${paymentReference || shortOrderId}. Team will contact you for handover.`;
      await sendSms(smsPhone, smsBody).catch((err) =>
        logger.warn({ err: err.message, smsPhone }, 'Order SMS dispatch failed')
      );
    }

    // 3. Customer Branded Email via Resend
    if (customer.email) {
      const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmed — DandoEv</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(10, 21, 79, 0.05);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #0A154F; padding: 32px 28px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">Dando<span style="color: #10B981;">Ev</span></h1>
              <p style="color: #26FEDC; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Official Order Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: center; border-bottom: 1px solid #F1F5F9;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #ECFDF5; border-radius: 50%; line-height: 56px; font-size: 28px; margin-bottom: 12px;">✅</div>
              <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin: 0 0 6px 0;">Payment Verified & Order Confirmed!</h2>
              <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Thank you, <strong>${customerName}</strong>. We have received your payment of <strong style="color: #0F172A;">${formattedTotal}</strong> for your new electric mobility vehicle.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px;">
              <table width="100%" style="background-color: #F8FAFC; border-radius: 12px; padding: 18px; border: 1px solid #E2E8F0;" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 10px; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700;">Order Number</td>
                  <td style="padding-bottom: 10px; text-align: right; color: #0A154F; font-size: 13px; font-weight: 800; font-family: monospace;">#${shortOrderId}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700;">Payment Ref</td>
                  <td style="padding-bottom: 10px; text-align: right; color: #0A154F; font-size: 13px; font-weight: 800; font-family: monospace;">${paymentReference || 'VERIFIED'}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700;">Vehicle / Item</td>
                  <td style="padding-bottom: 10px; text-align: right; color: #0F172A; font-size: 13px; font-weight: 700;">${itemName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700;">Comprehensive Insurance (10%)</td>
                  <td style="padding-bottom: 10px; text-align: right; color: #0F172A; font-size: 13px; font-weight: 700;">${formattedInsurance}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: 700;">Delivery Option</td>
                  <td style="padding-bottom: 12px; text-align: right; color: #0F172A; font-size: 13px; font-weight: 700;">${isPickup ? 'Hub Pickup (FREE)' : formattedDelivery}</td>
                </tr>
                <tr style="border-top: 2px solid #E2E8F0;">
                  <td style="padding-top: 12px; color: #0A154F; font-size: 15px; font-weight: 800;">Total Amount Paid</td>
                  <td style="padding-top: 12px; text-align: right; color: #10B981; font-size: 18px; font-weight: 800;">${formattedTotal}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <table width="100%" style="background-color: #EEF2FF; border-left: 4px solid #2E3192; border-radius: 8px; padding: 16px;" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h3 style="color: #0A154F; font-size: 14px; font-weight: 800; margin: 0 0 6px 0;">📍 Fulfillment & Handover Details</h3>
                    <p style="color: #334155; font-size: 13px; margin: 0 0 4px 0; line-height: 1.5;"><strong>Destination:</strong> ${deliveryLocation}</p>
                    <p style="color: #334155; font-size: 13px; margin: 0 0 6px 0; line-height: 1.5;"><strong>Contact Phone:</strong> ${contactPhone}</p>
                    <p style="color: #64748B; font-size: 12px; margin: 0; line-height: 1.4;">${isPickup ? 'Please bring a valid government ID or your order reference when picking up at the Lagos Central Hub.' : 'Our logistics team will call your phone prior to dispatch.'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 28px 28px;">
              <h3 style="color: #0F172A; font-size: 14px; font-weight: 800; margin: 0 0 14px 0;">What Happens Next?</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="28" valign="top"><span style="color: #10B981; font-weight: 800;">✓</span></td>
                  <td style="padding-bottom: 12px; color: #334155; font-size: 13px;"><strong>1. Payment Cleared:</strong> Funds settled securely via Mono DirectPay.</td>
                </tr>
                <tr>
                  <td width="28" valign="top"><span style="color: #2E3192; font-weight: 800;">2.</span></td>
                  <td style="padding-bottom: 12px; color: #334155; font-size: 13px;"><strong>Pre-Delivery Inspection:</strong> Battery diagnostic, telematics GPS calibration & frame safety check.</td>
                </tr>
                <tr>
                  <td width="28" valign="top"><span style="color: #64748B; font-weight: 800;">3.</span></td>
                  <td style="color: #334155; font-size: 13px;"><strong>Handover & Keys Release:</strong> Bike handover at hub or direct courier delivery within 24–48 hours.</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 28px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 6px 0;">Need immediate assistance with your order?</p>
              <p style="color: #0A154F; font-size: 12px; font-weight: 700; margin: 0;">Email: <a href="mailto:support@dandoev.com" style="color: #2E3192; text-decoration: none;">support@dandoev.com</a> • WhatsApp: +234 800 DANDOEV</p>
              <p style="color: #94A3B8; font-size: 11px; margin: 12px 0 0 0;">© 2026 DandoEv Limited. Commercial Electric Mobility Nigeria.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail(customer.email, `Order Confirmed: ${itemName} (#${shortOrderId})`, customerEmailHtml).catch((err) =>
        logger.warn({ err: err.message, email: customer.email }, 'Customer order email dispatch failed')
      );
    }

    // 4. Admin Team In-App & Email Notification
    const admins = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'operations_admin', 'finance_admin'] } },
      select: { id: true, email: true },
    });

    const adminTitle = `🚨 New Paid Order #${shortOrderId}: ${formattedTotal}`;
    const adminMsg = `${customerName} (${customer.email}, ${contactPhone}) paid ${formattedTotal} for ${itemName}. Mode: ${isPickup ? 'Hub Pickup' : 'Delivery (' + deliveryLocation + ')'}.`;

    for (const admin of admins) {
      await createInAppNotification(admin.id, adminTitle, adminMsg, 'order');
    }

    const adminEmailRecipient = process.env.ADMIN_ALERT_EMAIL || 'support@dandoev.com';
    const adminEmailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #111; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0A154F; margin-top: 0;">🚨 New Outright Order Confirmed</h2>
        <p>A customer has just completed payment for an outright order.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Order ID:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${shortOrderId} (${order.id})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Customer:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${customerName} (${customer.email})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Contact Phone:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${contactPhone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Item:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${itemName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount Paid:</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #10b981; font-weight: bold;">${formattedTotal}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Payment Reference:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentReference || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Handover Type:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${isPickup ? 'Lagos Central Hub Pickup' : 'Direct Delivery'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Address:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${deliveryLocation}</td></tr>
        </table>
        <p style="margin-top: 16px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.dandoev.com'}/admin/ebike" style="background-color: #2E3192; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; display: inline-block;">View in Admin Dashboard →</a></p>
      </div>
    `;

    await sendEmail(adminEmailRecipient, `🚨 New Paid Order: ${itemName} - ${formattedTotal} (#${shortOrderId})`, adminEmailHtml).catch((err) =>
      logger.warn({ err: err.message }, 'Admin order notification email failed')
    );

    logger.info({ orderId, customerEmail: customer.email }, 'All order confirmed notifications dispatched successfully');
  } catch (err: any) {
    logger.error({ err: err.message, orderId }, 'Failed to dispatch order confirmed notifications');
  }
}

/**
 * 9. Order Payment Failed Notification (Customer + Admins)
 */
export async function notifyOrderPaymentFailed(
  orderId: string,
  reason?: string,
  paymentReference?: string
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bike: { select: { name: true } },
        accessories: { include: { accessory: { select: { name: true } } } },
      },
    });

    if (!order || !order.user) {
      logger.warn({ orderId }, 'Cannot dispatch order payment failed notification: order or user not found');
      return;
    }

    const customer = order.user;
    const customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Customer';
    const shortOrderId = order.id.slice(0, 8).toUpperCase();
    const itemName = order.bike?.name || order.accessories?.[0]?.accessory?.name || 'Order Item';
    const formattedTotal = `₦${Number(order.totalAmount).toLocaleString()}`;
    const failureReason = reason || 'Bank transaction declined or authorization window closed.';

    // 1. Customer In-App Notification
    const customerTitle = `Payment Failed: Order #${shortOrderId} ⚠️`;
    const customerMsg = `Your payment of ${formattedTotal} for ${itemName} could not be completed: ${failureReason}. You can reopen the app to retry your checkout.`;
    await createInAppNotification(customer.id, customerTitle, customerMsg, 'payment');

    // 2. Customer SMS
    const customerPhone = order.deliveryPhone || customer.phone;
    if (customerPhone) {
      const smsBody = `[DandoEv] Payment for order #${shortOrderId} (${formattedTotal}) could not be completed. Please reopen the app to retry or contact support.`;
      await sendSms(customerPhone, smsBody).catch((err) =>
        logger.warn({ err: err.message, customerPhone }, 'Order payment failed SMS dispatch failed')
      );
    }

    // 3. Customer Branded Email
    if (customer.email) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Unsuccessful — DandoEv</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(10, 21, 79, 0.05);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #0A154F; padding: 32px 28px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 6px 0;">Dando<span style="color: #10B981;">Ev</span></h1>
              <p style="color: #F87171; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Payment Transaction Notice</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: center; border-bottom: 1px solid #F1F5F9;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #FEF2F2; border-radius: 50%; line-height: 56px; font-size: 28px; margin-bottom: 12px;">⚠️</div>
              <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin: 0 0 6px 0;">We Couldn't Process Your Payment</h2>
              <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Hello ${customerName}, your payment for <strong style="color: #0F172A;">${itemName}</strong> (${formattedTotal}) was not completed by the payment provider.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px;">
              <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <p style="color: #9F1239; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">Reason reported:</p>
                <p style="color: #881337; font-size: 13px; margin: 0;">${failureReason}</p>
                ${paymentReference ? `<p style="color: #9F1239; font-size: 11px; margin: 6px 0 0 0;">Transaction Ref: ${paymentReference}</p>` : ''}
              </div>

              <h3 style="color: #0F172A; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">What you can do next:</h3>
              <ul style="color: #475569; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Ensure your bank account has sufficient available balance.</li>
                <li>Verify your daily internet banking / mobile transfer limits with your bank.</li>
                <li>Reopen the <strong>DandoEv Mobile App</strong> and tap <strong>Check Status</strong> or <strong>Retry Payment</strong>.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 28px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 6px 0;">Need help completing your transaction?</p>
              <p style="color: #0A154F; font-size: 12px; font-weight: 700; margin: 0;">Email: <a href="mailto:support@dandoev.com" style="color: #2E3192; text-decoration: none;">support@dandoev.com</a> • WhatsApp: +234 800 DANDOEV</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      await sendEmail(customer.email, `Payment Issue: Order #${shortOrderId} (${itemName})`, emailHtml).catch((err) =>
        logger.warn({ err: err.message, email: customer.email }, 'Customer payment failed email dispatch failed')
      );
    }

    // 4. Admin Alert
    const admins = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'operations_admin', 'finance_admin'] } },
      select: { id: true },
    });
    const adminTitle = `⚠️ Order Payment Failed #${shortOrderId}`;
    const adminMsg = `${customerName} (${customer.email}) payment of ${formattedTotal} for ${itemName} failed: ${failureReason}`;
    for (const admin of admins) {
      await createInAppNotification(admin.id, adminTitle, adminMsg, 'order');
    }

    logger.info({ orderId, reason }, 'Order payment failed notifications dispatched');
  } catch (err: any) {
    logger.error({ err: err.message, orderId }, 'Failed to dispatch order payment failed notifications');
  }
}

/**
 * 10. BNPL Loan Application Submitted Notification (Customer + Underwriters)
 */
export async function notifyLoanSubmitted(loanId: string) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bike: { select: { name: true, brand: true, model: true } },
        guarantors: { select: { fullName: true, phone: true, email: true, status: true } },
      },
    });

    if (!loan || !loan.user) {
      logger.warn({ loanId }, 'Cannot dispatch loan submitted notification: loan or user not found');
      return;
    }

    const customer = loan.user;
    const customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Applicant';
    const shortLoanId = loan.id.slice(0, 8).toUpperCase();
    const bikeName = loan.bike?.name || 'Commercial E-Bike';
    const formattedAmount = `₦${Number(loan.loanAmount).toLocaleString()}`;
    const formattedRepayment = `₦${Number(loan.monthlyRepayment || 0).toLocaleString()}`;
    const frequency = loan.deductionFrequency || 'weekly';

    // 1. Customer In-App Notification
    const customerTitle = `BNPL Application Received: ${bikeName} 📋`;
    const customerMsg = `Your financing application #${shortLoanId} has been submitted for review. Both guarantors have been invited to sign.`;
    await createInAppNotification(customer.id, customerTitle, customerMsg, 'loan');

    // 2. Customer SMS
    if (customer.phone) {
      const smsBody = `[DandoEv] Your BNPL application #${shortLoanId} for ${bikeName} is received! Ensure both guarantors complete their verification link to proceed with approval.`;
      await sendSms(customer.phone, smsBody).catch((err) =>
        logger.warn({ err: err.message, phone: customer.phone }, 'Loan submitted SMS dispatch failed')
      );
    }

    // 3. Customer Branded Email
    if (customer.email) {
      const guarantorRows = loan.guarantors
        .map(
          (g, idx) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-size: 13px;">Guarantor ${idx + 1}: <strong>${g.fullName}</strong> (${g.phone})</td>
            <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #D97706; text-align: right; font-weight: 700;">Invitation Dispatched</td>
          </tr>`
        )
        .join('');

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BNPL Application Received — DandoEv</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(10, 21, 79, 0.05);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #0A154F; padding: 32px 28px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 6px 0;">Dando<span style="color: #10B981;">Ev</span></h1>
              <p style="color: #26FEDC; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">BNPL Vehicle Financing</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: center; border-bottom: 1px solid #F1F5F9;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #ECFDF5; border-radius: 50%; line-height: 56px; font-size: 28px; margin-bottom: 12px;">📋</div>
              <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin: 0 0 6px 0;">Application Submitted for Underwriting!</h2>
              <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Dear ${customerName}, your application for <strong>${bikeName}</strong> (App Ref: <strong>#${shortLoanId}</strong>) has been received and entered our credit review queue.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px;">
              <h3 style="color: #0F172A; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">Financing Plan Overview</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
                <tr><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 13px;">Selected Vehicle:</td><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 13px; text-align: right;">${bikeName}</td></tr>
                <tr><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 13px;">Financed Principal:</td><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 13px; text-align: right;">${formattedAmount}</td></tr>
                <tr><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 13px;">Repayment Cadence:</td><td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 13px; text-align: right;">${formattedRepayment} / ${frequency}</td></tr>
                <tr><td style="padding: 10px 14px; color: #64748B; font-size: 13px;">Tenure Duration:</td><td style="padding: 10px 14px; font-weight: 700; color: #0F172A; font-size: 13px; text-align: right;">${loan.tenure} Months</td></tr>
              </table>

              <h3 style="color: #0F172A; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">Guarantor Verification Status</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${guarantorRows}
              </table>

              <h3 style="color: #0F172A; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">What Happens Next?</h3>
              <ol style="color: #475569; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Guarantor Verification:</strong> Remind your 2 guarantors to click the SMS/Email invite links to confirm their support.</li>
                <li><strong>Underwriting Assessment:</strong> Our credit risk team reviews your statement and Mono score (typically 24 hours).</li>
                <li><strong>Vehicle Allocation & Hub Handover:</strong> Once approved, your bike serial and battery credentials will be released for pickup.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 28px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 6px 0;">Questions about your application?</p>
              <p style="color: #0A154F; font-size: 12px; font-weight: 700; margin: 0;">Support Email: <a href="mailto:underwriting@dandoev.com" style="color: #2E3192; text-decoration: none;">underwriting@dandoev.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      await sendEmail(customer.email, `BNPL Application Received: ${bikeName} (#${shortLoanId})`, emailHtml).catch((err) =>
        logger.warn({ err: err.message, email: customer.email }, 'Customer loan submitted email dispatch failed')
      );
    }

    // 4. Admin / Underwriter Alert
    const underwriters = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'operations_admin', 'compliance_officer'] } },
      select: { id: true, email: true },
    });
    const adminTitle = `📝 New BNPL Application: ${customerName} (#${shortLoanId})`;
    const adminMsg = `${customerName} applied for ${bikeName} (${formattedAmount}, ${loan.tenure} mo). Review at admin dashboard.`;
    for (const staff of underwriters) {
      await createInAppNotification(staff.id, adminTitle, adminMsg, 'loan');
    }

    const adminEmailRecipient = process.env.ADMIN_ALERT_EMAIL || 'support@dandoev.com';
    const adminEmailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #111; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0A154F; margin-top: 0;">📝 New BNPL Loan Application Submitted</h2>
        <p>A new customer application is awaiting credit underwriting.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Application Ref:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">#${shortLoanId} (${loan.id})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Applicant:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${customerName} (${customer.email || 'N/A'}, ${customer.phone || 'N/A'})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Asset:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${bikeName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Financed Amount:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formattedAmount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Repayment:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${formattedRepayment} / ${frequency} (${loan.tenure} months)</td></tr>
        </table>
        <p style="margin-top: 16px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.dandoev.com'}/admin/ebike" style="background-color: #2E3192; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; display: inline-block;">Open Underwriter Drawer →</a></p>
      </div>
    `;
    await sendEmail(adminEmailRecipient, `📝 New BNPL Application: ${customerName} (${bikeName})`, adminEmailHtml).catch((err) =>
      logger.warn({ err: err.message }, 'Admin loan submitted email failed')
    );

    logger.info({ loanId }, 'All loan submitted notifications dispatched successfully');
  } catch (err: any) {
    logger.error({ err: err.message, loanId }, 'Failed to dispatch loan submitted notifications');
  }
}

/**
 * 11. BNPL Down Payment Confirmed Notification (Customer + Admins)
 */
export async function notifyDownPaymentSuccess(loanId: string, amount: number, paymentReference?: string) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bike: { select: { name: true } },
      },
    });

    if (!loan || !loan.user) {
      logger.warn({ loanId }, 'Cannot dispatch down payment notification: loan or user not found');
      return;
    }

    const customer = loan.user;
    const customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Customer';
    const bikeName = loan.bike?.name || 'Commercial E-Bike';
    const shortLoanId = loan.id.slice(0, 8).toUpperCase();
    const formattedAmount = `₦${Number(amount).toLocaleString()}`;

    // 1. Customer In-App Notification
    const customerTitle = `Down Payment Verified: ${formattedAmount} ✅`;
    const customerMsg = `Your initial down payment of ${formattedAmount} for ${bikeName} has been verified (Ref: ${paymentReference || shortLoanId}).`;
    await createInAppNotification(customer.id, customerTitle, customerMsg, 'payment');

    // 2. Customer SMS
    if (customer.phone) {
      const smsBody = `[DandoEv] Your down payment of ${formattedAmount} for ${bikeName} (#${shortLoanId}) is confirmed! Our team will contact you once final approval is ready.`;
      await sendSms(customer.phone, smsBody).catch((err) =>
        logger.warn({ err: err.message, phone: customer.phone }, 'Down payment SMS failed')
      );
    }

    // 3. Customer Email
    if (customer.email) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Down Payment Verified — DandoEv</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #0A154F; padding: 32px 28px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 6px 0;">Dando<span style="color: #10B981;">Ev</span></h1>
              <p style="color: #26FEDC; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase;">Down Payment Receipt</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #ECFDF5; border-radius: 50%; line-height: 56px; font-size: 28px; margin-bottom: 12px;">✅</div>
              <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin: 0 0 6px 0;">Down Payment Received!</h2>
              <p style="color: #64748B; font-size: 14px; margin: 0;">We have received your down payment of <strong style="color: #0F172A;">${formattedAmount}</strong> for your <strong>${bikeName}</strong> financing plan.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      await sendEmail(customer.email, `Down Payment Verified: ${formattedAmount} (#${shortLoanId})`, emailHtml).catch((err) =>
        logger.warn({ err: err.message, email: customer.email }, 'Down payment email failed')
      );
    }

    // 4. Admin In-App Alert
    const admins = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'operations_admin', 'finance_admin'] } },
      select: { id: true },
    });
    const adminTitle = `💰 Down Payment Verified: ${customerName} (${formattedAmount})`;
    const adminMsg = `${customerName} paid down payment of ${formattedAmount} for ${bikeName} (#${shortLoanId}). Ref: ${paymentReference || 'N/A'}`;
    for (const admin of admins) {
      await createInAppNotification(admin.id, adminTitle, adminMsg, 'loan');
    }

    logger.info({ loanId, amount }, 'Down payment confirmed notifications dispatched');
  } catch (err: any) {
    logger.error({ err: err.message, loanId }, 'Failed to dispatch down payment notifications');
  }
}



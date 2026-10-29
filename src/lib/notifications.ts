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
  } catch (err: any) {
    logger.warn({ err: err.message, userId }, 'Could not persist in-app notification');
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


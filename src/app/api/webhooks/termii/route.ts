import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = process.env.TERMII_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-termii-signature') !== secret && req.headers.get('x-webhook-secret') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await req.json().catch(() => null);
  const phone = String(payload?.phone_number || payload?.to || payload?.recipient || '').replace(/\D/g, '');
  const event = String(payload?.event || payload?.status || '').toLowerCase();
  if (phone) {
    const status = event.includes('deliver') ? 'delivered' : event.includes('fail') ? 'failed' : null;
    if (status) await prisma.guarantor.updateMany({ where: { phone: { endsWith: phone.slice(-10) }, inviteDeliveryStatus: 'sent' }, data: status === 'delivered' ? { inviteDeliveryStatus: status, inviteDeliveredAt: new Date() } : { inviteDeliveryStatus: status, inviteFailedAt: new Date(), inviteFailureReason: String(payload?.message || 'Provider delivery failure') } });
  }
  return NextResponse.json({ received: true });
}

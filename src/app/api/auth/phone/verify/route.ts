import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeNigerianPhone } from '@/lib/phone';
import { verifyPhoneOtp } from '@/lib/termii';
import prisma from '@/lib/prisma';

const schema = z.object({ phone: z.string().min(10), pin: z.string().min(4).max(8), purpose: z.enum(['signup', 'login']).default('login') });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter the verification code' }, { status: 400 });
  const phone = normalizeNigerianPhone(parsed.data.phone);
  const challenge = phone && await prisma.phoneOtpChallenge.findFirst({ where: { phone, purpose: parsed.data.purpose, verified: false, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!phone || !challenge) return NextResponse.json({ error: 'The verification code is invalid or expired' }, { status: 401 });
  try {
    const result = await verifyPhoneOtp(challenge.pinId, parsed.data.pin);
    if (!result.verified) return NextResponse.json({ error: 'The verification code is incorrect or expired' }, { status: 401 });
    await prisma.phoneOtpChallenge.update({ where: { id: challenge.id }, data: { verified: true } });
    return NextResponse.json({ success: true, phone });
  } catch { return NextResponse.json({ error: 'Phone verification is temporarily unavailable' }, { status: 502 }); }
}

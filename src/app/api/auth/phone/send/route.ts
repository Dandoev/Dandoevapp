import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/api-handler';
import { normalizeNigerianPhone } from '@/lib/phone';
import { sendPhoneOtp } from '@/lib/termii';
import prisma from '@/lib/prisma';

const schema = z.object({ phone: z.string().min(10), purpose: z.enum(['signup', 'login']).default('login') });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 });
  const phone = normalizeNigerianPhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: 'Enter a valid Nigerian phone number' }, { status: 400 });
  const limit = await checkRateLimit(`phone-otp:${getClientIp(req)}:${phone}`, RATE_LIMITS.AUTH_SIGNIN);
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const challenge = await sendPhoneOtp(phone);
    await prisma.phoneOtpChallenge.create({ data: { phone, pinId: challenge.pinId, purpose: parsed.data.purpose, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send verification code' }, { status: 502 }); }
}

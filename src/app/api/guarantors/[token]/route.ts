import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { exchangeMonoToken, getMonoIdentity } from '@/lib/mono';
import logger from '@/lib/logger';

const submissionSchema = z.object({
  code: z.string().min(3), fullName: z.string().min(2).max(200),
  phone: z.string().min(7).max(20), relationship: z.string().min(2).max(100),
  agreementAccepted: z.literal(true),
});
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const tokenFrom = (req: NextRequest) => req.nextUrl.pathname.split('/').pop()!;

export async function GET(req: NextRequest) {
  const guarantor = await prisma.guarantor.findUnique({
    where: { inviteTokenHash: tokenHash(tokenFrom(req)) },
    include: { loan: { include: { bike: true, user: { select: { firstName: true, lastName: true, phone: true } } } } },
  });
  if (!guarantor || !guarantor.inviteExpiresAt || guarantor.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: 'This invitation is invalid or expired' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: {
    guarantor: { fullName: guarantor.fullName, phone: guarantor.phone, relationship: guarantor.relationship, status: guarantor.status },
    loan: { id: guarantor.loan.id, applicantName: `${guarantor.loan.user.firstName} ${guarantor.loan.user.lastName}`, bikeName: guarantor.loan.bike.name, loanAmount: Number(guarantor.loan.loanAmount), totalRepayable: Number(guarantor.loan.totalRepayable), tenure: guarantor.loan.tenure, deductionFrequency: guarantor.loan.deductionFrequency },
  }});
}

export async function POST(req: NextRequest) {
  const parsed = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid verification submission', details: parsed.error.flatten() }, { status: 400 });
  const hash = tokenHash(tokenFrom(req));
  try {
    const guarantor = await prisma.guarantor.findUnique({ where: { inviteTokenHash: hash } });
    if (!guarantor || !guarantor.inviteExpiresAt || guarantor.inviteExpiresAt < new Date()) return NextResponse.json({ error: 'This invitation is invalid or expired' }, { status: 404 });
    if (guarantor.status === 'accepted') return NextResponse.json({ error: 'This invitation has already been completed' }, { status: 409 });

    const account = await exchangeMonoToken(parsed.data.code);
    const identity = await getMonoIdentity(account.id);
    const normalizedExpected = guarantor.fullName.replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedActual = identity.name.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!identity.verified || normalizedExpected !== normalizedActual) {
      return NextResponse.json({ error: 'Mono identity does not match the invited guarantor' }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.guarantor.update({ where: { id: guarantor.id }, data: {
        phone: parsed.data.phone, relationship: parsed.data.relationship, monoAccountId: account.id,
        verifiedAt: new Date(), agreementAcceptedAt: new Date(), acceptedAt: new Date(),
        status: 'accepted', signatureUrl: `agreement://guarantor/${guarantor.id}`,
        inviteTokenHash: null,
      }});
      const accepted = await tx.guarantor.count({ where: { loanId: guarantor.loanId, status: 'accepted', verifiedAt: { not: null }, agreementAcceptedAt: { not: null } } });
      await tx.loan.update({ where: { id: guarantor.loanId }, data: { guarantorsVerified: accepted >= 2 } });
    });
    return NextResponse.json({ success: true, message: 'Identity verified and guarantor agreement signed' });
  } catch (error) {
    logger.error({ error }, 'Guarantor verification failed');
    return NextResponse.json({ error: 'Guarantor verification could not be completed' }, { status: 502 });
  }
}

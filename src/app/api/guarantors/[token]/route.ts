import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { exchangeMonoToken, getMonoIdentity } from '@/lib/mono';
import logger from '@/lib/logger';

const submissionSchema = z.object({
  code: z.string().min(3), fullName: z.string().min(2).max(200),
  phone: z.string().min(7).max(20), relationship: z.string().min(2).max(100),
  occupation: z.string().max(200).optional(), idDocumentUrl: z.string().url(), proofOfAddressUrl: z.string().url(), workIdUrl: z.string().url().optional(),
  agreementAccepted: z.literal(true),
});
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const tokenFrom = (req: NextRequest) => req.nextUrl.pathname.split('/').pop()!;

export async function GET(req: NextRequest) {
  const token = tokenFrom(req);
  try {
    const guarantor = await prisma.guarantor.findUnique({
      where: { inviteTokenHash: tokenHash(token) },
      include: { loan: { include: { bike: true, user: { select: { firstName: true, lastName: true, phone: true } } } } },
    });
    if (!guarantor || !guarantor.inviteExpiresAt || guarantor.inviteExpiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation is invalid or expired' }, { status: 404 });
    }
    await prisma.guarantor.update({ where: { id: guarantor.id }, data: { inviteDeliveryStatus: guarantor.inviteDeliveryStatus === 'sent' ? 'opened' : guarantor.inviteDeliveryStatus, inviteOpenedAt: guarantor.inviteOpenedAt || new Date() } });
    return NextResponse.json({ success: true, data: {
      guarantor: { fullName: guarantor.fullName, phone: guarantor.phone, relationship: guarantor.relationship, status: guarantor.status },
      loan: { id: guarantor.loan.id, applicantName: `${guarantor.loan.user.firstName} ${guarantor.loan.user.lastName}`, bikeName: guarantor.loan.bike.name, loanAmount: Number(guarantor.loan.loanAmount), totalRepayable: Number(guarantor.loan.totalRepayable), tenure: guarantor.loan.tenure, deductionFrequency: guarantor.loan.deductionFrequency },
    }});
  } catch (error) {
    logger.error({ error }, 'Guarantor invitation lookup failed');
    return NextResponse.json({ error: 'Unable to load this invitation right now' }, { status: 503 });
  }
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
    const isFamily = /parent|sibling|spouse|family|relative|child/i.test(parsed.data.relationship);
    if (!parsed.data.idDocumentUrl || !parsed.data.proofOfAddressUrl || (!isFamily && !parsed.data.workIdUrl)) {
      return NextResponse.json({ error: isFamily ? 'Means of ID and proof of address are required' : 'Means of ID, proof of address and work ID are required' }, { status: 400 });
    }
    if (!identity.verified || normalizedExpected !== normalizedActual) {
      return NextResponse.json({ error: 'Mono identity does not match the invited guarantor' }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.guarantor.update({ where: { id: guarantor.id }, data: {
        phone: parsed.data.phone, relationship: parsed.data.relationship, occupation: parsed.data.occupation || null,
        idDocumentUrl: parsed.data.idDocumentUrl, proofOfAddressUrl: parsed.data.proofOfAddressUrl, workIdUrl: parsed.data.workIdUrl || null, monoAccountId: account.id,
        verifiedAt: new Date(), agreementAcceptedAt: new Date(), acceptedAt: new Date(),
        status: 'accepted', inviteDeliveryStatus: 'verified', signatureUrl: `agreement://guarantor/${guarantor.id}`,
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

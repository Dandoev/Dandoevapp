import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withRoles(
  ['super_admin', 'credit_underwriter', 'finance_admin', 'compliance_officer'],
  async (req: NextRequest, _ctx: ApiContext) => {
    const userId = req.nextUrl.searchParams.get('userId');
    const assessments = await prisma.monoFinancialAssessment.findMany({
      where: userId ? { userId } : undefined,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: userId ? 1 : 100,
    });
    return NextResponse.json({ success: true, data: assessments });
  }
);

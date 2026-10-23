// ============================================================
// DandoEv — Admin Fraud Operations API
// GET: List flagged transactions, risky loan applications, and anomaly logs
// POST: Take administrative mitigation actions (Override, Step-Up KYC, Block)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withSecurityHeaders } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const ADMIN_ROLES = ['super_admin', 'compliance_officer', 'finance_admin'];

export const GET = withSecurityHeaders(
  withRoles(ADMIN_ROLES, async (req: NextRequest) => {
    try {
      // 1. Fetch recent loans with risk signals
      const flaggedLoans = await prisma.loan.findMany({
        where: {
          status: { in: ['pending', 'under_review'] },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              customerStatus: true,
              kycStatus: true,
              monthlyIncome: true,
            },
          },
          bike: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // 2. Fetch security audit logs for auth & fraud events
      const securityAuditLogs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['LOGIN_FAILED', 'AUTH_FAILED', 'FRAUD_FLAGGED', 'DATA_SUBJECT_ERASURE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // 3. Fetch failed payment transactions
      const failedTransactions = await prisma.paymentTransaction.findMany({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        success: true,
        data: {
          flaggedLoans,
          securityAuditLogs,
          failedTransactions,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch fraud admin data');
      return NextResponse.json({ error: 'Failed to load fraud dashboard data' }, { status: 500 });
    }
  })
);

export const POST = withSecurityHeaders(
  withRoles(ADMIN_ROLES, async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const { action, loanId, userId, reason } = body;

      if (!action) {
        return NextResponse.json({ error: 'Action is required' }, { status: 400 });
      }

      if (action === 'BLOCK_USER' && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { customerStatus: 'suspended' },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_BLOCKED_USER',
            resource: 'User',
            resourceId: userId,
            details: JSON.stringify({ actorId: ctx.user.sub, actorEmail: ctx.user.email, reason: reason || 'Fraud prevention lock', timestamp: new Date().toISOString() }),
          },
        });

        return NextResponse.json({ success: true, message: 'User suspended successfully' });
      }

      if (action === 'APPROVE_LOAN' && loanId) {
        await prisma.loan.update({
          where: { id: loanId },
          data: { status: 'approved' },
        });

        await prisma.auditLog.create({
          data: {
            userId: ctx.user.sub,
            action: 'ADMIN_APPROVED_LOAN_OVERRIDE',
            resource: 'Loan',
            resourceId: loanId,
            details: JSON.stringify({ actorId: ctx.user.sub, actorEmail: ctx.user.email, reason, timestamp: new Date().toISOString() }),
          },
        });

        return NextResponse.json({ success: true, message: 'Loan approved manually' });
      }

      return NextResponse.json({ error: 'Unsupported admin fraud action' }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
    }
  })
);

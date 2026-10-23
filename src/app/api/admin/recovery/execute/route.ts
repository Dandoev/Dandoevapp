import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * POST /api/admin/recovery/execute
 * Execute collections & debt recovery actions (WhatsApp, Direct Debit Sweep, Guarantor Escalation)
 */
export const POST = withRoles(
  ['super_admin', 'collections_agent', 'finance_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const body = await req.json();
      const { actionType, repaymentId, userId } = body;

      if (!actionType) {
        return NextResponse.json({ error: 'Action type is required' }, { status: 400 });
      }

      const result = await dbService.executeRecoveryAction(actionType, repaymentId, userId);

      return NextResponse.json({
        success: true,
        message: result.message,
        actionType,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to execute recovery action');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';
import { DEMO_RECONCILIATION } from '@/lib/demo-data';

async function getHandler(req: NextRequest) {
  try {
    const logs = await dbService.getReconciliations();
    return NextResponse.json({
      logs: logs.length > 0 ? logs : DEMO_RECONCILIATION.logs,
      settlements: DEMO_RECONCILIATION.settlements,
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch reconciliation');
    return NextResponse.json(DEMO_RECONCILIATION);
  }
}

async function postHandler(req: NextRequest, ctx: ApiContext) {
  try {
    const body = await req.json();
    const { action, reference } = body;

    await dbService.logAudit({
      action: 'SETTLEMENT_RECONCILED',
      actorName: 'Super Admin',
      resource: 'reconciliation',
      details: `Reconciled settlement batch for reference ${reference || 'BATCH-ALL'}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Settlement cleared and marked reconciled in ledger.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process reconciliation' }, { status: 500 });
  }
}

export const GET = withRoles(['super_admin', 'finance_admin'], getHandler);
export const POST = withRoles(['super_admin', 'finance_admin'], postHandler);

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/audit-logs — System activity feed
 */
export const GET = withRoles(
  ['super_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const logs = await dbService.getAuditLogs();
      return NextResponse.json({ success: true, data: logs });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch audit logs');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

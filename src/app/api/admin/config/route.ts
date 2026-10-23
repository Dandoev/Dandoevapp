import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/config — View global platform parameters
 */
export const GET = withRoles(
  ['super_admin', 'finance_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const configMap = await dbService.getSystemConfig();
      return NextResponse.json({ success: true, data: configMap });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch config');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

/**
 * POST /api/admin/config — Update platform parameters
 */
export const POST = withRoles(
  ['super_admin', 'finance_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const body = await req.json();

      let updates: Record<string, string> = {};
      if (body.key && body.value !== undefined) {
        updates[body.key] = String(body.value);
      } else if (typeof body === 'object') {
        updates = body;
      }

      const updated = await dbService.updateSystemConfig(updates);

      return NextResponse.json({
        success: true,
        message: 'System parameters updated and persisted successfully',
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update config');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

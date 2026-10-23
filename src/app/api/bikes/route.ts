import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

import { DEMO_BIKES } from '@/lib/demo-data';

/**
 * GET /api/bikes
 * Public route to fetch available bikes.
 */
export async function GET(req: NextRequest) {
  try {
    const bikes = await prisma.bike.findMany({
      where: {
        availability: { in: ['in_stock', 'pre_order'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: bikes.length > 0 ? bikes : DEMO_BIKES });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch bikes from database, using demo bikes');
    return NextResponse.json({ success: true, data: DEMO_BIKES });
  }
}

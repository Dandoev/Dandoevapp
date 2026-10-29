import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';


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

    return NextResponse.json({ success: true, data: bikes });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch bikes from database');
    return NextResponse.json({ error: 'Bike catalog unavailable' }, { status: 503 });
  }
}

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

    const normalizedBikes = bikes.map((bike) => ({
      ...bike,
      name: /g90/i.test(bike.name) ? 'DandoEv G90' : bike.name.replace(/\s+flagship\b/ig, '').trim(),
      features: bike.features.filter((feature) => !/extra battery/i.test(feature)),
    }));

    return NextResponse.json({ success: true, data: normalizedBikes });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch bikes from database');
    return NextResponse.json({ error: 'Bike catalog unavailable' }, { status: 503 });
  }
}

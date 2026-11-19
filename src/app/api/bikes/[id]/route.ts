import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/bikes/[id]
 * Public route to fetch a single bike's details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bike = await prisma.bike.findUnique({
      where: { id },
    });

    if (!bike) {
      return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...bike,
        name: /g90/i.test(bike.name) ? 'DandoEv G90' : bike.name.replace(/\s+flagship\b/ig, '').trim(),
        features: bike.features.filter((feature) => !/extra battery/i.test(feature)),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch bike');
    return NextResponse.json({ error: 'Failed to fetch bike details' }, { status: 500 });
  }
}

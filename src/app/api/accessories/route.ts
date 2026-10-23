import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/accessories
 * Public route to fetch available accessories (batteries, chargers).
 */
export async function GET(req: NextRequest) {
  try {
    const accessories = await prisma.accessory.findMany({
      where: {
        stockQuantity: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: accessories });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch accessories');
    return NextResponse.json({ error: 'Failed to fetch accessories' }, { status: 500 });
  }
}

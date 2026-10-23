import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/accessories/[id]
 * Public route to fetch a single accessory's details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessory = await prisma.accessory.findUnique({
      where: { id },
    });

    if (!accessory) {
      return NextResponse.json({ error: 'Accessory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: accessory });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch accessory');
    return NextResponse.json({ error: 'Failed to fetch accessory details' }, { status: 500 });
  }
}

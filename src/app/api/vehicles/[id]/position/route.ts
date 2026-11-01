import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  const { id } = await ctx.params;
  try {
    const admin = ['super_admin', 'operations_admin'].includes(ctx.user.role);
    if (!admin) {
      const assigned = await prisma.vehicleAssignment.findFirst({
        where: { assetId: id, riderId: ctx.user.sub, endedAt: null }, select: { id: true },
      });
      if (!assigned) return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
    }
    const position = await prisma.vehiclePosition.findFirst({
      where: { assetId: id, source: 'omni-device' }, orderBy: { observedAt: 'desc' },
    });
    if (!position) return NextResponse.json({ data: null, status: 'unavailable' });
    const ageSeconds = Math.max(0, Math.floor((Date.now() - position.observedAt.getTime()) / 1000));
    return NextResponse.json({
      data: { latitude: Number(position.latitude), longitude: Number(position.longitude), observedAt: position.observedAt, receivedAt: position.receivedAt, satellites: position.satellites, hdop: position.hdop === null ? null : Number(position.hdop), estimated: position.estimated, source: 'omni-device' },
      status: ageSeconds <= 120 ? 'recent' : 'stale', ageSeconds,
    });
  } catch {
    return NextResponse.json({ error: 'Bike position unavailable' }, { status: 503 });
  }
});

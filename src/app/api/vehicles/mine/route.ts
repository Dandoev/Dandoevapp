import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  try {
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { riderId: ctx.user.sub, endedAt: null },
      include: { asset: { select: { id: true, serialNumber: true, status: true, firmwareVersion: true, bike: { select: { id: true, name: true, model: true, rangeKm: true } } } } },
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json({ data: assignments.map(({ id, startedAt, asset }) => ({ assignmentId: id, assignedAt: startedAt, asset })) });
  } catch {
    return NextResponse.json({ error: 'Assigned bikes unavailable' }, { status: 503 });
  }
});

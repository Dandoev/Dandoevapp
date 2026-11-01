import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const POST = withRoles(['super_admin', 'operations_admin'], async (_req, ctx) => {
  const { id } = await ctx.params;
  try {
    const ended = await prisma.vehicleAssignment.updateMany({
      where: { assetId: id, endedAt: null },
      data: { endedAt: new Date() },
    });
    if (!ended.count) return NextResponse.json({ error: 'No active assignment found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to end assignment' }, { status: 503 });
  }
});

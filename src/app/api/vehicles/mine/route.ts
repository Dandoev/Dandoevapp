import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  try {
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { riderId: ctx.user.sub, endedAt: null },
      include: { asset: { select: { id: true, serialNumber: true, status: true, firmwareVersion: true, bike: { select: { id: true, name: true, model: true, rangeKm: true } }, telemetry: { orderBy: { observedAt: 'desc' }, take: 1 } } } },
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json({ data: assignments.map(({ id, startedAt, asset }) => { const {telemetry,...vehicle}=asset; const t=telemetry[0]; const age=t?Math.max(0,Math.floor((Date.now()-t.observedAt.getTime())/1000)):null; return { assignmentId:id,assignedAt:startedAt,asset:{...vehicle,remoteUnlockAvailable:process.env.OMNI_REMOTE_UNLOCK_ENABLED==='true'&&vehicle.status==='active'&&!!vehicle.firmwareVersion&&age!==null&&age<=120,telemetry:t&&age!==null&&age<=120?{lockState:t.lockState,batteryPercent:t.batteryPercent,iotVoltage:t.iotVoltage,signal:t.signal,charging:t.charging,observedAt:t.observedAt,ageSeconds:age}:null} }; }) });
  } catch {
    return NextResponse.json({ error: 'Assigned bikes unavailable' }, { status: 503 });
  }
});

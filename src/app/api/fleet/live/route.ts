import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withRoles(['super_admin', 'operations_admin'], async () => {
  try {
    const assets = await prisma.vehicleAsset.findMany({
      include: {
        bike: { select: { name: true, model: true } },
        assignments: { where: { endedAt: null }, take: 1 },
        positions: { where: { source: 'omni-device' }, orderBy: { observedAt: 'desc' }, take: 1 },
        telemetry: { orderBy: { observedAt: 'desc' }, take: 1 },
        commands: { orderBy: { requestedAt: 'desc' }, take: 5 },
      },
      orderBy: { serialNumber: 'asc' },
    });
    const now = Date.now();
    return NextResponse.json({ data: assets.map(({ positions, telemetry, ...asset }) => {
      const position = positions[0] ?? null;
      const reading = telemetry[0] ?? null;
      const positionAgeSeconds = position ? Math.max(0, Math.floor((now - position.observedAt.getTime()) / 1000)) : null;
      const telemetryAgeSeconds = reading ? Math.max(0, Math.floor((now - reading.observedAt.getTime()) / 1000)) : null;
      return {
        ...asset,
        position: position ? { latitude: Number(position.latitude), longitude: Number(position.longitude), observedAt: position.observedAt, ageSeconds: positionAgeSeconds, estimated: position.estimated } : null,
        telemetry: reading ? { lockState: reading.lockState, batteryPercent: reading.batteryPercent, signal: reading.signal, charging: reading.charging, observedAt: reading.observedAt, ageSeconds: telemetryAgeSeconds } : null,
      };
    }) });
  } catch {
    return NextResponse.json({ error: 'Live fleet data unavailable' }, { status: 503 });
  }
});

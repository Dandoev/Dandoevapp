import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const stations = await prisma.swapStation.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: stations.map(s => ({...s, latitude: Number(s.latitude), longitude: Number(s.longitude)})) });
  } catch {
    return NextResponse.json({ error: 'Stations unavailable' }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const roles = ['super_admin', 'operations_admin'];
const create = z.object({ assetId: z.string().uuid(), title: z.string().trim().min(3).max(120), description: z.string().trim().min(5).max(2000) });
const update = z.object({ id: z.string().uuid(), status: z.enum(['in_progress', 'closed']), resolution: z.string().trim().min(5).max(2000).optional() });

export const GET = withRoles(roles, async () => {
  try {
    const data = await prisma.vehicleMaintenanceCase.findMany({ include: { asset: { select: { serialNumber: true, bike: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: 'Maintenance records unavailable; apply the database migration.' }, { status: 503 }); }
});

export const POST = withRoles(roles, async (req: NextRequest, ctx: ApiContext) => {
  const parsed = create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bike, title and description are required' }, { status: 400 });
  try {
    const asset = await prisma.vehicleAsset.findUnique({ where: { id: parsed.data.assetId }, select: { id: true } });
    if (!asset) return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
    const data = await prisma.vehicleMaintenanceCase.create({ data: { ...parsed.data, createdBy: ctx.user.sub } });
    return NextResponse.json({ data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Unable to create maintenance case' }, { status: 503 }); }
});

export const PATCH = withRoles(roles, async (req: NextRequest, ctx: ApiContext) => {
  const parsed = update.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (parsed.data.status === 'closed' && !parsed.data.resolution)) return NextResponse.json({ error: 'Status and a resolution for closure are required' }, { status: 400 });
  try {
    const { id, status, resolution } = parsed.data;
    const result = await prisma.vehicleMaintenanceCase.updateMany({ where: { id, status: { not: 'closed' } }, data: { status, ...(resolution ? { resolution } : {}), ...(status === 'closed' ? { closedAt: new Date(), closedBy: ctx.user.sub } : {}) } });
    if (!result.count) return NextResponse.json({ error: 'Open case not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Unable to update maintenance case' }, { status: 503 }); }
});

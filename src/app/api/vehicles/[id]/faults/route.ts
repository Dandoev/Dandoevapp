import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(2000),
});

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A fault title and description are required' }, { status: 400 });
  const assignment = await prisma.vehicleAssignment.findFirst({ where: { assetId: id, riderId: ctx.user.sub, endedAt: null }, select: { assetId: true } });
  if (!assignment) return NextResponse.json({ error: 'You do not have an active bike assignment' }, { status: 403 });
  try {
    const report = await prisma.vehicleMaintenanceCase.create({ data: { assetId: id, title: parsed.data.title, description: `Rider report: ${parsed.data.description}`, createdBy: ctx.user.sub } });
    return NextResponse.json({ data: { id: report.id, status: report.status, createdAt: report.createdAt } }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Unable to submit fault report' }, { status: 503 }); }
});

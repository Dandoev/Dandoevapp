import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.user.sub }, orderBy: { createdAt: 'desc' }, take: 50,
  });
  return NextResponse.json({ success: true, data: notifications });
});

export const PATCH = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  await prisma.notification.updateMany({ where: { userId: ctx.user.sub, isRead: false }, data: { isRead: true } });
  return NextResponse.json({ success: true });
});

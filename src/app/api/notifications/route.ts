import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated user, plus unread count.
 */
export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.user.sub;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Failed to fetch notifications');
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
});

/**
 * PATCH /api/notifications
 * Mark one notification (by id) or all notifications as read.
 */
export const PATCH = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.user.sub;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty or non-JSON body implies marking all as read
    }

    const { id } = body;

    if (id && typeof id === 'string') {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Failed to update notifications');
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
});

/**
 * DELETE /api/notifications
 * Delete one notification (by id) or all notifications.
 */
export const DELETE = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.user.sub;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // ignore
    }

    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get('id');
    const all = body.all === true || searchParams.get('all') === 'true';

    if (id && typeof id === 'string') {
      await prisma.notification.deleteMany({
        where: { id, userId },
      });
    } else if (all) {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    } else {
      return NextResponse.json({ error: 'Provide notification id or all=true to delete.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Failed to delete notifications');
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
});

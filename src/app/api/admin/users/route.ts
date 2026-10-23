import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import dbService from '@/lib/db-service';

/**
 * GET /api/admin/users — List staff users and platform users
 */
export const GET = withRoles(
  ['super_admin', 'compliance_officer', 'finance_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'staff' or 'customer'

    try {
      const staffUsers = await dbService.getStaffUsers();

      let filteredStaff = staffUsers;
      if (search) {
        const q = search.toLowerCase();
        filteredStaff = staffUsers.filter(
          (u) =>
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        );
      }

      return NextResponse.json({
        success: true,
        data: filteredStaff,
        pagination: {
          total: filteredStaff.length,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch admin users');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

/**
 * POST /api/admin/users — Super Admin provisions a new staff user with RBAC permissions
 */
export const POST = withRoles(
  ['super_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const body = await req.json();
      const { firstName, lastName, email, phone, role, permissions } = body;

      if (!firstName || !email || !role) {
        return NextResponse.json(
          { error: 'First name, email, and operational role are required' },
          { status: 400 }
        );
      }

      const newStaff = await dbService.createStaffUser({
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        role,
        status: 'active',
        permissions: Array.isArray(permissions) ? permissions : ['loans:approve'],
      });

      return NextResponse.json(
        {
          success: true,
          message: `Staff user ${firstName} ${lastName} provisioned successfully`,
          data: newStaff,
        },
        { status: 201 }
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to provision staff user');
      return NextResponse.json(
        { error: error?.message || 'Failed to create staff user' },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/admin/users — Update staff user status or granular permissions
 */
export const PATCH = withRoles(
  ['super_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const body = await req.json();
      const id = body.id || body.userId;
      const { status, permissions, role } = body;

      if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const updated = await dbService.updateStaffUser(id, {
        ...(status && { status }),
        ...(permissions && { permissions }),
        ...(role && { role }),
      });

      if (!updated) {
        return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Staff user updated successfully',
        data: updated,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to update staff user');
      return NextResponse.json(
        { error: error?.message || 'Failed to update staff user' },
        { status: 500 }
      );
    }
  }
);

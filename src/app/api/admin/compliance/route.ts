import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withSecurityHeaders } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

const ADMIN_ROLES = ['super_admin', 'compliance_officer'];

export const GET = withSecurityHeaders(
  withRoles(ADMIN_ROLES, async () => {
    try {
      const kycDocs = await dbService.getKycDocuments();
      const auditLogs = await dbService.getAuditLogs();
      const staffUsers = await dbService.getStaffUsers();

      const complianceLogs = auditLogs.filter((a) =>
        ['APPROVED_KYC_DOC', 'REJECTED_KYC_DOC', 'CREATED_STAFF_USER', 'UPDATED_STAFF_USER'].includes(a.action)
      );

      const verifiedKyc = kycDocs.filter((d) => d.verificationStatus === 'verified').length;
      const pendingKyc = kycDocs.filter((d) => d.verificationStatus === 'pending').length;

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalUsers: 142,
            verifiedKyc,
            pendingKyc,
            suspendedUsers: staffUsers.filter((u) => u.status === 'suspended').length,
          },
          kycDocs,
          complianceLogs,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch admin compliance data');
      return NextResponse.json({ error: 'Failed to load compliance records' }, { status: 500 });
    }
  })
);

// ============================================================
// DandoEv — User Compliance API (NDPR / GDPR)
// GET: Export personal data package (Right of Access & Portability)
// POST: Request account erasure / anonymization (Right to Erasure)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders } from '@/lib/api-handler';
import { exportUserData, anonymizeUserData } from '@/lib/compliance';

export const GET = withSecurityHeaders(
  withAuth(async (req: NextRequest, ctx) => {
    try {
      const dataPackage = await exportUserData(ctx.user.sub);
      return NextResponse.json({
        success: true,
        data: dataPackage,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to export user compliance data' },
        { status: 500 }
      );
    }
  })
);

export const POST = withSecurityHeaders(
  withAuth(async (req: NextRequest, ctx) => {
    try {
      const body = await req.json().catch(() => ({}));
      if (body.action !== 'REQUEST_ERASURE') {
        return NextResponse.json(
          { error: 'Invalid action. Expected action="REQUEST_ERASURE"' },
          { status: 400 }
        );
      }

      const result = await anonymizeUserData(ctx.user.sub, ctx.user.email);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to process data erasure request' },
        { status: 400 }
      );
    }
  })
);

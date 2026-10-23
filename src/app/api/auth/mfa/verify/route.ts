import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders } from '@/lib/api-handler';
import { verifyTotpCode, verifyBackupCode } from '@/lib/mfa';
import { decryptField } from '@/lib/encryption';
import { isDemoAllowed } from '@/lib/env';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export const POST = withSecurityHeaders(
  withAuth(async (req: NextRequest, ctx) => {
    const log = logger.child({ route: 'auth/mfa/verify', userId: ctx.user.sub });

    try {
      const body = await req.json();
      const { code, secret, backupCode, storedBackupHashes } = body;

      // 1. Fetch user's stored secret from database
      let storedSecret: string | null = null;
      try {
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.sub },
          select: { twoFactorSecret: true },
        });
        if (user?.twoFactorSecret) {
          storedSecret = user.twoFactorSecret;
        }
      } catch {
        // Fallback in demo mode
      }

      // Secret priority: stored secret in DB > fallback to body secret only if demo mode is active
      const secretToUse = storedSecret || (isDemoAllowed() ? secret : null);

      if (code && secretToUse) {
        const plainSecret = secretToUse.startsWith('enc:v1:') ? decryptField(secretToUse) : secretToUse;
        const isValid = verifyTotpCode(plainSecret || '', code);

        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid or expired 6-digit MFA code' },
            { status: 400 }
          );
        }

        // Enable two-factor authentication on user profile
        try {
          await prisma.user.update({
            where: { id: ctx.user.sub },
            data: { twoFactorEnabled: true },
          });
        } catch {
          // Ignored for in-memory demo account
        }

        log.info('MFA code verified and 2FA enabled successfully');

        return NextResponse.json({
          success: true,
          message: 'MFA code verified successfully. 2FA is now active.',
        });
      }

      if (backupCode && storedBackupHashes) {
        const { valid, remainingHashes } = verifyBackupCode(backupCode, storedBackupHashes);
        if (!valid) {
          return NextResponse.json(
            { error: 'Invalid or already used backup recovery code' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Backup code accepted',
          remainingHashes,
        });
      }

      return NextResponse.json(
        { error: 'Provide either a TOTP code or a backup code' },
        { status: 400 }
      );
    } catch (error: any) {
      log.error({ error: error.message }, 'MFA verification failed');
      return NextResponse.json(
        { error: 'MFA verification failed. Please try again.' },
        { status: 500 }
      );
    }
  })
);

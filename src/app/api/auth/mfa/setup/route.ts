// ============================================================
// DandoEv — MFA Setup API
// Generates TOTP secret, QR provisioning URI, and backup codes
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders } from '@/lib/api-handler';
import { generateTotpSecret, generateBackupCodes } from '@/lib/mfa';
import { encryptField } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export const POST = withSecurityHeaders(
  withAuth(async (req: NextRequest, ctx) => {
    try {
      const { secret, uri } = generateTotpSecret();
      const { rawCodes, hashedCodes } = generateBackupCodes();
      const encryptedSecret = encryptField(secret);

      // Persist the encrypted secret for the user in the database
      try {
        await prisma.user.update({
          where: { id: ctx.user.sub },
          data: {
            twoFactorSecret: encryptedSecret,
          },
        });
      } catch {
        // Ignored for in-memory demo account
      }

      return NextResponse.json({
        success: true,
        secret,
        qrUri: uri(ctx.user.email),
        backupCodes: rawCodes,
        encryptedSecretForConfirmation: encryptedSecret,
        hashedBackupCodes: hashedCodes,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to initialize MFA setup' },
        { status: 500 }
      );
    }
  })
);

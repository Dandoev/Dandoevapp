import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseToken, extractBearerToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { isDemoAllowed } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractBearerToken(authHeader) || req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifySupabaseToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        customerStatus: true,
        kycStatus: true,
        profileImageUrl: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      // Auto-provision from Supabase Auth if the user was authenticated directly through Supabase
      try {
        const { data: sData } = await supabaseAdmin.auth.admin.getUserById(decoded.sub);
        if (sData?.user) {
          const sUser = sData.user;
          const meta = sUser.user_metadata || {};
          user = await prisma.user.create({
            data: {
              id: sUser.id,
              email: sUser.email || decoded.email || `${sUser.id}@user.local`,
              firstName: meta.firstName || 'Customer',
              lastName: meta.lastName || 'User',
              phone: meta.phone || null,
              passwordHash: 'SUPABASE_AUTH',
              role: (meta.role as any) || decoded.role || 'customer',
              customerStatus: 'registered',
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              customerStatus: true,
              kycStatus: true,
              profileImageUrl: true,
              isEmailVerified: true,
              isPhoneVerified: true,
              createdAt: true,
              lastLoginAt: true,
            },
          });
        }
      } catch {
        // Fall through to demo checks
      }
    }

    if (!user) {
      if (isDemoAllowed() && decoded.sub === 'demo-admin-id') {
        return NextResponse.json({
          user: {
            id: decoded.sub,
            email: decoded.email,
            firstName: 'Local',
            lastName: 'Administrator',
            role: decoded.role,
          },
        });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const latestFaceLog = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: { in: ['MONO_PROVE_FACE_VERIFIED', 'MONO_PROVE_FACE_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { action: true },
    });
    // `kycStatus` is an overall account/application status and may be set by
    // Lookup or Connect. It must never imply that Mono Prove facial liveness
    // was completed. Only the explicit Prove success audit is authoritative.
    const faceVerified = latestFaceLog?.action === 'MONO_PROVE_FACE_VERIFIED';
    const identityLookup = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'MONO_LOOKUP_IDENTITY_VERIFIED' },
      select: { id: true },
    });
    const [proveStarted, connectStarted, financialAssessment, proofOfAddress] = await Promise.all([
      prisma.auditLog.findFirst({ where: { userId: user.id, action: 'MONO_PROVE_STARTED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.auditLog.findFirst({ where: { userId: user.id, action: 'MONO_CONNECT_STARTED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.auditLog.findFirst({ where: { userId: user.id, action: 'KYC_AND_STATEMENT_VERIFIED_MONO' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.kycDocument.findFirst({
        where: { userId: user.id, type: 'utility_bill' },
        orderBy: { uploadedAt: 'desc' },
        select: { id: true, fileName: true, fileUrl: true, verificationStatus: true, uploadedAt: true },
      }),
    ]);
    const kycStage = faceVerified
      ? (financialAssessment ? (proofOfAddress?.verificationStatus === 'verified' ? 'completed' : 'proof_of_address') : connectStarted ? 'bank_verification' : 'identity_lookup')
      : proveStarted ? 'facial_verification' : identityLookup ? 'facial_verification' : 'identity_lookup';
    const kycNextAction = kycStage === 'identity_lookup'
      ? 'verify_identity'
      : kycStage === 'facial_verification'
      ? 'complete_face_check'
      : kycStage === 'bank_verification'
      ? 'connect_bank'
      : kycStage === 'proof_of_address'
      ? 'upload_proof_of_address'
      : 'none';
    const proofComplete = proofOfAddress?.verificationStatus === 'verified';
    const effectiveKycStatus = user.kycStatus === 'failed'
      ? 'failed'
      : proofComplete && faceVerified
        ? 'verified'
        : 'pending';
    return NextResponse.json({
      user: {
        ...user,
        kycStatus: effectiveKycStatus,
        faceVerified,
        identityLookupVerified: Boolean(identityLookup),
        kycStage,
        kycNextAction,
        proofOfAddressStatus: proofOfAddress?.verificationStatus || 'not_started',
        proofOfAddress: proofOfAddress
          ? {
              id: proofOfAddress.id,
              fileName: proofOfAddress.fileName,
              fileUrl: proofOfAddress.fileUrl,
              verificationStatus: proofOfAddress.verificationStatus,
              uploadedAt: proofOfAddress.uploadedAt,
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Authentication internal error' }, { status: 500 });
  }
}

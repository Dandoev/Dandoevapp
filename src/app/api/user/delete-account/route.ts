import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { extractBearerToken, verifySupabaseToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "user/delete-account" });

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let { email, phone, reason } = body;

    // Check Authorization header fallback
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    const token = extractBearerToken(authHeader);
    let authUserId: string | null = null;

    if (token) {
      const payload = await verifySupabaseToken(token);
      if (!payload?.sub) {
        return NextResponse.json(
          { error: "Your session has expired. Please sign in again." },
          { status: 401 },
        );
      }

      // Never allow an authenticated request to select another account using
      // a user-supplied email or phone number.
      authUserId = payload.sub;
      email = payload.email || undefined;
      phone = undefined;
    }

    if (!email && !phone && !authUserId) {
      return NextResponse.json(
        { error: "Registered email or phone number is required." },
        { status: 400 },
      );
    }

    log.info(
      { email, phone, authUserId, reason },
      "Received account deletion request",
    );

    // Check if user exists in DB
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          authUserId ? { id: authUserId } : undefined,
          email ? { email: email.trim().toLowerCase() } : undefined,
          phone ? { phone: phone.trim() } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (user) {
      // Check for active or pending loans
      const activeLoans = await prisma.loan.findMany({
        where: {
          userId: user.id,
          status: { in: ["active", "approved", "under_review", "pending"] },
        },
      });

      if (activeLoans.length > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot delete account: You have an active or pending financing lease. Please settle your outstanding balance before requesting account deletion.",
          },
          { status: 400 },
        );
      }

      const recentRequest = await prisma.auditLog.findFirst({
        where: {
          userId: user.id,
          action: "ACCOUNT_DELETION_REQUESTED",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentRequest) {
        return NextResponse.json(
          {
            success: true,
            alreadyRequested: true,
            message: "Your account deletion request is already being reviewed.",
          },
          { status: 202 },
        );
      }

      // Log in audit logs
      await prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: "ACCOUNT_DELETION_REQUESTED",
            resource: "User",
            resourceId: user.id,
            details: JSON.stringify({
              reason:
                typeof reason === "string"
                  ? reason.slice(0, 500)
                  : "Not specified",
              requestedAt: new Date().toISOString(),
            }),
          },
        })
        .catch(() => null);

      // Notify admin team via email
      await sendEmail(
        "contactdandoev@gmail.com",
        `[Account Deletion Request] ${user.email}`,
        `<p>User <strong>${user.firstName || ""} ${user.lastName || ""}</strong> (${user.email}) requested account deletion.</p><p>Reason: ${reason || "N/A"}</p><p>User ID: ${user.id}</p>`,
      ).catch(() => null);
    } else {
      // If user not in DB (e.g. mobile-only or guest), still forward notice to privacy team
      await sendEmail(
        "contactdandoev@gmail.com",
        `[Account Deletion Request] Unregistered/Guest ${email || phone}`,
        `<p>A deletion request was submitted for: ${email || phone}</p><p>Reason: ${reason || "N/A"}</p>`,
      ).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Account deletion request received and queued for identity verification.",
      },
      { status: 202 },
    );
  } catch (error: any) {
    log.error(
      { error: error.message },
      "Failed to process account deletion request",
    );
    return NextResponse.json(
      { error: "Internal server error processing deletion request." },
      { status: 500 },
    );
  }
}

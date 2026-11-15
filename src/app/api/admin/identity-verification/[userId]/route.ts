import { NextRequest, NextResponse } from "next/server";
import { withRoles, type ApiContext } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { decryptField } from "@/lib/encryption";

const roles = ["super_admin", "compliance_officer", "credit_underwriter"];

/** Manual fallback while Mono Lookup is not enabled. Does not mark facial KYC verified. */
export const POST = withRoles(roles, async (req: NextRequest, ctx: ApiContext) => {
  const userId = req.nextUrl.pathname.split("/").pop();
  if (!userId) return NextResponse.json({ error: "User id is required" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, bvn: true, ninNumber: true } });
  if (!user) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });

  const bvn = user.bvn ? decryptField(user.bvn) || "" : "";
  const nin = user.ninNumber ? decryptField(user.ninNumber) || "" : "";
  if (!/^\d{11}$/.test(bvn) || !/^\d{11}$/.test(nin)) {
    return NextResponse.json({ error: "Applicant must have valid 11-digit BVN and NIN before manual confirmation" }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "MONO_LOOKUP_IDENTITY_VERIFIED",
      resource: "kyc",
      resourceId: userId,
      details: JSON.stringify({ provider: "manual_admin", bvnConfirmed: true, ninConfirmed: true, confirmedBy: ctx.user.sub }),
    },
  });

  return NextResponse.json({ success: true, verified: true, provider: "manual_admin", message: "BVN and NIN manually confirmed. Applicant may continue to facial verification." });
});

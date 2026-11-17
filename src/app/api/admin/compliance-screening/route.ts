import { NextRequest, NextResponse } from "next/server";
import { withRoles, type ApiContext } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const GET = withRoles(["super_admin", "credit_underwriter", "finance_admin", "compliance_officer"], async (req: NextRequest, _ctx: ApiContext) => {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const logs = await prisma.auditLog.findMany({
    where: { userId, action: { in: ["MONO_CREDIT_HISTORY_COMPLETED", "MONO_CREDIT_HISTORY_FAILED", "MONO_WATCHLIST_SUBMITTED", "MONO_WATCHLIST_COMPLETED", "MONO_WATCHLIST_FAILED", "MONO_WATCHLIST_MATCH_FOUND"] } },
    orderBy: { createdAt: "desc" }, take: 20,
  });
  return NextResponse.json({ success: true, data: logs });
});

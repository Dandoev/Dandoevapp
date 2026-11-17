import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type ApiContext } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { initiateMonoConnect } from "@/lib/mono";

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const reference = `CONNECT-${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const requestedRedirect = typeof body.redirectUrl === "string" ? body.redirectUrl : "";
  let redirectUrl: string;
  try {
    const parsed = new URL(requestedRedirect);
    const allowedHosts = new Set([req.nextUrl.host, "dandoevapp.onrender.com", "dashboard.dandoev.com"]);
    if (!allowedHosts.has(parsed.host) || parsed.pathname !== "/mono-connect/mobile-return" ||
        !(parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost"))) throw new Error("Invalid redirect");
    redirectUrl = parsed.toString();
  } catch {
    return NextResponse.json({ error: "Valid DandoEv Mono return URL required" }, { status: 400 });
  }
  try {
    const session = await initiateMonoConnect({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      reference,
      redirectUrl,
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "MONO_CONNECT_STARTED",
        resource: "kyc",
        resourceId: reference,
        details: JSON.stringify({ reference }),
      },
    });
    return NextResponse.json({
      success: true,
      data: { ...session, reference },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start bank connection",
      },
      { status: 502 },
    );
  }
});

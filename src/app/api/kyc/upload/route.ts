import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { uploadFile } from "@/lib/storage";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File size too large (max 5 MB)" }, { status: 413 });
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ error: "Only PDF, JPEG, and PNG files are accepted" }, { status: 415 });
    }
    const result = await uploadFile(Buffer.from(await file.arrayBuffer()), "kyc-documents", `${ctx.user.sub}-proof-of-address-${Date.now()}-${file.name}`);
    const document = await prisma.kycDocument.create({
      data: {
        userId: ctx.user.sub,
        type: "utility_bill",
        fileName: file.name,
        fileUrl: result.url,
        verificationStatus: "pending",
      },
    });
    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proof of address upload failed" }, { status: 500 });
  }
});

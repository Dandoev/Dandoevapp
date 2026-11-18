import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { uploadFile } from "@/lib/storage";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!(file instanceof File) || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "The uploaded file could not be read. Please select the file again." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File size too large (max 5 MB)" }, { status: 413 });
    const originalName = String(file.name || "proof-of-address");
    const fileName = originalName.toLowerCase();
    const extensionType = fileName.endsWith(".pdf")
      ? "application/pdf"
      : fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")
        ? "image/jpeg"
        : fileName.endsWith(".png")
          ? "image/png"
          : null;
    const suppliedType = String(file.type || "").toLowerCase().split(";")[0];
    const mimeType = suppliedType === "image/jpg" ? "image/jpeg" : suppliedType;
    const buffer = Buffer.from(await file.arrayBuffer());
    const header = buffer.toString("hex", 0, 8).toUpperCase();
    const contentType = header.startsWith("25504446") ? "application/pdf" : header.startsWith("89504E47") ? "image/png" : header.startsWith("FFD8FF") ? "image/jpeg" : null;
    const effectiveType = contentType || (!mimeType || mimeType === "application/octet-stream" ? extensionType : mimeType) || extensionType;
    if (!effectiveType || !["application/pdf", "image/jpeg", "image/png"].includes(effectiveType)) {
      return NextResponse.json({ error: "Only PDF, JPEG, and PNG files are accepted" }, { status: 415 });
    }
    const result = await uploadFile(buffer, "kyc-documents", `${ctx.user.sub}-proof-of-address-${Date.now()}-${originalName}`);
    const document = await prisma.kycDocument.create({
      data: {
        userId: ctx.user.sub,
        type: "utility_bill",
        fileName: originalName,
        fileUrl: result.url,
        verificationStatus: "pending",
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        ...document,
        url: document.fileUrl,
        fileName: document.fileName,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proof of address upload failed" }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import { uploadFile } from '@/lib/storage';
import logger from '@/lib/logger';

/**
 * POST /api/upload
 * Multi-purpose secure file upload endpoint.
 * Limited to 5MB for KYC/Documents.
 */
export const POST = withAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const log = logger.child({ requestId: ctx.requestId, route: 'upload' });

    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const folder = formData.get('folder') as string || 'documents';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Max 5MB
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File size too large (Max 5MB)' }, { status: 413 });
      }

      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      if (file.type && !allowed.includes(file.type)) {
        return NextResponse.json({ error: 'Only PDF, JPEG, and PNG files are accepted' }, { status: 415 });
      }

      // Read file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary (or mock)
      const result = await uploadFile(buffer, folder, file.name);

      log.info({ userId: ctx.user.sub, fileName: file.name, url: result.url }, 'File uploaded successfully');

      return NextResponse.json({
        success: true,
        data: {
          url: result.url,
          fileName: file.name,
          publicId: result.publicId
        }
      });

    } catch (error: any) {
      log.error({ error: error.message }, 'File upload failed');
      return NextResponse.json({ error: 'Upload failed. Check file type and size.' }, { status: 500 });
    }
  }
);

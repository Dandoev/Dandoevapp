import { supabaseAdmin } from './supabase';

export interface UploadResult {
  url: string;
  publicId: string;
  provider: 'supabase' | 'mock';
}

/**
 * Simple magic-number based MIME type detection.
 * Supports PDF, JPEG, PNG.
 */
function getMimeType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 8).toUpperCase();
  if (header.startsWith('25504446')) return 'application/pdf';
  if (header.startsWith('FFD8FF')) return 'image/jpeg';
  if (header.startsWith('89504E47')) return 'image/png';
  return 'application/octet-stream';
}

/**
 * Upload an image or PDF to Supabase Storage.
 * Exclusively uses Supabase for production-ready storage.
 */
export async function uploadFile(
  buffer: Buffer,
  folder: string = 'documents',
  fileName?: string
): Promise<UploadResult> {
  const contentType = getMimeType(buffer);
  const finalFileName = fileName || `file_${Date.now()}`;
  
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (hasSupabase) {
    const bucketName = 'dandoev-docs';
    const safeName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    
    try {
      const { data: bucket } = await supabaseAdmin.storage.getBucket(bucketName);
      if (!bucket) {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucketName, { public: true, fileSizeLimit: '5MB', allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] });
        if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;
      }
      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          upsert: true,
          contentType: contentType
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        publicId: data?.path || filePath,
        provider: 'supabase'
      };
    } catch (error: any) {
      console.error('Supabase upload error:', error.message);
    }
  }

  throw new Error('Supabase Storage is not configured. Document was not saved.');
}

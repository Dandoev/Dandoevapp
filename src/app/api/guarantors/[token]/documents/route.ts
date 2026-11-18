import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guarantor = await prisma.guarantor.findUnique({ where: { inviteTokenHash: hash(token) }, select: { id: true, inviteExpiresAt: true } });
  if (!guarantor || !guarantor.inviteExpiresAt || guarantor.inviteExpiresAt < new Date()) return NextResponse.json({ error: 'This invitation is invalid or expired' }, { status: 404 });
  const form = await req.formData();
  const file = form.get('file');
  const documentType = String(form.get('documentType') || '');
  if (!(file instanceof File) || !['identity_document', 'proof_of_address', 'work_id'].includes(documentType)) return NextResponse.json({ error: 'A valid document is required' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024 || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'File must be 5 MB or smaller' }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const header = buffer.toString('hex', 0, 8).toUpperCase();
  const type = header.startsWith('25504446') ? 'application/pdf' : header.startsWith('89504E47') ? 'image/png' : header.startsWith('FFD8FF') ? 'image/jpeg' : '';
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(type)) return NextResponse.json({ error: 'Only PDF, JPEG, and PNG files are accepted' }, { status: 415 });
  const result = await uploadFile(buffer, 'guarantor-documents', `${guarantor.id}-${documentType}-${file.name}`);
  await prisma.guarantor.update({ where: { id: guarantor.id }, data: documentType === 'identity_document' ? { idDocumentUrl: result.url } : documentType === 'proof_of_address' ? { proofOfAddressUrl: result.url } : { workIdUrl: result.url } });
  return NextResponse.json({ success: true, data: { url: result.url, documentType } });
}

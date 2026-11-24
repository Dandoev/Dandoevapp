import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/resend';

const schema = z.object({
  recipientMode: z.enum(['custom', 'all_customers', 'all_users']),
  recipients: z.array(z.string().email()).max(500).default([]),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100000),
});

export const POST = withRoles(
  ['super_admin', 'operations_admin', 'finance_admin', 'compliance_officer'],
  async (request: NextRequest, context: ApiContext) => {
    try {
      const input = schema.parse(await request.json());
      let recipients = input.recipients;

      if (input.recipientMode !== 'custom') {
        const users = await prisma.user.findMany({
          where: input.recipientMode === 'all_customers' ? { role: 'customer' } : {},
          select: { email: true },
          take: 500,
        });
        recipients = users.map((user) => user.email).filter(Boolean);
      }

      recipients = [...new Set(recipients.map((email) => email.trim().toLowerCase()))];
      if (!recipients.length) return NextResponse.json({ error: 'Add at least one recipient.' }, { status: 400 });

      const results = await Promise.allSettled(recipients.map((to) => sendEmail(to, input.subject, input.html)));
      const failures = results.flatMap((result, index) => result.status === 'rejected'
        ? [{ email: recipients[index], error: result.reason instanceof Error ? result.reason.message : 'Delivery failed' }]
        : []);

      await prisma.auditLog.create({
        data: {
          userId: context.user.sub,
          action: 'ADMIN_EMAIL_SENT',
          resource: 'email',
          details: JSON.stringify({ subject: input.subject, recipientMode: input.recipientMode, sent: results.length - failures.length, failed: failures.length }),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, sent: results.length - failures.length, failed: failures.length, failures });
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid email content or recipients.', details: error.flatten() }, { status: 400 });
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, { status: 500 });
    }
  },
);

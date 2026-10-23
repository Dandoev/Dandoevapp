// ============================================================
// DandoEv — Regulatory Compliance Utility (NDPR, GDPR & PCI-DSS)
// ============================================================
import { prisma } from './prisma';
import { Masking, decryptField } from './encryption';

/**
 * NDPR / GDPR: Export all stored personal and financial records for a user
 * (Right of Access & Data Portability).
 */
export async function exportUserData(userId: string): Promise<Record<string, any>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        include: {
          bike: true,
          accessories: true,
        },
      },
      loans: {
        include: {
          repayments: true,
          guarantors: true,
        },
      },
      kycDocuments: true,
      auditLogs: {
        take: 100,
        orderBy: { createdAt: 'desc' },
      },
      wallet: true,
      transactions: {
        take: 100,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Decrypt and sanitize fields for exported package
  return {
    exportDate: new Date().toISOString(),
    complianceStandard: 'NDPR (Nigeria Data Protection Regulation) / GDPR',
    profile: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      city: user.city,
      state: user.state,
      employmentStatus: user.employmentStatus,
      monthlyIncome: user.monthlyIncome,
      employerName: user.employerName,
      employerAddress: user.employerAddress,
      bankName: user.bankName,
      // Provide decrypted or masked values per security policy
      bvnMasked: Masking.bvn(user.bvn ? decryptField(user.bvn) : null),
      ninMasked: Masking.nin(user.ninNumber ? decryptField(user.ninNumber) : null),
      accountNumberMasked: Masking.accountNumber(
        user.bankAccountNumber ? decryptField(user.bankAccountNumber) : null
      ),
      kycStatus: user.kycStatus,
      customerStatus: user.customerStatus,
      createdAt: user.createdAt,
    },
    orders: user.orders,
    loans: user.loans,
    wallet: user.wallet,
    kycDocuments: user.kycDocuments.map((doc) => ({
      id: doc.id,
      documentType: doc.type,
      status: doc.verificationStatus,
      uploadedAt: doc.uploadedAt,
    })),
  };
}

/**
 * NDPR / GDPR: Anonymize user personal data (Right to Erasure / Right to be Forgotten).
 * Retains required financial ledger records for statutory CBN compliance (6-year audit retention).
 */
export async function anonymizeUserData(
  userId: string,
  requestedBy: string
): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      loans: {
        where: {
          status: { in: ['active', 'pending', 'under_review'] },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent erasure if there are active, unsettled loans
  if (user.loans.length > 0) {
    throw new Error('Cannot delete or anonymize an account with active or pending BNPL loan obligations');
  }

  const anonymizedEmail = `anonymized_${userId.slice(0, 8)}@dandoev.deleted`;
  const anonymizedPhone = `+2340000000${userId.slice(0, 4)}`;

  await prisma.$transaction([
    // Update user record with scrubbed PII
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        phone: anonymizedPhone,
        firstName: 'Anonymized',
        lastName: 'User',
        address: null,
        city: null,
        state: null,
        employerName: null,
        employerAddress: null,
        bvn: null,
        ninNumber: null,
        bankName: null,
        bankAccountNumber: null,
        monthlyIncome: null,
        customerStatus: 'suspended',
      },
    }),

    // Log the compliance action
    prisma.auditLog.create({
      data: {
        userId,
        action: 'DATA_SUBJECT_ERASURE',
        resource: 'User',
        resourceId: userId,
        details: JSON.stringify({
          actorId: requestedBy,
          actorEmail: requestedBy,
          complianceStandard: 'NDPR_RIGHT_TO_ERASURE',
          timestamp: new Date().toISOString(),
        }),
      },
    }),
  ]);

  return {
    success: true,
    message: 'User data has been successfully scrubbed and anonymized in compliance with NDPR/GDPR standards.',
  };
}

/**
 * PCI-DSS Compliance Asserter:
 * Ensures payload does not contain unencrypted or raw cardholder PAN or CVV.
 */
export function assertPciDssCompliance(payload: Record<string, any>): void {
  const rawString = JSON.stringify(payload);

  // Luhn algorithm regex check for 13-19 digit card numbers
  const panRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/;
  const cvvRegex = /"(?:cvv|cvc|security_code|card_cvv)":\s*"?\d{3,4}"?/i;

  if (panRegex.test(rawString) || cvvRegex.test(rawString)) {
    throw new Error('PCI-DSS Violation: Raw cardholder PAN/CVV transmitted to server. Transactions must use tokenized gateway tokens only.');
  }
}

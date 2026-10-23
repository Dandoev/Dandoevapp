// ============================================================
// DandoEv — Real-Time Fraud & Anomaly Detection Engine
// Analyzes velocity, geo-IP, loan ratios, and behavioral patterns
// ============================================================
import { prisma } from './prisma';

export interface FraudEvaluationContext {
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  amount?: number;
  loanAmount?: number;
  monthlyIncome?: number;
  actionType: 'TRANSACTION' | 'LOAN_APPLICATION' | 'LOGIN' | 'PASSWORD_RESET' | 'BANK_CHANGE';
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction = 'ALLOW' | 'STEP_UP_MFA' | 'MANUAL_REVIEW' | 'BLOCK';

export interface FraudAssessmentResult {
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  action: RecommendedAction;
  triggeredRules: string[];
  reasons: string[];
}

/**
 * Evaluates risk score in real-time based on multiple fraud vectors.
 */
export async function evaluateRisk(context: FraudEvaluationContext): Promise<FraudAssessmentResult> {
  let riskScore = 0;
  const triggeredRules: string[] = [];
  const reasons: string[] = [];

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------
  // Rule 1: IP Velocity & Anomaly Checks
  // ---------------------------------------------------------
  if (context.userId) {
    try {
      // Check recent failed attempts or velocity for the user
      const recentAuditLogs = await prisma.auditLog.findMany({
        where: {
          userId: context.userId,
          createdAt: { gte: oneHourAgo },
        },
        take: 20,
      });

      const failedLogins = recentAuditLogs.filter(
        (log) => log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED'
      );

      if (failedLogins.length >= 5) {
        riskScore += 45;
        triggeredRules.push('HIGH_FAILED_LOGIN_VELOCITY');
        reasons.push(`${failedLogins.length} failed login attempts detected in the last hour.`);
      } else if (failedLogins.length >= 3) {
        riskScore += 20;
        triggeredRules.push('MODERATE_FAILED_LOGIN_VELOCITY');
        reasons.push(`${failedLogins.length} failed login attempts detected recently.`);
      }
    } catch {
      // Database unavailable in local/demo mode — continue rule evaluation safely
    }
  }

  // ---------------------------------------------------------
  // Rule 2: Transaction & Payment Velocity
  // ---------------------------------------------------------
  if (context.userId && context.actionType === 'TRANSACTION') {
    try {
      const recentTransactions = await prisma.paymentTransaction.findMany({
        where: {
          userId: context.userId,
          createdAt: { gte: oneHourAgo },
        },
      });

      const failedTransactions = recentTransactions.filter((tx) => tx.status === 'failed');

      if (failedTransactions.length >= 3) {
        riskScore += 40;
        triggeredRules.push('EXCESSIVE_FAILED_PAYMENTS');
        reasons.push('Multiple consecutive failed payment transactions detected.');
      }
    } catch {
      // Non-fatal fallback when Prisma is offline
    }

    if (context.amount && context.amount > 2000000) {
      riskScore += 25;
      triggeredRules.push('HIGH_VALUE_TRANSACTION');
      reasons.push('Transaction amount exceeds high-value threshold (> ₦2,000,000).');
    }
  }

  // ---------------------------------------------------------
  // Rule 3: BNPL Loan Application Ratio & Credit Assessment
  // ---------------------------------------------------------
  if (context.actionType === 'LOAN_APPLICATION') {
    if (context.userId && context.userId !== 'demo-customer-id') {
      try {
        // Check if user has active/defaulted loans
        const existingLoans = await prisma.loan.findMany({
          where: {
            userId: context.userId,
            status: { in: ['pending', 'under_review', 'defaulted'] },
          },
        });

        const defaultedLoan = existingLoans.find((l) => l.status === 'defaulted');
        if (defaultedLoan) {
          riskScore += 60;
          triggeredRules.push('EXISTING_DEFAULTED_LOAN');
          reasons.push('User currently has an unresolved defaulted BNPL loan.');
        }

        const pendingLoan = existingLoans.find(
          (l) => l.status === 'pending' || l.status === 'under_review'
        );
        if (pendingLoan) {
          riskScore += 20;
          triggeredRules.push('CONCURRENT_LOAN_APPLICATION');
          reasons.push('User already has a pending BNPL loan under review.');
        }
      } catch {
        // Non-fatal fallback when Prisma is offline
      }
    }

    // Debt-to-income sanity checks
    if (context.loanAmount && context.monthlyIncome) {
      const loanToIncomeRatio = context.loanAmount / context.monthlyIncome;
      if (loanToIncomeRatio > 10) {
        riskScore += 35;
        triggeredRules.push('EXTREME_DEBT_TO_INCOME_RATIO');
        reasons.push('Requested loan amount significantly exceeds monthly income capacity.');
      }
    }
  }

  // ---------------------------------------------------------
  // Rule 4: Critical Account Modifications (Bank / Security)
  // ---------------------------------------------------------
  if (context.actionType === 'BANK_CHANGE' || context.actionType === 'PASSWORD_RESET') {
    riskScore += 20;
    triggeredRules.push('SENSITIVE_SECURITY_MUTATION');
    reasons.push('Sensitive account security modification requested.');
  }

  // Cap score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, riskScore));

  // Determine Risk Level and Recommended Action
  let riskLevel: RiskLevel = 'LOW';
  let action: RecommendedAction = 'ALLOW';

  if (normalizedScore >= 75) {
    riskLevel = 'CRITICAL';
    action = 'BLOCK';
  } else if (normalizedScore >= 50) {
    riskLevel = 'HIGH';
    action = 'MANUAL_REVIEW';
  } else if (normalizedScore >= 25) {
    riskLevel = 'MEDIUM';
    action = 'STEP_UP_MFA';
  } else {
    riskLevel = 'LOW';
    action = 'ALLOW';
  }

  return {
    riskScore: normalizedScore,
    riskLevel,
    action,
    triggeredRules,
    reasons,
  };
}

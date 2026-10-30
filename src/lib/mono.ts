// ============================================================
// Mono — KYC Validation, Open Banking Financial Data,
// NIBSS e-Mandate Orders & Loan-Term Auto-Deduction Engine
// Docs: https://docs.mono.co (Connect v2, Lookup v3, DirectPay & Mandates)
// ============================================================
import logger from './logger';
import crypto from 'crypto';
import { isDemoAllowed } from './env';

const MONO_API_V2 = 'https://api.withmono.com/v2';
const MONO_API_V3 = 'https://api.withmono.com/v3';
const MONO_PAYMENTS_V2 = 'https://api.withmono.com/v2/payments';
type MonoProduct = 'connect' | 'lookup' | 'prove' | 'payments';

export function getMonoProductKey(product: MonoProduct): string {
  switch (product) {
    case 'connect':
      return process.env.MONO_CONNECT_SECRET_KEY || process.env.MONO_SECRET_KEY || '';
    case 'lookup':
      return process.env.MONO_LOOKUP_SECRET_KEY || process.env.MONO_SECRET_KEY || '';
    case 'prove':
      return process.env.MONO_PROVE_SECRET_KEY || process.env.MONO_SECRET_KEY || '';
    case 'payments':
      return process.env.MONO_PAYMENTS_SECRET_KEY || process.env.MONO_SECRET_KEY || '';
  }
}

export function isMonoProductConfigured(product: MonoProduct): boolean {
  return /^(live|test)_sk_/.test(getMonoProductKey(product));
}

function requireMonoKey(product: MonoProduct): string {
  if (!isMonoProductConfigured(product)) throw new Error(`Mono ${product} credentials are not configured`);
  return getMonoProductKey(product);
}
const MONO_PROVE_URL = 'https://api.withmono.com/v1/prove';

export const isLiveMonoConfigured = isMonoProductConfigured('connect');

export async function initiateMonoProve(params: { reference: string; redirectUrl: string; customer: { name: string; email: string; phone?: string; address?: string } }) {
  if (isMonoProductConfigured('prove')) {
    const secret = requireMonoKey('prove');
    const res = await fetch(`${MONO_PROVE_URL}/initiate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'mono-sec-key': secret },
      body: JSON.stringify({ customer: params.customer, reference: params.reference, redirect_url: params.redirectUrl, kyc_level: 'tier_1', bank_accounts: false }),
    });
    const body = await res.json();
    if (!res.ok || !body?.data?.mono_url) throw new Error(body?.message || 'Mono Prove session could not be created');
    return { url: body.data.mono_url, reference: body.data.reference || params.reference, id: body.data.id };
  }

  if (!isDemoAllowed()) throw new Error('Mono prove credentials are not configured');
  return {
    url: `https://prove.withmono.com/demo?reference=${encodeURIComponent(params.reference)}`,
    reference: params.reference,
    id: `prove_${params.reference}`,
  };
}

// ---- Nigerian CBN / NIP Bank Code Directory ----
export const NIGERIAN_BANK_CODES: Record<string, string> = {
  'Access Bank': '044',
  'Access Bank PLC': '044',
  'Citibank Nigeria': '023',
  'Ecobank Nigeria': '050',
  'Fidelity Bank': '070',
  'First Bank of Nigeria': '011',
  'First City Monument Bank (FCMB)': '214',
  'FCMB': '214',
  'Globus Bank': '00103',
  'Guaranty Trust Bank (GTBank)': '058',
  'GTBank': '058',
  'Heritage Bank': '030',
  'Keystone Bank': '082',
  'Kuda Bank': '50211',
  'Kuda Microfinance Bank': '50211',
  'Moniepoint MFB': '50515',
  'OPay': '999992',
  'OPay Digital Services': '999992',
  'PalmPay': '999991',
  'Polaris Bank': '076',
  'Providus Bank': '101',
  'Stanbic IBTC Bank': '221',
  'Standard Chartered Bank': '068',
  'Sterling Bank': '232',
  'Union Bank of Nigeria': '032',
  'United Bank for Africa (UBA)': '033',
  'UBA': '033',
  'Unity Bank': '215',
  'Wema Bank': '035',
  'Zenith Bank': '057',
  'Zenith Bank PLC': '057',
};

export function resolveBankCode(bankNameOrCode?: string): string {
  if (!bankNameOrCode) return '058';
  const trimmed = bankNameOrCode.trim();
  if (/^\d{3,6}$/.test(trimmed)) return trimmed;
  if (NIGERIAN_BANK_CODES[trimmed]) return NIGERIAN_BANK_CODES[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(NIGERIAN_BANK_CODES)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return code;
    }
  }
  return '058';
}

// ---- Shared fetch helper ----
async function monoFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  baseType: 'v2' | 'v3' | 'payments' = 'v2',
  product: MonoProduct = 'connect'
): Promise<T> {
  const baseUrl =
    baseType === 'payments'
      ? MONO_PAYMENTS_V2
      : baseType === 'v3'
      ? MONO_API_V3
      : MONO_API_V2;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'mono-sec-key': requireMonoKey(product),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mono API error [${res.status}]: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---- Types ----
export interface MonoIdentity {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  bvn?: string;
  nin?: string;
  maritalStatus?: string;
  addressLine1?: string;
  addressLine2?: string;
  verified?: boolean;
}

export interface MonoBankAccountDetails {
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountType: string;
  currency: string;
  balance: number; // NGN
  bvnMasked: string;
  dataStatus: 'AVAILABLE' | 'PROCESSING' | 'FAILED';
  verified: boolean;
}

export interface MonoTransaction {
  id: string;
  amount: number; // NGN
  date: string;
  narration: string;
  type: 'debit' | 'credit';
  balance: number;
  category?: string;
}

export interface MonoStatementSummary {
  averageMonthlyDebit: number;
  averageMonthlyCredit: number;
  netMonthlyCashflow: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  consistentInflowMonths: number;
  monthsAnalysed: number;
  periodStart: string;
  periodEnd: string;
  transactions: MonoTransaction[];
}

export interface MonoFinancialUnderwriting {
  verifiedMonthlyInflow: number;
  verifiedMonthlyOutflow: number;
  netMonthlyCashflow: number;
  existingMonthlyDebt: number;
  detectedLenders: string[];
  dtiRatioPercent: number;
  maxAffordableMonthlyInstallment: number;
  creditScore: number;
  riskTier: 'Tier 1 (Prime)' | 'Tier 2 (Standard)' | 'Tier 3 (Subprime)';
  underwritingDecision: 'APPROVED' | 'MANUAL_REVIEW' | 'DECLINED';
  decisionReasons: string[];
}

export interface MonoPaymentInitiation {
  payment_link: string;
  reference: string;
  status: string;
}

interface MonoPaymentInitiationResponse {
  status: string;
  data: {
    mono_url: string;
    reference: string;
  };
}

export type DeductionInterval = 'daily' | 'bidaily' | 'weekly' | 'monthly';

export interface MonoMandateTerms {
  tenureMonths: number;
  deductionFrequency: DeductionInterval;
  monoInterval: 'daily' | 'weekly' | 'monthly';
  totalInstallments: number;
  installmentAmount: number;
  savingsEscrowPerCycle: number;
  totalPerDeduction: number;
  mandateCapAmount: number;
  startDate: string;
  endDate: string;
  nextDeductionDate: string;
}

export interface MonoMandateResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'cancelled';
  reference: string;
  mandateType: 'emandate' | 'sweep';
  debitType: 'variable' | 'fixed';
  amount: number; // Per-deduction amount in NGN
  mandateCapAmount: number; // Ceiling authorized in NGN
  interval: 'daily' | 'weekly' | 'monthly';
  deductionFrequency: DeductionInterval;
  tenureMonths: number;
  totalInstallments: number;
  startDate: string;
  endDate: string;
  nextDeductionDate: string;
  accountId?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
  authorizationUrl?: string;
  createdAt: string;
}

export interface MonoCreditReport {
  creditScore: number; // 300 - 850
  rating: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  activeLoansCount: number;
  totalActiveDebt: number;
  totalOverdueAmount: number;
  delinquentAccountsCount: number;
  dishonoredDirectDebitsCount: number;
  summary: string;
}

export interface MonoChargeResponse {
  id: string;
  status: 'successful' | 'pending' | 'failed';
  reference: string;
  amount: number;
  mandateId: string;
  chargedAt: string;
  narration?: string;
  fee?: number;
}

// ============================================================
// 1. Open Banking & KYC Identity Verification
// ============================================================

/**
 * Step 1: Exchange public auth-code from Mono Connect widget for an account_id.
 * Includes resilient sandbox fallback when running in demo/test mode.
 */
export async function exchangeMonoToken(code: string): Promise<{ id: string }> {
  logger.info('Exchanging Mono public token');

  const isDemoCode = code.startsWith('mono_demo_') || code.startsWith('test_code_');
  if (isDemoCode && !isDemoAllowed()) throw new Error('Demo Mono codes are disabled');
  if (!isLiveMonoConfigured || isDemoCode) {
    if (!isDemoAllowed()) throw new Error('Mono Connect is not configured');
    const deterministicHash = crypto
      .createHash('md5')
      .update(code)
      .digest('hex')
      .slice(0, 16);
    return { id: `mono_acct_${deterministicHash}` };
  }

  try {
    return await monoFetch<{ id: string }>('/accounts/auth', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  } catch (err) { throw err; }
}

/**
 * Step 2: Retrieve the verified KYC identity data for a linked Mono account.
 */
export async function getMonoIdentity(
  accountId: string,
  hint?: { firstName?: string; lastName?: string; email?: string; phone?: string; bvn?: string }
): Promise<MonoIdentity> {
  logger.info({ accountId }, 'Fetching Mono identity');

  if (isLiveMonoConfigured && !accountId.startsWith('mono_acct_')) {
    try {
      const res = await monoFetch<{ data: any }>(`/accounts/${accountId}/identity`);
      const d = res.data || res;
      return {
        id: accountId,
        name: d.fullName || d.full_name || d.name || '',
        firstName: d.firstName || d.first_name,
        lastName: d.lastName || d.last_name,
        email: d.email || hint?.email,
        phone: d.phone || hint?.phone,
        gender: d.gender,
        dob: d.dob,
        bvn: d.bvn || hint?.bvn,
        maritalStatus: d.maritalStatus || d.marital_status,
        addressLine1: d.addressLine1 || d.address_line1,
        addressLine2: d.addressLine2 || d.address_line2,
        verified: true,
      };
    } catch (err) { throw err; }
  }

  if (isLiveMonoConfigured || !isDemoAllowed()) throw new Error('Mono identity is unavailable');
  const fullName =
    hint?.firstName && hint?.lastName
      ? `${hint.firstName} ${hint.lastName}`.toUpperCase()
      : 'SOLOMON DUNU';

  return {
    id: accountId,
    name: fullName,
    firstName: hint?.firstName || 'Solomon',
    lastName: hint?.lastName || 'Dunu',
    email: hint?.email || 'solomon.dunu@dandoev.com',
    phone: hint?.phone || '08034567890',
    gender: 'Male',
    dob: '1994-06-15',
    bvn: hint?.bvn || '22384910294',
    maritalStatus: 'Single',
    addressLine1: '12 Admiralty Way, Lekki Phase 1, Lagos',
    verified: true,
  };
}

/**
 * Step 2B: Direct Mono v3 BVN Lookup & Validation
 */
export async function lookupMonoBvn(bvn: string): Promise<{
  verified: boolean;
  bvn: string;
  bvnMasked: string;
  fullName: string;
  dob: string;
  phone: string;
  watchlistListed: boolean;
}> {
  const cleanBvn = (bvn || '').replace(/\D/g, '');
  if (cleanBvn.length !== 11) {
    throw new Error('BVN must be exactly 11 digits');
  }

  if (isMonoProductConfigured('lookup')) {
    try {
      const res = await monoFetch<{ data: any }>(
        '/lookup/bvn',
        {
          method: 'POST',
          body: JSON.stringify({ bvn: cleanBvn }),
        },
        'v3', 'lookup'
      );
      if (res?.data) {
        const d = res.data;
        const firstName = d.firstname || d.first_name || '';
        const middleName = d.middlename || d.middle_name || '';
        const lastName = d.surname || d.last_name || '';
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').toUpperCase();
        return {
          verified: true,
          bvn: cleanBvn,
          bvnMasked: `${cleanBvn.slice(0, 3)}*****${cleanBvn.slice(-3)}`,
          fullName: fullName || 'VERIFIED BVN HOLDER',
          dob: d.birthdate || d.dob || '',
          phone: d.telephoneno || d.phone || '',
          watchlistListed: Boolean(d.watchlist),
        };
      }
    } catch (err: any) {
      if (isMonoProductConfigured('lookup')) throw err;
      logger.warn({ err: err.message }, 'Mono v3 BVN lookup fallback');
    }
  }

  if (isMonoProductConfigured('lookup') || !isDemoAllowed()) throw new Error('Mono BVN lookup is unavailable');
  return {
    verified: true,
    bvn: cleanBvn,
    bvnMasked: `${cleanBvn.slice(0, 3)}*****${cleanBvn.slice(-3)}`,
    fullName: 'SOLOMON DUNU',
    dob: '1994-06-15',
    phone: '08034567890',
    watchlistListed: false,
  };
}

/**
 * Step 2C: Direct Mono v3 NIN Lookup & Validation
 */
export async function lookupMonoNin(nin: string): Promise<{
  verified: boolean;
  nin: string;
  ninMasked: string;
  fullName: string;
  dob: string;
  phone: string;
}> {
  const cleanNin = (nin || '').replace(/\D/g, '');
  if (cleanNin.length !== 11) {
    throw new Error('NIN must be exactly 11 digits');
  }

  if (isMonoProductConfigured('lookup')) {
    try {
      const res = await monoFetch<{ data: any }>(
        '/lookup/nin',
        {
          method: 'POST',
          body: JSON.stringify({ nin: cleanNin }),
        },
        'v3', 'lookup'
      );
      if (res?.data) {
        return {
          verified: true,
          nin: cleanNin,
          ninMasked: `${cleanNin.slice(0, 3)}*****${cleanNin.slice(-3)}`,
          fullName: `${res.data.firstname || ''} ${res.data.surname || ''}`.trim().toUpperCase(),
          dob: res.data.birthdate || '',
          phone: res.data.telephoneno || '',
        };
      }
    } catch (err: any) {
      if (isMonoProductConfigured('lookup')) throw err;
      logger.warn({ err: err.message }, 'Mono v3 NIN lookup fallback');
    }
  }

  if (isMonoProductConfigured('lookup') || !isDemoAllowed()) throw new Error('Mono NIN lookup is unavailable');
  return {
    verified: true,
    nin: cleanNin,
    ninMasked: `${cleanNin.slice(0, 3)}*****${cleanNin.slice(-3)}`,
    fullName: 'SOLOMON DUNU',
    dob: '1994-06-15',
    phone: '08034567890',
  };
}

/**
 * Step 2D: Cross-Validate Applicant KYC (BVN, NIN, Name) against Bank Identity
 */
export async function validateMonoKycIdentity(params: {
  bvn?: string;
  nin?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  accountIdentity?: MonoIdentity;
}): Promise<{
  verified: boolean;
  confidenceScore: number;
  bvnVerified: boolean;
  ninVerified: boolean;
  nameMatched: boolean;
  bvnMasked?: string;
  ninMasked?: string;
  verifiedFullName: string;
}> {
  let score = 60;
  let bvnVerified = false;
  let ninVerified = false;
  let bvnMasked: string | undefined;
  let ninMasked: string | undefined;

  if (params.bvn && params.bvn.replace(/\D/g, '').length === 11) {
    const bvnRes = await lookupMonoBvn(params.bvn);
    bvnVerified = bvnRes.verified && !bvnRes.watchlistListed;
    bvnMasked = bvnRes.bvnMasked;
    if (bvnVerified) score += 20;
  } else if (params.accountIdentity?.bvn) {
    const clean = params.accountIdentity.bvn.replace(/\D/g, '');
    bvnVerified = true;
    bvnMasked = clean.length >= 6 ? `${clean.slice(0, 3)}*****${clean.slice(-3)}` : '223*****294';
    score += 20;
  }

  if (params.nin && params.nin.replace(/\D/g, '').length === 11) {
    const ninRes = await lookupMonoNin(params.nin);
    ninVerified = ninRes.verified;
    ninMasked = ninRes.ninMasked;
    if (ninVerified) score += 10;
  }

  const submittedName = `${params.firstName || ''} ${params.lastName || ''}`.trim().toUpperCase();
  const bankName = (params.accountIdentity?.name || submittedName || 'SOLOMON DUNU').toUpperCase();

  const nameMatched =
    !submittedName ||
    bankName.includes((params.firstName || '').toUpperCase()) ||
    bankName.includes((params.lastName || '').toUpperCase());

  if (nameMatched) score += 10;

  return {
    verified: score >= 75,
    confidenceScore: Math.min(100, score),
    bvnVerified,
    ninVerified,
    nameMatched,
    bvnMasked: bvnMasked || '223*****294',
    ninMasked,
    verifiedFullName: bankName,
  };
}

// ============================================================
// 2. Bank Account Validation & 6-Month Statement Analysis
// ============================================================

/**
 * Step 3A: Validate a 10-digit Nigerian Bank Account Number via Mono NIP Account Lookup
 */
export async function verifyMonoBankAccount(params: {
  accountNumber: string;
  bankName?: string;
  bankCode?: string;
  expectedName?: string;
}): Promise<{
  verified: boolean;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  bvnMasked: string;
}> {
  const cleanAcct = (params.accountNumber || '').replace(/\D/g, '');
  if (cleanAcct.length !== 10) {
    throw new Error('Nigerian NUBAN account number must be exactly 10 digits');
  }

  const bankCode = resolveBankCode(params.bankCode || params.bankName);
  const bankName = params.bankName || 'Guaranty Trust Bank (GTBank)';

  if (isMonoProductConfigured('lookup')) {
    try {
      const res = await monoFetch<{ data: any }>(
        '/lookup/account-number',
        {
          method: 'POST',
          body: JSON.stringify({
            account_number: cleanAcct,
            nip_code: bankCode,
          }),
        },
        'v3', 'lookup'
      );

      if (res?.data) {
        const bvnRaw = String(res.data.bvn || '');
        const accountName = String(res.data.name || res.data.account_name || '').trim();
        if (!accountName) throw new Error('Mono did not return a verified account name');
        return {
          verified: true,
          accountNumber: cleanAcct,
          accountName: accountName.toUpperCase(),
          bankName,
          bankCode,
          bvnMasked: bvnRaw.length === 11 ? `${bvnRaw.slice(0, 3)}*****${bvnRaw.slice(-3)}` : '',
        };
      }
    } catch (err: any) {
      if (isMonoProductConfigured('lookup')) throw err;
      logger.warn({ err: err.message, cleanAcct, bankCode }, 'Mono NIP account lookup fallback');
    }
  }

  if (isMonoProductConfigured('lookup') || !isDemoAllowed()) throw new Error('Mono account lookup is unavailable');
  // Deterministic account name resolution for sandbox/test mode
  const demoNamesBySuffix: Record<string, string> = {
    '0': 'SOLOMON DUNU',
    '1': 'BABATUNDE ADELEKE',
    '2': 'CHINEDU EZE',
    '3': 'AMINA BELLO',
    '4': 'OLUWASEUN BAKARE',
    '5': 'IBRAHIM DANLADI',
    '6': 'NGOZI OKAFOR',
    '7': 'MUSA ABDULLAHI',
    '8': 'FUNKE AKINDELE',
    '9': 'EMEKA NWOSU',
  };

  const lastDigit = cleanAcct.slice(-1);
  const resolvedName = (
    params.expectedName?.trim() ||
    demoNamesBySuffix[lastDigit] ||
    'SOLOMON DUNU'
  ).toUpperCase();

  return {
    verified: true,
    accountNumber: cleanAcct,
    accountName: resolvedName,
    bankName,
    bankCode,
    bvnMasked: `22${lastDigit}*****8${lastDigit}0`,
  };
}

/**
 * Step 3B: Retrieve full linked Bank Account Details from Mono Connect Account ID
 */
export async function getMonoAccountDetails(
  accountId: string,
  hint?: { bankName?: string; accountNumber?: string; accountName?: string }
): Promise<MonoBankAccountDetails> {
  logger.info({ accountId }, 'Fetching Mono linked bank account details');

  if (isLiveMonoConfigured && !accountId.startsWith('mono_acct_')) {
    try {
      const res = await monoFetch<{ data: any }>(`/accounts/${accountId}`);
      const acct = res.data?.account || res.data || {};
      const meta = res.data?.meta || {};
      const bvnRaw = String(acct.bvn || '');
      if (!acct.name || !(acct.accountNumber || acct.account_number)) throw new Error('Mono returned incomplete bank account details');
      return {
        accountId,
        accountName: String(acct.name).toUpperCase(),
        accountNumber: String(acct.accountNumber || acct.account_number),
        bankName: acct.institution?.name || hint?.bankName || '',
        bankCode: acct.institution?.bankCode || acct.institution?.bank_code || resolveBankCode(hint?.bankName),
        accountType: acct.type || 'SAVINGS_ACCOUNT',
        currency: acct.currency || 'NGN',
        balance: typeof acct.balance === 'number' ? Math.round(acct.balance / 100) : 0,
        bvnMasked: bvnRaw.length === 11 ? `${bvnRaw.slice(0, 3)}*****${bvnRaw.slice(-3)}` : '',
        dataStatus: meta.data_status || 'AVAILABLE',
        verified: true,
      };
    } catch (err) { throw err; }
  }

  if (isLiveMonoConfigured || !isDemoAllowed()) throw new Error('Mono account details are unavailable');
  return {
    accountId,
    accountName: (hint?.accountName || 'SOLOMON DUNU').toUpperCase(),
    accountNumber: hint?.accountNumber || '0148920310',
    bankName: hint?.bankName || 'Guaranty Trust Bank (GTBank)',
    bankCode: resolveBankCode(hint?.bankName),
    accountType: 'SAVINGS_ACCOUNT',
    currency: 'NGN',
    balance: 184500,
    bvnMasked: '223*****294',
    dataStatus: 'AVAILABLE',
    verified: true,
  };
}

/**
 * Step 3C: Retrieve 6-month bank statement for BNPL credit decisioning.
 */
export async function getMonoStatement(
  accountId: string,
  months: number = 6
): Promise<MonoStatementSummary> {
  logger.info({ accountId, months }, 'Fetching Mono bank statement');

  const now = new Date();
  const periodStartDate = new Date(now);
  periodStartDate.setMonth(periodStartDate.getMonth() - months);

  let txns: MonoTransaction[] = [];

  if (isLiveMonoConfigured && !accountId.startsWith('mono_acct_')) {
    try {
      const period = `last${months}months`;
      const res = await monoFetch<{ data: any[] }>(
        `/accounts/${accountId}/transactions?period=${period}&paginate=false`
      );
      txns = (res.data || []).map((t: any, idx: number) => ({
        id: t.id || t._id || `tx-${idx}`,
        // Mono returns transaction amounts in kobo
        amount: typeof t.amount === 'number' ? Math.round(t.amount / 100) : 0,
        date: t.date || new Date().toISOString(),
        narration: t.narration || '',
        type: t.type === 'debit' ? 'debit' : 'credit',
        balance: typeof t.balance === 'number' ? Math.round(t.balance / 100) : 0,
        category: t.category || undefined,
      }));
    } catch (err: any) {
      if (!isDemoAllowed()) throw err;
      logger.warn({ err: err.message, accountId }, 'Mono live statement fetch fallback');
    }
  }

  // Generate realistic 6-month commercial rider / salary inflow & outflow statement if in sandbox mode
  if (txns.length === 0 && !isLiveMonoConfigured && isDemoAllowed()) {
    let runningBalance = 95000;
    for (let m = months - 1; m >= 0; m--) {
      const monthDate = new Date(now);
      monthDate.setMonth(now.getMonth() - m);
      const yyyyMm = monthDate.toISOString().slice(0, 7);

      // Weekly dispatch / commercial payouts + monthly income
      const inflows = [
        { day: '05', amount: 96000, narration: 'NIP/CHOWDECK WEEKLY RIDER PAYOUT/LAGOS' },
        { day: '12', amount: 98500, narration: 'NIP/BOLT LOGISTICS SETTLEMENT/IKEJA' },
        { day: '19', amount: 94000, narration: 'NIP/GLOVO DISPATCH EARNINGS/LEKKI' },
        { day: '26', amount: 102500, narration: 'NIP/COMMERCIAL FLEET BONUS & PAYOUT' },
      ];

      const outflows = [
        { day: '07', amount: 42000, narration: 'POS/FUEL & MAINTENANCE EXPENSE' },
        { day: '15', amount: 55000, narration: 'NIP/HOUSEHOLD & UTILITY TRANSFER' },
        { day: '22', amount: 38000, narration: 'WEB/MOBILE DATA & LIVING EXPENSES' },
        { day: '28', amount: 24000, narration: 'USSD/SAVINGS & COOPERATIVE CONTRIBUTION' },
      ];

      for (const inf of inflows) {
        runningBalance += inf.amount;
        txns.push({
          id: `mono_tx_cr_${yyyyMm}_${inf.day}`,
          amount: inf.amount,
          date: `${yyyyMm}-${inf.day}T10:30:00.000Z`,
          narration: inf.narration,
          type: 'credit',
          balance: runningBalance,
          category: 'income',
        });
      }

      for (const out of outflows) {
        runningBalance = Math.max(15000, runningBalance - out.amount);
        txns.push({
          id: `mono_tx_dr_${yyyyMm}_${out.day}`,
          amount: out.amount,
          date: `${yyyyMm}-${out.day}T15:45:00.000Z`,
          narration: out.narration,
          type: 'debit',
          balance: runningBalance,
          category: 'expense',
        });
      }
    }
  }

  const debits = txns.filter((t) => t.type === 'debit');
  const credits = txns.filter((t) => t.type === 'credit');

  const totalDebits = debits.reduce((s, t) => s + t.amount, 0);
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0);
  const averageMonthlyDebit = Math.round(totalDebits / months);
  const averageMonthlyCredit = Math.round(totalCredits / months);
  if (txns.length === 0) throw new Error('Mono returned no statement transactions; financial assessment is unavailable');
  const closingBalance = txns[txns.length - 1].balance;

  const uniqueCreditMonths = new Set(
    credits.map((c) => (c.date ? c.date.slice(0, 7) : ''))
  );

  return {
    averageMonthlyDebit,
    averageMonthlyCredit,
    netMonthlyCashflow: averageMonthlyCredit - averageMonthlyDebit,
    totalDebits,
    totalCredits,
    closingBalance,
    consistentInflowMonths: Math.min(months, Math.max(1, uniqueCreditMonths.size)),
    monthsAnalysed: months,
    periodStart: periodStartDate.toISOString().split('T')[0],
    periodEnd: now.toISOString().split('T')[0],
    transactions: txns,
  };
}

/**
 * Step 4: Query CBN Credit Bureau history & active loan defaults via Mono.
 */
export async function getMonoCreditHistory(bvnOrAccountId: string): Promise<MonoCreditReport> {
  if (!/^\d{11}$/.test(bvnOrAccountId)) throw new Error('Credit history lookup requires an 11-digit BVN');

  if (isMonoProductConfigured('lookup')) {
    const response = await monoFetch<{ data: any }>(
      '/lookup/credit-history/all',
      { method: 'POST', body: JSON.stringify({ bvn: bvnOrAccountId }) },
      'v3', 'lookup'
    );
    const data = response.data;
    if (!data || !Array.isArray(data.credit_history)) throw new Error('Mono credit history was unavailable');
    const facilities = data.credit_history.flatMap((institution: any) => Array.isArray(institution.history) ? institution.history : []);
    const active = facilities.filter((item: any) => item.loan_status === 'open');
    const delinquent = active.filter((item: any) => /late|default|delinquent|non.performing/i.test(String(item.performance_status || '')));
    return {
      creditScore: 0, // Mono's credit-history response does not include a bureau score.
      rating: delinquent.length > 0 ? 'POOR' : active.length > 3 ? 'FAIR' : 'GOOD',
      activeLoansCount: active.length,
      totalActiveDebt: active.reduce((sum: number, item: any) => sum + Number(item.outstanding_balance || 0) / 100, 0),
      totalOverdueAmount: delinquent.reduce((sum: number, item: any) => sum + Number(item.overdue_amount || 0) / 100, 0),
      delinquentAccountsCount: delinquent.length,
      dishonoredDirectDebitsCount: 0,
      summary: `Mono returned ${facilities.length} credit facilities across ${data.providers?.join(', ') || 'credit bureaus'}. No bureau score was supplied.`,
    };
  }

  if (!isDemoAllowed()) throw new Error('Mono credit history lookup is unavailable');
  return {
    creditScore: 740,
    rating: 'EXCELLENT',
    activeLoansCount: 0,
    totalActiveDebt: 0,
    totalOverdueAmount: 0,
    delinquentAccountsCount: 0,
    dishonoredDirectDebitsCount: 0,
    summary: 'Clean credit history across credit bureaus. Zero active defaults detected.',
  };
}

/**
 * Step 5: Automatically detect active recurring loan repayments across other fintechs
 * directly from statement transactions.
 */
export function detectActiveLoanDeductions(transactions: MonoTransaction[]): {
  lenderNames: string[];
  monthlyDebtObligations: number;
} {
  const recognizedLenders = [
    'carbon',
    'fairmoney',
    'renmoney',
    'quickcheck',
    'branch',
    'palmcredit',
    'aella',
    'lapo',
  ];
  const matchedLenders = new Set<string>();
  let totalLoanDeductions = 0;

  for (const tx of transactions) {
    if (tx.type === 'debit') {
      const narration = (tx.narration || '').toLowerCase();
      for (const lender of recognizedLenders) {
        if (narration.includes(lender)) {
          matchedLenders.add(lender.toUpperCase());
          totalLoanDeductions += tx.amount;
        }
      }
    }
  }

  return {
    lenderNames: Array.from(matchedLenders),
    monthlyDebtObligations: Math.round(totalLoanDeductions / 6),
  };
}

/**
 * Step 6: Comprehensive Financial Underwriting & Affordability Engine
 */
export function analyzeFinancialHealth(params: {
  statement: MonoStatementSummary;
  creditReport: MonoCreditReport;
  proposedMonthlyRepayment?: number;
}): MonoFinancialUnderwriting {
  const { statement, creditReport } = params;
  const externalDebt = detectActiveLoanDeductions(statement.transactions);
  const monthlyInflow = Math.max(1, statement.averageMonthlyCredit);
  const monthlyOutflow = statement.averageMonthlyDebit;
  const netMonthlyCashflow = monthlyInflow - monthlyOutflow;

  // Max 35% Debt-to-Income (DTI) ratio per DandoEv CBN Risk Policy
  const maxAffordableMonthlyInstallment = Math.max(
    0,
    Math.round(monthlyInflow * 0.35 - externalDebt.monthlyDebtObligations)
  );

  const proposed = params.proposedMonthlyRepayment || Math.round(monthlyInflow * 0.22);
  const totalMonthlyDebt = externalDebt.monthlyDebtObligations + proposed;
  const dtiRatioPercent = Number(((totalMonthlyDebt / monthlyInflow) * 100).toFixed(1));

  const decisionReasons: string[] = [];
  let underwritingDecision: 'APPROVED' | 'MANUAL_REVIEW' | 'DECLINED' = 'MANUAL_REVIEW';

  if (creditReport.delinquentAccountsCount > 0 || creditReport.dishonoredDirectDebitsCount > 1) {
    underwritingDecision = 'DECLINED';
    decisionReasons.push('Adverse CBN credit bureau default or dishonored mandate detected.');
  } else if (dtiRatioPercent > 45) {
    underwritingDecision = 'MANUAL_REVIEW';
    decisionReasons.push(`Debt-to-Income ratio (${dtiRatioPercent}%) exceeds automated 35% threshold.`);
  } else if (creditReport.creditScore >= 700 && dtiRatioPercent <= 35 && statement.consistentInflowMonths >= 4) {
    underwritingDecision = 'APPROVED';
    decisionReasons.push(
      `Consistent ${statement.consistentInflowMonths}/${statement.monthsAnalysed}-month bank inflow (${monthlyInflow.toLocaleString()} NGN/mo).`,
      `Healthy DTI ratio (${dtiRatioPercent}%) within 35% CBN affordability cap.`,
      creditReport.summary
    );
  } else {
    decisionReasons.push('Staff credit officer manual review required.');
  }

  const riskTier =
    creditReport.creditScore >= 720 && dtiRatioPercent <= 35
      ? 'Tier 1 (Prime)'
      : creditReport.creditScore >= 620
      ? 'Tier 2 (Standard)'
      : 'Tier 3 (Subprime)';

  return {
    verifiedMonthlyInflow: monthlyInflow,
    verifiedMonthlyOutflow: monthlyOutflow,
    netMonthlyCashflow,
    existingMonthlyDebt: externalDebt.monthlyDebtObligations,
    detectedLenders: externalDebt.lenderNames,
    dtiRatioPercent,
    maxAffordableMonthlyInstallment,
    creditScore: creditReport.creditScore,
    riskTier,
    underwritingDecision,
    decisionReasons,
  };
}

// ============================================================
// 3. Mono DirectPay (One-Time Down Payments & Full Purchases)
// ============================================================

export async function initiateMonoPayment(params: {
  amount: number; // in NGN
  type: 'onetime-debit';
  description: string;
  reference: string;
  customer: {
    name: string;
    email: string;
  };
  redirect_url?: string;
}): Promise<MonoPaymentInitiation> {
  logger.info({ reference: params.reference, amount: params.amount }, 'Initiating Mono DirectPay session');

  if (!isMonoProductConfigured('payments')) {
    if (!isDemoAllowed()) throw new Error('Mono payments are not configured');
    return {
      payment_link: `${
        params.redirect_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/checkout/callback'
      }?reference=${params.reference}&status=successful`,
      reference: params.reference,
      status: 'pending',
    };
  }

  const res = await monoFetch<MonoPaymentInitiationResponse>(
    '/initiate',
    {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // kobo
        type: 'onetime-debit',
        description: params.description,
        reference: params.reference,
        customer: params.customer,
        redirect_url:
          params.redirect_url ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://dashboard.dandoev.com/checkout/callback',
      }),
    },
    'payments', 'payments'
  );
  if (!res.data?.mono_url || res.data.reference !== params.reference) {
    throw new Error('Mono returned an invalid payment session');
  }

  return {
    payment_link: res.data.mono_url,
    reference: res.data.reference,
    status: res.status,
  };
}

export async function verifyMonoPayment(reference: string): Promise<{
  status: 'successful' | 'pending' | 'failed';
  amount: number;
  reference: string;
}> {
  logger.info({ reference }, 'Verifying Mono payment');

  if (!isMonoProductConfigured('payments') || reference.startsWith('MONO-DEMO-')) {
    if (!isDemoAllowed()) throw new Error('Mono payment verification is not configured');
    return {
      status: 'successful',
      amount: 0,
      reference,
    };
  }

  const response = await fetch(`${MONO_PAYMENTS_V2}/verify/${encodeURIComponent(reference)}`, {
    headers: { Accept: 'application/json', 'mono-sec-key': requireMonoKey('payments') },
  });
  if (response.status === 404) return { status: 'pending', amount: 0, reference };
  if (!response.ok) throw new Error(`Mono payment verification failed [${response.status}]`);
  const res = await response.json();
  if (!res.data?.status || !res.data?.reference) throw new Error('Mono returned an invalid payment verification response');
  const gatewayStatus = String(res.data.status);
  return {
    status: gatewayStatus === 'successful' ? 'successful' : gatewayStatus === 'pending' || gatewayStatus === 'processing' ? 'pending' : 'failed',
    amount: res.data.amount / 100,
    reference: res.data.reference,
  };
}

// ============================================================
// 4. Mono Recurring Direct Debit Mandate Order & Loan-Term Schedule
// ============================================================

/**
 * Calculates exact Mono Mandate schedule & deduction parameters based on Loan Term
 * (`tenureMonths` & `deductionFrequency`: daily, bidaily, weekly, monthly).
 */
export function calculateMandateTermsFromLoan(params: {
  totalRepayable: number;
  tenureMonths: number;
  deductionFrequency?: string;
  dailySavingsEscrow?: number;
  startDate?: Date;
}): MonoMandateTerms {
  const tenureMonths = Math.max(1, Number(params.tenureMonths) || 12);
  const rawFreq = (params.deductionFrequency || 'bidaily').toLowerCase();
  const deductionFrequency: DeductionInterval =
    rawFreq === 'daily' || rawFreq === 'weekly' || rawFreq === 'monthly' ? rawFreq : 'bidaily';

  const dailySavings = params.dailySavingsEscrow ?? 1000;

  let totalInstallments: number;
  let stepDays: number;
  let monoInterval: 'daily' | 'weekly' | 'monthly';
  let savingsEscrowPerCycle: number;

  switch (deductionFrequency) {
    case 'daily':
      totalInstallments = tenureMonths * 30;
      stepDays = 1;
      monoInterval = 'daily';
      savingsEscrowPerCycle = dailySavings;
      break;
    case 'weekly':
      totalInstallments = tenureMonths * 4;
      stepDays = 7;
      monoInterval = 'weekly';
      savingsEscrowPerCycle = dailySavings * 7;
      break;
    case 'monthly':
      totalInstallments = tenureMonths;
      stepDays = 30;
      monoInterval = 'monthly';
      savingsEscrowPerCycle = dailySavings * 30;
      break;
    case 'bidaily':
    default:
      totalInstallments = tenureMonths * 15;
      stepDays = 2;
      monoInterval = 'daily'; // Variable e-mandate allows bi-daily sweeps under daily/variable ceiling
      savingsEscrowPerCycle = dailySavings * 2;
      break;
  }

  const installmentAmount = Math.round(params.totalRepayable / totalInstallments);
  const totalPerDeduction = installmentAmount;
  // NIBSS e-Mandate ceiling includes a 15% buffer for late-fee or catch-up flexibility
  const mandateCapAmount = Math.ceil((installmentAmount * 1.15) / 100) * 100;

  const start = params.startDate ? new Date(params.startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + tenureMonths * 30);

  const nextDeduction = new Date(start);
  nextDeduction.setDate(nextDeduction.getDate() + stepDays);

  return {
    tenureMonths,
    deductionFrequency,
    monoInterval,
    totalInstallments,
    installmentAmount,
    savingsEscrowPerCycle,
    totalPerDeduction,
    mandateCapAmount,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    nextDeductionDate: nextDeduction.toISOString().split('T')[0],
  };
}

/**
 * Create a Mono Recurring Direct Debit Mandate Order on the customer's linked bank account.
 * Supports automated deductions across the full loan term (`startDate` -> `endDate`).
 */
export async function setupMonoRecurringMandate(params: {
  accountId?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
  email?: string;
  phone?: string;
  bvn?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  amount?: number; // Installment deduction amount in NGN
  tenureMonths?: number;
  deductionFrequency?: DeductionInterval;
  totalRepayable?: number;
  interval?: 'daily' | 'weekly' | 'monthly';
  description?: string;
  reference?: string;
  startDate?: string;
  endDate?: string;
}): Promise<MonoMandateResponse> {
  const tenureMonths = params.tenureMonths || 12;
  const deductionFrequency: DeductionInterval = params.deductionFrequency || 'bidaily';
  const totalRepayable = params.totalRepayable || (params.amount ? params.amount * tenureMonths * 15 : 1500000);
  const ref = params.reference || `MND-DANDO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const desc = params.description || `DandoEv E-Bike BNPL Mandate (${tenureMonths}M Term)`;

  const computedTerms = calculateMandateTermsFromLoan({
    totalRepayable,
    tenureMonths,
    deductionFrequency,
    startDate: params.startDate ? new Date(params.startDate) : new Date(),
  });

  const startDate = params.startDate || computedTerms.startDate;
  const endDate = params.endDate || computedTerms.endDate;
  const interval = params.interval || computedTerms.monoInterval;
  const bankCode = resolveBankCode(params.bankCode || params.bankName);

  logger.info(
    {
      accountId: params.accountId,
      reference: ref,
      tenureMonths,
      deductionFrequency,
      startDate,
      endDate,
    },
    'Setting up Mono Recurring Mandate Order'
  );

  if (isMonoProductConfigured('payments')) {
    if (!params.accountNumber || !params.email || !params.bvn || !params.firstName || !params.lastName || !params.phone || !params.address) {
      throw new Error('Account, BVN and complete customer details are required for biometric mandate verification');
    }
    const customer = await monoFetch<{ data: { id: string } }>(
      '/customers',
      { method: 'POST', body: JSON.stringify({
        identity: { type: 'bvn', number: params.bvn }, email: params.email,
        type: 'individual', first_name: params.firstName, last_name: params.lastName,
        phone: params.phone, address: params.address,
      }) }, 'v2', 'payments'
    );
    if (!customer.data?.id) throw new Error('Mono did not return a customer ID');
    const res = await monoFetch<{ data: any }>(
      '/payments/mandates',
      {
        method: 'POST',
        body: JSON.stringify({
          debit_type: 'variable',
          customer: customer.data.id,
          mandate_type: 'emandate',
          verification_method: 'selfie_verification',
          // For variable mandates this is the total amount collectible for the mandate period.
          amount: Math.round(totalRepayable * 100),
          reference: ref.slice(0, 24),
          account_number: params.accountNumber,
          bank_code: bankCode,
          fee_bearer: 'business',
          description: desc.slice(0, 100),
          start_date: startDate,
          end_date: endDate,
          meta: { account_id: params.accountId, deduction_frequency: deductionFrequency },
        }),
      },
      'v3', 'payments'
    );

    if (res?.data) {
        return {
          id: res.data.id || res.data.mandate_id,
          status: res.data.status || 'pending',
          reference: ref,
          mandateType: 'emandate',
          debitType: 'variable',
          amount: params.amount || computedTerms.installmentAmount,
          mandateCapAmount: computedTerms.mandateCapAmount,
          interval,
          deductionFrequency,
          tenureMonths,
          totalInstallments: computedTerms.totalInstallments,
          startDate,
          endDate,
          nextDeductionDate: computedTerms.nextDeductionDate,
          accountId: params.accountId,
          accountNumber: params.accountNumber,
          accountName: params.accountName,
          bankName: params.bankName,
          bankCode,
          authorizationUrl: res.data.mono_url || res.data.authorization_url || res.data.payment_link,
          createdAt: new Date().toISOString(),
        };
    }
    throw new Error('Mono returned an invalid mandate response');
  }

  if (!isDemoAllowed()) throw new Error('Mono mandates are not configured');

  const deterministicSuffix = crypto
    .createHash('md5')
    .update(ref)
    .digest('hex')
    .slice(0, 12);

  return {
    id: `mnd_live_${deterministicSuffix}`,
    status: 'active',
    reference: ref,
    mandateType: 'emandate',
    debitType: 'variable',
    amount: params.amount || computedTerms.installmentAmount,
    mandateCapAmount: computedTerms.mandateCapAmount,
    interval,
    deductionFrequency,
    tenureMonths,
    totalInstallments: computedTerms.totalInstallments,
    startDate,
    endDate,
    nextDeductionDate: computedTerms.nextDeductionDate,
    accountId: params.accountId || `mono_acct_${deterministicSuffix}`,
    accountNumber: params.accountNumber || '0148920310',
    accountName: params.accountName || 'SOLOMON DUNU',
    bankName: params.bankName || 'Guaranty Trust Bank (GTBank)',
    bankCode,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieve the status of an existing Mono Recurring Mandate.
 */
export async function getMonoMandateStatus(mandateId: string): Promise<{
  id: string;
  status: 'active' | 'approved' | 'pending' | 'paused' | 'cancelled';
  readyToDebit: boolean;
}> {
  if (isMonoProductConfigured('payments') && !mandateId.startsWith('mnd_live_')) {
      const res = await monoFetch<{ data: any }>(`/payments/mandates/${encodeURIComponent(mandateId)}`, {}, 'v3', 'payments');
      const st = res.data?.status || 'pending';
      return {
        id: mandateId,
        status: st === 'active' || st === 'approved' || st === 'paused' || st === 'cancelled' ? st : 'pending',
        readyToDebit: res.data?.ready_to_debit === true,
      };
  }

  if (!isDemoAllowed()) throw new Error('Mono mandate status is not configured');

  return {
    id: mandateId,
    status: 'active',
    readyToDebit: true,
  };
}

/**
 * Execute an automated debit against an active recurring mandate based on loan term schedule.
 * Used by background collection sweeps and on-demand installment debits.
 */
export async function chargeMonoMandate(params: {
  mandateId: string;
  amount: number; // NGN
  reference: string;
  narration: string;
}): Promise<MonoChargeResponse> {
  logger.info(
    { mandateId: params.mandateId, reference: params.reference, amount: params.amount },
    'Charging Mono Direct Debit Mandate'
  );

  if (!Number.isFinite(params.amount) || params.amount < 200) throw new Error('Mono mandate debit must be at least NGN 200');
  if (!params.reference || params.reference.length > 24) throw new Error('Mono debit reference must be 1-24 characters');
  if (!params.narration || params.narration.length > 100) throw new Error('Mono debit narration must be 1-100 characters');

  if (isMonoProductConfigured('payments') && !params.mandateId.startsWith('mnd_live_')) {
      const res = await monoFetch<{ data: any }>(
        `/payments/mandates/${encodeURIComponent(params.mandateId)}/debit`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Math.round(params.amount * 100), // Kobo
            reference: params.reference,
            narration: params.narration,
          }),
        },
        'v3', 'payments'
      );

      if (res?.data) {
        return {
          id: res.data.id || `chg_${Date.now()}`,
          status: res.data.status === 'successful' ? 'successful' : res.data.status === 'failed' ? 'failed' : 'pending',
          reference: res.data.reference || params.reference,
          amount: params.amount,
          mandateId: params.mandateId,
          chargedAt: new Date().toISOString(),
          narration: params.narration,
          fee: res.data.fee || 100,
        };
      }
      throw new Error('Mono returned an invalid debit response');
  }

  if (!isDemoAllowed()) throw new Error('Mono mandate debits are not configured');

  return {
    id: `mono_chg_${Date.now().toString(36)}`,
    status: 'successful',
    reference: params.reference,
    amount: params.amount,
    mandateId: params.mandateId,
    chargedAt: new Date().toISOString(),
    narration: params.narration,
    fee: 100,
  };
}

// ============================================================
// 5. Webhook Signature Verification
// ============================================================

export function verifyMonoSignature(
  rawBody: string,
  signatureHeader: string,
  secretOverride?: string
): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const fallbackSecret = isProd ? '' : 'dandoev_mono_webhook_secret_demo';
  const secret = secretOverride || process.env.MONO_WEBHOOK_SECRET || fallbackSecret;
  if (!secret) return false;

  try {
    const sigBuf = Buffer.from(signatureHeader);
    const secBuf = Buffer.from(secret);
    if (sigBuf.length === secBuf.length && crypto.timingSafeEqual(secBuf, sigBuf)) {
      return true;
    }
    // Check HMAC-SHA512
    const hmac512 = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const hmac512Buf = Buffer.from(hmac512);
    if (sigBuf.length === hmac512Buf.length && crypto.timingSafeEqual(hmac512Buf, sigBuf)) {
      return true;
    }
    // Check HMAC-SHA256
    const hmac256 = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const hmac256Buf = Buffer.from(hmac256);
    if (sigBuf.length === hmac256Buf.length && crypto.timingSafeEqual(hmac256Buf, sigBuf)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

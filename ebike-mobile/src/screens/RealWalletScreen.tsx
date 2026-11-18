import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react-native';
import { MobileApi } from '../lib/api';

type WalletTransaction = {
  id: string;
  amount: number;
  status: string;
  provider?: string;
  reference?: string;
  type?: string | null;
  createdAt: string;
};

type Balance = {
  mainBalance: number;
  lockedSaving: number;
  transactions?: WalletTransaction[];
};

type RepaymentSource = {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  monoMandateStatus?: string;
};

type ActiveLoan = {
  id: string;
  status: string;
  bike?: { name?: string };
};

type SettlementQuote = {
  amount: number;
  walletBalance?: number;
  mandateAvailable?: boolean;
};

type BannerState = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

function formatTransactionLabel(tx: WalletTransaction): { title: string; isCredit: boolean } {
  const type = (tx.type || '').toLowerCase();
  const provider = (tx.provider || '').toLowerCase();
  if (type === 'early_settlement' || provider === 'wallet_settlement') {
    return { title: 'Early Loan Settlement', isCredit: false };
  }
  if (type === 'wallet_topup' || (!type && provider === 'mono')) {
    return { title: 'Wallet Top-up via Mono', isCredit: true };
  }
  if (type.includes('repayment')) {
    return { title: 'Loan Installment Repayment', isCredit: false };
  }
  return { title: 'Wallet Activity', isCredit: type.includes('credit') || type.includes('topup') };
}

export default function RealWalletScreen({ token }: { token: string; onBack: () => void }) {
  const [wallet, setWallet] = useState<Balance | null>(null);
  const [source, setSource] = useState<RepaymentSource | null>(null);
  const [activeLoan, setActiveLoan] = useState<ActiveLoan | null>(null);
  const [settlement, setSettlement] = useState<SettlementQuote | null>(null);

  const [hideBalance, setHideBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerState>(null);

  // Add Money Bottom Sheet
  const [showFundModal, setShowFundModal] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [funding, setFunding] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  // Clear Loan Bottom Sheet
  const [showClearModal, setShowClearModal] = useState(false);
  const [settling, setSettling] = useState(false);

  const refresh = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      const results = await Promise.allSettled([
        MobileApi.getWalletBalance(token),
        MobileApi.getProfile(token),
        MobileApi.getMyLoans(token),
      ]);

      if (results[0].status === 'fulfilled') {
        setWallet(results[0].value.data);
      } else {
        setBanner({ type: 'error', text: 'Wallet balance is unavailable. Pull down to retry.' });
      }

      if (results[1].status === 'fulfilled') {
        setSource(((results[1].value as any).user ?? results[1].value.data) || null);
      }

      if (results[2].status === 'fulfilled') {
        const loans: ActiveLoan[] = results[2].value.data ?? [];
        const currentActive = loans.find((l) => l.status === 'active') ?? null;
        setActiveLoan(currentActive);
        if (currentActive) {
          try {
            const quoteRes = await MobileApi.getLoanSettlementQuote(currentActive.id, token);
            if (quoteRes.data && Number(quoteRes.data.amount) > 0) {
              setSettlement(quoteRes.data);
            } else {
              setSettlement(null);
            }
          } catch {
            setSettlement(null);
          }
        } else {
          setSettlement(null);
        }
      }

      setLoading(false);
      setRefreshing(false);
    },
    [token],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const checkPayment = async (paymentReference: string) => {
    const result = await MobileApi.verifyPayment(paymentReference, token);
    if (result.data.status === 'success') {
      await refresh(false);
      setReference(null);
      setShowFundModal(false);
      setBanner({ type: 'success', text: 'Wallet funded successfully. Balance updated.' });
    } else {
      setBanner({ type: 'info', text: 'Payment is still pending. Tap check status once confirmed.' });
    }
  };

  const fund = async () => {
    const value = Math.ceil(Number(amount));
    if (!Number.isFinite(value) || value < 1000 || value > 5000000) {
      setBanner({ type: 'error', text: 'Enter an amount between ₦1,000 and ₦5,000,000.' });
      return;
    }
    setFunding(true);
    setBanner(null);
    try {
      const payment = await MobileApi.fundWallet(value, token);
      if (!payment.data?.authorizationUrl?.startsWith('https://')) {
        throw new Error('Mono did not return a secure payment link.');
      }
      setReference(payment.data.reference);
      const browser = await WebBrowser.openAuthSessionAsync(
        payment.data.authorizationUrl,
        'dandoev://payment-callback',
      );
      if (browser.type === 'success') {
        await checkPayment(payment.data.reference);
      } else {
        setBanner({
          type: 'info',
          text: 'Payment window closed. Tap "Check pending payment" if you completed the transfer.',
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to start wallet funding.',
      });
    } finally {
      setFunding(false);
    }
  };

  const handleClearLoan = async () => {
    if (!activeLoan) return;
    setSettling(true);
    setBanner(null);
    try {
      const res = await MobileApi.settleLoanEarly(activeLoan.id, token);
      setShowClearModal(false);
      await refresh(false);
      if (res.status === 'completed') {
        setBanner({
          type: 'success',
          text: `Loan cleared! ₦${Number(res.amount).toLocaleString()} settled successfully.`,
        });
      } else {
        setBanner({
          type: 'info',
          text: `Settlement initiated (Ref: ${res.reference}). We will notify you once confirmed.`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to complete early loan settlement.',
      });
    } finally {
      setSettling(false);
    }
  };

  const mainBalance = Number(wallet?.mainBalance || 0);
  const wholeNaira = Math.floor(mainBalance).toLocaleString();
  const payoffAmount = Number(settlement?.amount || 0);
  const shortfall = Math.max(0, Math.ceil(payoffAmount - mainBalance));
  const canSettleFromWallet = payoffAmount > 0 && mainBalance >= payoffAmount;

  const lastFour = source?.bankAccountNumber?.replace(/\D/g, '').slice(-4);
  const hasBank = Boolean(source?.bankName);
  const mandateStatusRaw = (source?.monoMandateStatus || '').toLowerCase();
  const mandateReady = ['active', 'approved', 'ready'].includes(mandateStatusRaw);
  const mandatePending = ['pending', 'awaiting_authorization'].includes(mandateStatusRaw);

  const transactions = wallet?.transactions ?? [];

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
            tintColor="#0A154F"
            colors={['#0A154F']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FINANCE HUB</Text>
            <Text style={styles.heading}>Wallet</Text>
          </View>
          <TouchableOpacity
            onPress={() => void refresh(true)}
            disabled={refreshing}
            accessibilityLabel="Refresh wallet"
            style={styles.refreshButton}
            activeOpacity={0.8}
          >
            {refreshing ? <ActivityIndicator color="#0A154F" size="small" /> : <RefreshCw size={19} color="#0A154F" />}
          </TouchableOpacity>
        </View>

        {/* Feedback Banner */}
        {banner && (
          <View
            style={[
              styles.banner,
              banner.type === 'success'
                ? styles.bannerSuccess
                : banner.type === 'error'
                  ? styles.bannerError
                  : styles.bannerInfo,
            ]}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <AlertCircle size={18} color={banner.type === 'error' ? '#DC2626' : '#2563EB'} />
            )}
            <Text style={styles.bannerText}>{banner.text}</Text>
            <TouchableOpacity onPress={() => setBanner(null)} hitSlop={8}>
              <X size={16} color="#66728A" />
            </TouchableOpacity>
          </View>
        )}

        {/* Million-Dollar Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlowMint} />
          <View style={styles.heroGlowIndigo} />

          <View style={styles.heroTopRow}>
            <View style={styles.brandRow}>
              <View style={styles.walletIcon}>
                <Wallet size={19} color="#0A154F" />
              </View>
              <Text style={styles.brand}>DandoEv Wallet</Text>
            </View>
            <TouchableOpacity
              onPress={() => setHideBalance((prev) => !prev)}
              style={styles.eyeButton}
              accessibilityLabel={hideBalance ? 'Show balance' : 'Hide balance'}
              activeOpacity={0.8}
            >
              {hideBalance ? <EyeOff size={17} color="#CAD8E9" /> : <Eye size={17} color="#CAD8E9" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>

          {loading && !wallet ? (
            <View style={styles.skeletonAmount} />
          ) : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>
                {hideBalance ? '₦••••••' : `₦${wholeNaira}`}
              </Text>
              {!hideBalance && <Text style={styles.balanceDecimals}>.00</Text>}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.addMoneyPill}
              onPress={() => {
                setAmount('10000');
                setShowFundModal(true);
              }}
              activeOpacity={0.85}
            >
              <Plus size={17} color="#0A154F" strokeWidth={2.5} />
              <Text style={styles.addMoneyPillText}>Add Money</Text>
            </TouchableOpacity>

            {activeLoan && payoffAmount > 0 && (
              <TouchableOpacity
                style={styles.clearLoanPill}
                onPress={() => setShowClearModal(true)}
                activeOpacity={0.85}
              >
                <Sparkles size={15} color="#52E0C1" />
                <Text style={styles.clearLoanPillText}>Clear Loan</Text>
              </TouchableOpacity>
            )}
          </View>

          {reference && (
            <TouchableOpacity
              style={styles.pendingCheckPill}
              onPress={() =>
                void checkPayment(reference).catch((err) =>
                  setBanner({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Unable to verify payment.',
                  }),
                )
              }
            >
              <Text style={styles.pendingCheckText}>Pending transfer? Tap to verify status →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Legacy Locked Savings (shown only if user already has >0 balance from earlier plans) */}
        {Number(wallet?.lockedSaving || 0) > 0 && (
          <View style={styles.legacySavingsCard}>
            <View>
              <Text style={styles.legacyEyebrow}>PRIOR ESCROW BALANCE</Text>
              <Text style={styles.legacyAmount}>₦{Number(wallet?.lockedSaving || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.legacyBadge}>
              <Text style={styles.legacyBadgeText}>Releases on payoff</Text>
            </View>
          </View>
        )}

        {/* Clear Loan / Early Settlement Card */}
        {activeLoan && payoffAmount > 0 && (
          <>
            <Text style={styles.sectionTitle}>Loan Payoff</Text>
            <View style={styles.payoffCard}>
              <View style={styles.payoffTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoffEyebrow}>REMAINING BALANCE</Text>
                  <Text style={styles.payoffTitle}>{activeLoan.bike?.name || 'Active E-Bike Plan'}</Text>
                </View>
                <Text style={styles.payoffAmount}>₦{payoffAmount.toLocaleString()}</Text>
              </View>
              <Text style={styles.payoffSub}>
                Pay off your entire remaining loan balance anytime from your wallet with zero early-settlement penalty.
              </Text>
              <TouchableOpacity
                style={styles.payoffBtn}
                onPress={() => setShowClearModal(true)}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={17} color="#FFFFFF" />
                <Text style={styles.payoffBtnText}>Clear Remaining Loan</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Linked Repayment Method */}
        <Text style={styles.sectionTitle}>Automatic Repayment</Text>
        <View style={styles.panel}>
          <View style={styles.sourceRow}>
            <View style={styles.sourceIcon}>
              {hasBank ? <Building2 size={21} color="#0A154F" /> : <CreditCard size={21} color="#0A154F" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>{hasBank ? source?.bankName : 'No bank linked yet'}</Text>
              <Text style={styles.sourceSub}>
                {hasBank
                  ? lastFour
                    ? `Account •••• ${lastFour}`
                    : source?.bankAccountName || 'Bank account linked'
                  : 'Appears once your BNPL bank link is complete'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                mandateReady
                  ? styles.statusPillActive
                  : mandatePending
                    ? styles.statusPillPending
                    : styles.statusPillIdle,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  mandateReady
                    ? styles.statusTextActive
                    : mandatePending
                      ? styles.statusTextPending
                      : styles.statusTextIdle,
                ]}
              >
                {mandateReady ? 'Active' : mandatePending ? 'Pending' : 'Not Set'}
              </Text>
            </View>
          </View>
          <View style={styles.rule} />
          <View style={styles.shieldNoteRow}>
            <ShieldCheck size={15} color="#087C70" />
            <Text style={styles.note}>
              Scheduled installments debit your wallet first, then your Mono Direct Debit mandate if needed.
            </Text>
          </View>
        </View>

        {/* Recent Wallet Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.panel}>
          {transactions.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityTitle}>No transactions yet</Text>
              <Text style={styles.emptyActivitySub}>
                Wallet top-ups, installment payments, and loan payoffs will appear here.
              </Text>
            </View>
          ) : (
            transactions.map((tx, idx) => {
              const { title, isCredit } = formatTransactionLabel(tx);
              const statusLower = (tx.status || '').toLowerCase();
              const isSuccess = statusLower === 'success' || statusLower === 'successful';
              const isFailed = statusLower === 'failed';
              return (
                <View key={tx.id}>
                  {idx > 0 && <View style={styles.txDivider} />}
                  <View style={styles.txRow}>
                    <View
                      style={[
                        styles.txIcon,
                        { backgroundColor: isCredit ? '#E5F9F4' : '#EEF2FF' },
                      ]}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={18} color="#087C70" />
                      ) : (
                        <ArrowUpRight size={18} color="#2E3192" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle}>{title}</Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: isCredit ? '#087C70' : '#0A154F' }]}>
                        {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                      </Text>
                      <Text
                        style={[
                          styles.txStatus,
                          isSuccess
                            ? { color: '#059669' }
                            : isFailed
                              ? { color: '#DC2626' }
                              : { color: '#D97706' },
                        ]}
                      >
                        {isSuccess ? 'Completed' : isFailed ? 'Failed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Money Bottom Sheet Modal */}
      <Modal
        visible={showFundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFundModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setShowFundModal(false)} style={styles.closeBtn}>
                <X size={18} color="#0A154F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              Instant bank transfer via Mono DirectPay • ₦0 DandoEv fee
            </Text>

            <View style={styles.amountBox}>
              <Text style={styles.currency}>₦</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="10,000"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Funding amount"
              />
            </View>

            <View style={styles.presets}>
              {[5000, 10000, 20000, 50000].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setAmount(String(value))}
                  style={[styles.preset, amount === String(value) && styles.presetSelected]}
                >
                  <Text style={[styles.presetText, amount === String(value) && styles.presetTextSelected]}>
                    ₦{value.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryModalBtn, funding && styles.disabled]}
              disabled={funding}
              onPress={() => void fund()}
            >
              {funding ? (
                <ActivityIndicator color="#0A154F" />
              ) : (
                <>
                  <ArrowDownLeft size={18} color="#0A154F" />
                  <Text style={styles.primaryModalBtnText}>Continue to Mono Pay</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Clear Loan Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClearModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Clear Loan Balance</Text>
              <TouchableOpacity onPress={() => setShowClearModal(false)} style={styles.closeBtn}>
                <X size={18} color="#0A154F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {activeLoan?.bike?.name || 'Active E-Bike Plan'} — Early settlement closes all remaining installments immediately.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining Payoff</Text>
                <Text style={styles.summaryVal}>₦{payoffAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Available Wallet Balance</Text>
                <Text style={styles.summaryVal}>₦{mainBalance.toLocaleString()}</Text>
              </View>
              {!canSettleFromWallet && (
                <View style={[styles.summaryRow, styles.summaryShortfall]}>
                  <Text style={styles.shortfallLabel}>Additional Needed</Text>
                  <Text style={styles.shortfallVal}>₦{shortfall.toLocaleString()}</Text>
                </View>
              )}
            </View>

            {canSettleFromWallet ? (
              <TouchableOpacity
                style={[styles.clearConfirmBtn, settling && styles.disabled]}
                disabled={settling}
                onPress={() => void handleClearLoan()}
              >
                {settling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#FFFFFF" />
                    <Text style={styles.clearConfirmBtnText}>
                      Pay ₦{payoffAmount.toLocaleString()} & Clear Loan
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={styles.primaryModalBtn}
                  onPress={() => {
                    setShowClearModal(false);
                    setAmount(String(Math.max(1000, shortfall)));
                    setShowFundModal(true);
                  }}
                >
                  <Plus size={18} color="#0A154F" />
                  <Text style={styles.primaryModalBtnText}>
                    Add ₦{Math.max(1000, shortfall).toLocaleString()} to Wallet
                  </Text>
                </TouchableOpacity>

                {settlement?.mandateAvailable && (
                  <TouchableOpacity
                    style={[styles.secondaryModalBtn, settling && styles.disabled]}
                    disabled={settling}
                    onPress={() => void handleClearLoan()}
                  >
                    <Text style={styles.secondaryModalBtnText}>
                      {settling ? 'Processing…' : 'Settle via Linked Bank Mandate'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 38 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: '#718098', fontSize: 11, letterSpacing: 1.5, fontFamily: 'Inter_600SemiBold' },
  heading: { color: '#0A154F', fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 3 },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  bannerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  bannerInfo: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  bannerText: { flex: 1, color: '#0A154F', fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },

  heroCard: {
    backgroundColor: '#0A154F',
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroGlowMint: {
    position: 'absolute',
    right: -45,
    top: -45,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(82, 224, 193, 0.16)',
  },
  heroGlowIndigo: {
    position: 'absolute',
    left: -50,
    bottom: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#52E0C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { color: '#AFBFD9', fontSize: 11, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold' },
  skeletonAmount: {
    height: 40,
    width: 180,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 10,
    marginBottom: 8,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  balanceDecimals: {
    color: '#AFBFD9',
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontVariant: ['tabular-nums'],
  },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  addMoneyPill: {
    flex: 1,
    backgroundColor: '#52E0C1',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addMoneyPillText: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  clearLoanPill: {
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(82, 224, 193, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clearLoanPillText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  pendingCheckPill: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  pendingCheckText: { color: '#8BE7D2', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  legacySavingsCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7EBF2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legacyEyebrow: { color: '#718098', fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  legacyAmount: { color: '#0A154F', fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  legacyBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  legacyBadgeText: { color: '#2E3192', fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  sectionTitle: {
    color: '#0A154F',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginTop: 26,
    marginBottom: 11,
  },

  payoffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  payoffTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  payoffEyebrow: { color: '#2E3192', fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  payoffTitle: { color: '#0A154F', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  payoffAmount: {
    color: '#0A154F',
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  payoffSub: { color: '#66728A', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium', marginTop: 8, marginBottom: 14 },
  payoffBtn: {
    backgroundColor: '#0A154F',
    borderRadius: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payoffBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E7EBF2' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EEF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTitle: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  sourceSub: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillActive: { backgroundColor: '#DCFCE7' },
  statusPillPending: { backgroundColor: '#FEF3C7' },
  statusPillIdle: { backgroundColor: '#F1F4F8' },
  statusPillText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  statusTextActive: { color: '#166534' },
  statusTextPending: { color: '#92400E' },
  statusTextIdle: { color: '#66728A' },
  rule: { height: 1, backgroundColor: '#EDF0F5', marginVertical: 14 },
  shieldNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  note: { flex: 1, color: '#66728A', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },

  emptyActivity: { alignItems: 'center', paddingVertical: 16 },
  emptyActivityTitle: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  emptyActivitySub: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  txDivider: { height: 1, backgroundColor: '#F1F4F8', marginVertical: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  txDate: { color: '#718098', fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
  txAmount: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', fontVariant: ['tabular-nums'] },
  txStatus: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10, 21, 79, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8DEE8',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: '#0A154F', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSub: { color: '#66728A', fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 6, lineHeight: 19 },
  amountBox: {
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: '#0A154F',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  currency: { color: '#0A154F', fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  amountInput: {
    flex: 1,
    color: '#0A154F',
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    paddingLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  preset: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F1F4F8' },
  presetSelected: { backgroundColor: '#E3F8F3' },
  presetText: { color: '#57647B', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  presetTextSelected: { color: '#087C70' },

  primaryModalBtn: {
    backgroundColor: '#52E0C1',
    minHeight: 54,
    borderRadius: 15,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryModalBtnText: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  secondaryModalBtn: {
    borderWidth: 1,
    borderColor: '#D8DEE8',
    minHeight: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryModalBtnText: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },

  summaryBox: {
    backgroundColor: '#F5F7FB',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 18,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#66728A', fontSize: 13, fontFamily: 'Inter_500Medium' },
  summaryVal: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontVariant: ['tabular-nums'] },
  summaryShortfall: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 },
  shortfallLabel: { color: '#B45309', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  shortfallVal: { color: '#B45309', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontVariant: ['tabular-nums'] },
  clearConfirmBtn: {
    backgroundColor: '#0A154F',
    minHeight: 54,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  clearConfirmBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  disabled: { opacity: 0.6 },
});

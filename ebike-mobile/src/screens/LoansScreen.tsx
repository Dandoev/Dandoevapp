import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ShieldCheck,
  FileDown,
  Zap,
} from 'lucide-react-native';
import { demoStore, DemoLoan, DemoWallet } from '../lib/demo-data';
import { MobileApi } from '../lib/api';
import FinancialStatementModal from '../components/FinancialStatementModal';
import RealLoansScreen from './RealLoansScreen';

interface LoansScreenProps {
  token?: string | null;
}

export default function LoansScreen({ token }: LoansScreenProps) {
  if (token && !token.startsWith('demo-')) return <RealLoansScreen token={token} />;
  return <DemoLoansScreen token={token} />;
}

function DemoLoansScreen({ token }: LoansScreenProps) {
  const isDemoUser = Boolean(token?.startsWith('demo-'));
  const emptyLoan = { ...demoStore.getLoan(), id: 'no-loan', bikeName: '', status: 'under_review' as const, totalAmount: 0, loanAmount: 0, installmentsPaid: 0, totalInstallments: 0, repayments: [] };
  const [loan, setLoan] = useState<DemoLoan>(isDemoUser ? demoStore.getLoan() : emptyLoan);
  const [wallet, setWallet] = useState<DemoWallet>(isDemoUser ? demoStore.getWallet() : { ...demoStore.getWallet(), mainBalance: 0, lockedSaving: 0 });
  const [paying, setPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);

  useEffect(() => {
    if (token && !isDemoUser) {
      MobileApi.getMyLoans(token)
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            const l = res.data[0];
            setLoan((prev) => ({
              ...prev,
              id: l.id,
              bikeName: l.bike?.name || prev.bikeName,
              totalAmount: l.totalRepayable || prev.totalAmount,
              monthlyRepayment: l.monthlyRepayment || prev.monthlyRepayment,
              nextDueDate: l.repayments?.[0]?.dueDate || prev.nextDueDate,
            }));
          }
        })
        .catch(() => {});

      MobileApi.getWalletBalance(token)
        .then((res) => {
          if (res.success && res.data) {
            setWallet((prev) => ({
              ...prev,
              mainBalance: res.data.mainBalance ?? prev.mainBalance,
              lockedSaving: res.data.lockedSaving ?? prev.lockedSaving,
            }));
          }
        })
        .catch(() => {});
    }

    if (!isDemoUser) return;
    const unsubscribe = demoStore.subscribe(() => {
      setLoan(demoStore.getLoan());
      setWallet(demoStore.getWallet());
    });
    return unsubscribe;
  }, [token, isDemoUser]);

  const handlePayNext = () => {
    setPaying(true);
    setTimeout(() => {
      const result = demoStore.payNextInstallment();
      setPaying(false);
      setToastMessage(result.message);
      setTimeout(() => setToastMessage(null), 4000);
    }, 600);
  };

  const progressPercent = Math.round((loan.installmentsPaid / loan.totalInstallments) * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your plans.</Text>
            <Text style={styles.subtitle}>Stay on top of every repayment, all in one place.</Text>
          </View>
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={() => setShowStatementModal(true)}
            activeOpacity={0.85}
          >
            <FileDown size={16} color="#1E1B4B" />
            <Text style={styles.downloadReportText}>Statement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toastMessage && (
        <View style={styles.toastContainer}>
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loan.id === 'no-loan' && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No BNPL plan yet</Text>
            <Text style={styles.emptyStateText}>Approved loans and repayment schedules will appear here after your application is verified.</Text>
          </View>
        )}
        {/* Active Loan Card */}
        <View style={[styles.activeLoanCard, loan.id === 'no-loan' && { display: 'none' }]}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.loanBadge}>ACTIVE BNPL LOAN</Text>
              <Text style={styles.loanBikeName}>{loan.bikeName}</Text>
              <Text style={styles.loanContractId}>Contract: {loan.id.toUpperCase()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>Good Standing</Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Loan Payoff Progress</Text>
              <Text style={styles.progressValue}>
                {loan.installmentsPaid} of {loan.totalInstallments} Months ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Deduction Frequency Indicator */}
          <View style={styles.frequencySection}>
            <View style={styles.freqHeader}>
              <Text style={styles.freqTitle}>Repayment Deduction Frequency</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={[styles.freqBtn, styles.freqBtnActive]}>
                <Text style={[styles.freqBtnText, styles.freqBtnTextActive]}>
                  Weekly Deduction
                </Text>
              </View>
            </View>
            <View style={styles.freqNoticeRow}>
              <Zap size={14} color="#F59E0B" />
              <Text style={styles.freqSub}>
                ₦{loan.weeklyRepayment.toLocaleString()} auto-swept every Monday. 0% penalty when funded on time.
              </Text>
            </View>
          </View>

          {/* Next Due Alert Box */}
          <View style={styles.dueBox}>
            <View style={styles.dueLeft}>
              <Text style={styles.dueLabel}>
                Next Weekly Installment Due
              </Text>
              <Text style={styles.dueAmount}>
                ₦{loan.weeklyRepayment.toLocaleString()}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={15} color="#D97706" />
                <Text style={styles.dueDateText}>Due: {loan.nextDueDate} (In {loan.daysRemaining} days)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payBtn, (paying || loan.status === 'completed') && styles.payBtnDisabled]}
              onPress={handlePayNext}
              disabled={paying || loan.status === 'completed'}
            >
              <Text style={styles.payBtnText}>
                {loan.status === 'completed' ? 'Paid' : paying ? 'Processing...' : 'Pay Now'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Financial Breakdown */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Total Financed</Text>
              <Text style={styles.breakdownValue}>₦{loan.totalAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Weekly Rate</Text>
              <Text style={styles.breakdownValue}>₦{loan.weeklyRepayment.toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Frequency</Text>
              <Text style={[styles.breakdownValue, { color: '#1E1B4B' }]}>
                WEEKLY
              </Text>
            </View>
          </View>
        </View>

        {/* Compulsory Savings Reward Box */}
        <View style={styles.savingsCard}>
          <View style={styles.savingsLeft}>
            <View style={styles.savingsIcon}>
              <PiggyBank size={24} color="#2E3192" />
            </View>
            <View>
              <Text style={styles.savingsTitle}>Save-As-You-Ride Vault</Text>
              <Text style={styles.savingsAmount}>₦{wallet.lockedSaving.toLocaleString()}</Text>
              <Text style={styles.savingsNote}>
                Collected daily • Unlocks automatically upon loan payoff!
              </Text>
            </View>
          </View>
        </View>

        {/* Repayment Schedule Table */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionHeader}>
            48-Week Repayment Schedule (Weekly Sweeps)
          </Text>
          <View style={styles.scheduleCard}>
            {loan.repayments.map((rep, idx) => {
              const isPaid = rep.status === 'paid';
              return (
                <View
                  key={rep.id}
                  style={[
                    styles.repaymentRow,
                    idx !== loan.repayments.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.repLeft}>
                    {isPaid ? (
                      <CheckCircle2 size={20} color="#2E3192" />
                    ) : (
                      <Clock size={20} color="#94A3B8" />
                    )}
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.repNum}>Installment #{rep.installmentNumber}</Text>
                      <Text style={styles.repDate}>
                        {isPaid && rep.paidDate ? `Paid on ${rep.paidDate}` : `Due: ${rep.dueDate}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.repRight}>
                    <Text style={styles.repAmount}>₦{rep.amount.toLocaleString()}</Text>
                    <View style={[styles.statusPill, isPaid ? styles.statusPaid : styles.statusUpcoming]}>
                      <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextUpcoming]}>
                        {isPaid ? 'PAID' : 'UPCOMING'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Financial Statement Modal */}
      <FinancialStatementModal
        visible={showStatementModal}
        onClose={() => setShowStatementModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FC' },
  emptyStateCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#DBE2F0', marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#0A154F' },
  emptyStateText: { fontSize: 13, lineHeight: 20, color: '#66728A', fontFamily: 'Inter_400Regular' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  downloadReportText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  toastContainer: {
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    gap: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  activeLoanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loanBadge: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#3730A3',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  loanBikeName: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    letterSpacing: -0.4,
  },
  loanContractId: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Inter_600SemiBold',
  },
  progressValue: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E1B4B',
    borderRadius: 4,
  },
  frequencySection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  freqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  freqTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  freqBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E1B4B',
  },
  freqBtnActive: {
    backgroundColor: '#1E1B4B',
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  freqNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  freqSub: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  dueBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dueLeft: {
    flex: 1,
  },
  dueLabel: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: 'Inter_600SemiBold',
  },
  dueAmount: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#D97706',
    marginVertical: 2,
    letterSpacing: -0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueDateText: {
    fontSize: 12,
    color: '#B45309',
    fontFamily: 'Inter_500Medium',
  },
  payBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  payBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0F172A',
    marginTop: 2,
  },
  savingsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 20,
  },
  savingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  savingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#065F46',
  },
  savingsAmount: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#047857',
    marginVertical: 1,
  },
  savingsNote: {
    fontSize: 11,
    color: '#047857',
    fontFamily: 'Inter_500Medium',
  },
  scheduleSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 10,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  repaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  repLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repNum: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
  },
  repDate: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  repRight: {
    alignItems: 'flex-end',
  },
  repAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  statusPaid: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statusUpcoming: {
    backgroundColor: '#EDF2FA',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  statusTextPaid: {
    color: '#1768D1',
  },
  statusTextUpcoming: {
    color: '#66728A',
  },
});

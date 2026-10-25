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
} from 'lucide-react-native';
import { demoStore, DemoLoan, DemoWallet } from '../lib/demo-data';
import { MobileApi } from '../lib/api';
import FinancialStatementModal from '../components/FinancialStatementModal';

interface LoansScreenProps {
  token?: string | null;
}

export default function LoansScreen({ token }: LoansScreenProps) {
  const [loan, setLoan] = useState<DemoLoan>(demoStore.getLoan());
  const [wallet, setWallet] = useState<DemoWallet>(demoStore.getWallet());
  const [paying, setPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);

  useEffect(() => {
    if (token && !token.startsWith('demo-')) {
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

    const unsubscribe = demoStore.subscribe(() => {
      setLoan(demoStore.getLoan());
      setWallet(demoStore.getWallet());
    });
    return unsubscribe;
  }, [token]);

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
            <FileDown size={14} color="#2E3192" />
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
        {/* Active Loan Card */}
        <View style={styles.activeLoanCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.loanBadge}>ACTIVE BNPL LOAN</Text>
              <Text style={styles.loanBikeName}>{loan.bikeName}</Text>
              <Text style={styles.loanContractId}>Contract: {loan.id.toUpperCase()}</Text>
            </View>
            <View style={styles.statusBadge}>
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
              <View style={[styles.freqBtn, styles.freqBtnActive, { flex: 0, paddingHorizontal: 16 }]}>
                <Text style={[styles.freqBtnText, styles.freqBtnTextActive]}>
                  Weekly Deduction
                </Text>
              </View>
            </View>
            <Text style={styles.freqSub}>
              ⚡ ₦{loan.weeklyRepayment.toLocaleString()} auto-swept every Monday. 0% penalty when funded on time.
            </Text>
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
                <Calendar size={13} color="#D97706" />
                <Text style={styles.dueDateText}>Due: {loan.nextDueDate} (In {loan.daysRemaining} days)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payBtn, (paying || loan.status === 'completed') && styles.payBtnDisabled]}
              onPress={handlePayNext}
              disabled={paying || loan.status === 'completed'}
            >
              <Text style={styles.payBtnText}>
                {loan.status === 'completed' ? 'Completed' : paying ? 'Processing...' : 'Pay Now'}
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
              <Text style={[styles.breakdownValue, { color: '#2E3192' }]}>
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
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#4A50AE',
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  loanBikeName: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  loanContractId: {
    fontSize: 14,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statusBadgeText: {
    color: '#2E3192',
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
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_600SemiBold',
  },
  progressValue: {
    fontSize: 12,
    color: '#1E293B',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#EDF2FA',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2E3192',
    borderRadius: 5,
  },
  frequencySection: {
    backgroundColor: '#F6F7FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  freqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freqTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
  },
  freqBadge: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#4A50AE',
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freqSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    alignItems: 'center',
  },
  freqBtnActive: {
    backgroundColor: '#2E3192',
    borderColor: '#2E3192',
  },
  freqBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#66728A',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  freqSub: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  dueBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dueLeft: {
    flex: 1,
  },
  dueLabel: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: 'Inter_600SemiBold',
  },
  dueAmount: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#92400E',
    marginVertical: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: 'Inter_500Medium',
  },
  payBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  payBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EDF2FA',
    paddingTop: 12,
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
    marginTop: 2,
  },
  savingsCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 20,
  },
  savingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#065F46',
  },
  savingsAmount: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#047857',
    marginVertical: 1,
  },
  savingsNote: {
    fontSize: 10,
    color: '#087F75',
    fontFamily: 'Inter_400Regular',
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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Building2,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
} from 'lucide-react-native';
import { demoStore } from '../lib/demo-data';

interface FinancialStatementModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FinancialStatementModal({ visible, onClose }: FinancialStatementModalProps) {
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const report = demoStore.getFinancialReport();

  const handleDownloadPdf = () => {
    setDownloadSuccessMessage('Official Statement (PDF) generated & saved to downloads!');
    setTimeout(() => setDownloadSuccessMessage(null), 3500);
  };

  const handleExportCsv = () => {
    setDownloadSuccessMessage('Transaction Ledger (CSV) exported successfully!');
    setTimeout(() => setDownloadSuccessMessage(null), 3500);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleCol}>
              <View style={styles.officialBadge}>
                <ShieldCheck size={12} color="#2E3192" />
                <Text style={styles.officialBadgeText}>CBN / NIBSS AUDITED LEDGER</Text>
              </View>
              <Text style={styles.modalTitle}>Financial Statement of Account</Text>
              <Text style={styles.modalSubtitle}>Contract #{report.contractId} � {report.periodCovered}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Toast Alert Inside Modal */}
          {downloadSuccessMessage && (
            <View style={styles.toastBanner}>
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={styles.toastBannerText}>{downloadSuccessMessage}</Text>
            </View>
          )}

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Account Metadata Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Customer / Holder</Text>
                <Text style={styles.metaValue}>{report.accountHolder}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>National BVN</Text>
                <Text style={styles.metaValue}>{report.bvnMasked}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Statement Date</Text>
                <Text style={styles.metaValue}>{report.statementDate}</Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.metaLabel}>Active Payment Instrument</Text>
                <View style={styles.paymentInstRow}>
                  {demoStore.getHasAttachedCard() ? (
                    <CreditCard size={13} color="#2E3192" />
                  ) : (
                    <Building2 size={13} color="#2E3192" />
                  )}
                  <Text style={styles.paymentInstText}>{report.activePaymentMethod}</Text>
                </View>
              </View>
            </View>

            {/* Financial Summary 2x2 Grid */}
            <Text style={styles.sectionHeader}>FINANCIAL SUMMARY</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Total Financed</Text>
                <Text style={styles.summaryTileAmount}>?{report.totalFinanced.toLocaleString()}</Text>
                <Text style={styles.summaryTileSub}>Principal + Fees</Text>
              </View>

              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Total Repaid</Text>
                <Text style={[styles.summaryTileAmount, { color: '#2E3192' }]}>
                  ₦{report.totalRepaid.toLocaleString()}
                </Text>
                <Text style={styles.summaryTileSub}>Verified Sweeps</Text>
              </View>

              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Outstanding Balance</Text>
                <Text style={[styles.summaryTileAmount, { color: '#DC2626' }]}>
                  ?{report.outstandingBalance.toLocaleString()}
                </Text>
                <Text style={styles.summaryTileSub}>Amortized Schedule</Text>
              </View>

              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Save-As-You-Ride Vault</Text>
                <Text style={[styles.summaryTileAmount, { color: '#2563EB' }]}>
                  ?{report.savingsVaultBalance.toLocaleString()}
                </Text>
                <Text style={styles.summaryTileSub}>?? Auto-Unlocks on Payoff</Text>
              </View>
            </View>

            {/* Transaction Ledger */}
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.sectionHeader}>AUDITED TRANSACTION LEDGER</Text>
              <Text style={styles.ledgerCount}>{report.transactions.length} Records</Text>
            </View>

            <View style={styles.ledgerCard}>
              {report.transactions.map((tx, idx) => {
                const isPositive = tx.amount > 0;
                const isVault = tx.type === 'vault';
                return (
                  <View
                    key={tx.ref}
                    style={[
                      styles.ledgerItem,
                      idx !== report.transactions.length - 1 && styles.ledgerItemBorder,
                    ]}
                  >
                    <View style={styles.ledgerItemLeft}>
                      <View
                        style={[
                          styles.ledgerIconCircle,
                          isPositive
                            ? { backgroundColor: '#EEF2FF' }
                            : isVault
                            ? { backgroundColor: '#EEF2FF' }
                            : { backgroundColor: '#FFF1F2' },
                        ]}
                      >
                        {isPositive ? (
                          <ArrowDownRight size={16} color="#2E3192" />
                        ) : isVault ? (
                          <Lock size={15} color="#4A50AE" />
                        ) : (
                          <ArrowUpRight size={16} color="#E11D48" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.ledgerDesc}>{tx.desc}</Text>
                        <Text style={styles.ledgerSub}>
                          {tx.date} � Ref: {tx.ref}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ledgerItemRight}>
                      <Text
                        style={[
                          styles.ledgerAmount,
                          isPositive
                            ? { color: '#2E3192' }
                            : isVault
                            ? { color: '#4A50AE' }
                            : { color: '#0A154F' },
                        ]}
                      >
                        {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          tx.status === 'Success'
                            ? { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' }
                            : { backgroundColor: '#E0E7FF' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            tx.status === 'Success' ? { color: '#2E3192' } : { color: '#3730A3' },
                          ]}
                        >
                          {tx.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Export Actions Box */}
            <View style={styles.exportSection}>
              <Text style={styles.exportSectionTitle}>Official Document Export</Text>
              <Text style={styles.exportSectionSub}>
                Compliant with Central Bank of Nigeria Consumer Credit standards and NDPR data portability rules.
              </Text>

              <View style={styles.exportActionsRow}>
                <TouchableOpacity
                  style={styles.pdfExportBtn}
                  onPress={handleDownloadPdf}
                  activeOpacity={0.85}
                >
                  <FileDown size={18} color="#FFFFFF" />
                  <Text style={styles.pdfExportBtnText}>Download PDF Statement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.csvExportBtn}
                  onPress={handleExportCsv}
                  activeOpacity={0.85}
                >
                  <FileSpreadsheet size={18} color="#2E3192" />
                  <Text style={styles.csvExportBtnText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleCol: {
    flex: 1,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  officialBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  toastBanner: {
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  toastBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  metaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  metaValue: {
    fontSize: 12,
    color: '#0A154F',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  paymentInstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  paymentInstText: {
    fontSize: 12,
    color: '#2E3192',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTileLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
  },
  summaryTileAmount: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginVertical: 4,
  },
  summaryTileSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Inter_500Medium',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerCount: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  ledgerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ledgerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ledgerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerDesc: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  ledgerSub: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  ledgerItemRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  exportSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 3,
  },
  exportSectionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  exportActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfExportBtn: {
    flex: 1.4,
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pdfExportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  csvExportBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  csvExportBtnText: {
    color: '#2E3192',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

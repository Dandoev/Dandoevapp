import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import {
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Download,
  Bell,
  FileText,
  LogOut,
  ChevronRight,
  CheckCircle,
  CreditCard,
  Building2,
  FileDown,
  Trash2,
} from 'lucide-react-native';
import { demoStore, DemoUserProfile } from '../lib/demo-data';
import FinancialStatementModal from '../components/FinancialStatementModal';
import { APP_CONFIG } from '../lib/config';
import { MobileApi } from '../lib/api';
import RealProfileScreen from './RealProfileScreen';

interface ProfileScreenProps {
  token?: string | null;
  onLogout: () => void;
  onNavigateToTerms: () => void;
  onNavigateToKyc?: () => void;
}

export default function ProfileScreen(props: ProfileScreenProps) {
  if (props.token && !props.token.startsWith('demo-')) return <RealProfileScreen token={props.token} onLogout={props.onLogout} onNavigateToKyc={props.onNavigateToKyc} onNavigateToTerms={props.onNavigateToTerms} />;
  return <DemoProfileScreen {...props} />;
}

function DemoProfileScreen({ onLogout, onNavigateToTerms, onNavigateToKyc }: ProfileScreenProps) {
  const [user, setUser] = useState<DemoUserProfile>(demoStore.getUser());
  const [loan, setLoan] = useState(demoStore.getLoan());
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dailySavingsEnabled, setDailySavingsEnabled] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [hasAttachedCard, setHasAttachedCard] = useState<boolean>(demoStore.getHasAttachedCard());
  const [attachedCard, setAttachedCard] = useState(demoStore.getAttachedCard());
  const [attachedBank, setAttachedBank] = useState(demoStore.getAttachedBank());
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = demoStore.subscribe(() => {
      setUser(demoStore.getUser());
      setLoan(demoStore.getLoan());
      setHasAttachedCard(demoStore.getHasAttachedCard());
      setAttachedCard(demoStore.getAttachedCard());
      setAttachedBank(demoStore.getAttachedBank());
    });
    return unsubscribe;
  }, []);

  const handleExportData = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('NDPR/GDPR Data Export Archive (JSON) ready for download!\n\nAll personal data, credit ledger entries, and KYC timestamps have been bundled securely.');
    }, 800);
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account & Data',
      'Are you sure you want to delete your DandoEv account? All personal KYC records, credit limits, and profile data will be scheduled for permanent erasure under NDPR Article 17.\n\nNote: If you have an active or pending lease balance, your account cannot be deleted until the balance is cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (loan && ['active', 'approved', 'under_review', 'pending'].includes(loan.status)) {
              Alert.alert(
                'Cannot Delete Account',
                'You have an active or pending financing lease. Please settle your outstanding balance before requesting account deletion.'
              );
              return;
            }

            try {
              await MobileApi.requestAccountDeletion({
                email: user.email,
                phone: user.phone,
                reason: 'Requested from mobile app profile',
              });
            } catch {
              // Proceed even if offline in demo mode
            }

            Alert.alert(
              'Account Deletion Queued',
              'Your account deletion request has been registered and personal data scheduled for permanent erasure. You will now be signed out.',
              [{ text: 'OK', onPress: onLogout }]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your space.</Text>
        <Text style={styles.subtitle}>Your details, preferences, and privacy in one place.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.firstName[0]}
              {user.lastName[0]}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity
              style={styles.kycBadge}
              onPress={onNavigateToKyc}
              activeOpacity={0.8}
            >
              <ShieldCheck size={14} color="#2E3192" />
              <Text style={styles.kycBadgeText}>
                KYC Tier {user.kycTier} Verified {user.kycTier < 3 ? '• Upgrade to Tier 3 →' : '• Highest Limit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Status Cards */}
        <View style={styles.verificationRow}>
          <View style={styles.verifBox}>
            <CheckCircle size={16} color="#2E3192" />
            <Text style={styles.verifText}>BVN Verified</Text>
          </View>
          <View style={styles.verifBox}>
            <CheckCircle size={16} color="#2E3192" />
            <Text style={styles.verifText}>NIN Confirmed</Text>
          </View>
          <TouchableOpacity
            style={[styles.verifBox, user.kycTier >= 3 && { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}
            onPress={onNavigateToKyc}
          >
            <CheckCircle size={16} color={user.kycTier >= 3 ? '#2E3192' : '#6366F1'} />
            <Text style={[styles.verifText, user.kycTier >= 3 ? { color: '#2E3192' } : { color: '#4A50AE' }]}>
              {user.kycTier >= 3 ? 'Guarantor OK' : '+ Tier 3 KYC'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BNPL Deduction Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>BNPL Repayment Deduction Model</Text>

          <View style={styles.deductionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Deduction Frequency</Text>
              <Text style={styles.prefSub}>
                Weekly Sweeps (₦10,500 auto-swept every Monday)
              </Text>
            </View>
            <View style={[styles.pillContainer, { marginTop: 8 }]}>
              <View style={[styles.profilePill, styles.profilePillActive, { flex: 0, paddingHorizontal: 16 }]}>
                <Text style={[styles.profilePillText, styles.profilePillTextActive]}>
                  Weekly Deduction
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal & Contact Information</Text>

          <View style={styles.infoRow}>
            <Phone size={16} color="#66728A" />
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Mail size={16} color="#66728A" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color="#66728A" />
            <Text style={styles.infoLabel}>Delivery City</Text>
            <Text style={styles.infoValue}>{user.city}, {user.state}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Briefcase size={16} color="#66728A" />
            <Text style={styles.infoLabel}>Occupation</Text>
            <Text style={styles.infoValue}>{user.employmentStatus}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences & Notifications</Text>

          <View style={styles.prefRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Bell size={18} color="#2E3192" />
              <View>
                <Text style={styles.prefTitle}>Push Notifications</Text>
                <Text style={styles.prefSub}>Payment reminders & battery alerts</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#DBE2F0', true: '#C7D2FE' }}
              thumbColor={pushEnabled ? '#2E3192' : '#94A3B8'}
            />
          </View>

          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#2E3192" />
              <View>
                <Text style={styles.prefTitle}>Daily Save-As-You-Ride</Text>
                <Text style={styles.prefSub}>₦1,000/day micro-savings sweep</Text>
              </View>
            </View>
            <Switch
              value={dailySavingsEnabled}
              onValueChange={setDailySavingsEnabled}
              trackColor={{ false: '#DBE2F0', true: '#C7D2FE' }}
              thumbColor={dailySavingsEnabled ? '#2E3192' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Attached Autopayment Instrument Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Attached Autopayment Instrument</Text>
            <View style={styles.autopayBadge}>
              <Text style={styles.autopayBadgeText}>AUTOPAY ACTIVE</Text>
            </View>
          </View>

          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodHeader}>
              <View style={styles.paymentMethodLeft}>
                {hasAttachedCard ? (
                  <View style={[styles.paymentMethodIcon, { backgroundColor: '#EA580C' }]}>
                    <CreditCard size={18} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.paymentMethodIcon, { backgroundColor: '#1E3A8A' }]}>
                    <Building2 size={18} color="#FFFFFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentMethodTitle}>
                    {hasAttachedCard ? attachedCard.bankName : attachedBank.bankName}
                  </Text>
                  <Text style={styles.paymentMethodSub}>
                    {hasAttachedCard
                      ? `${attachedCard.network} • ${attachedCard.cardNumberMasked} (Exp: ${attachedCard.expiry})`
                      : `NUBAN: ${attachedBank.accountNumberMasked} • Mandate: ${attachedBank.mandateReference}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Switch pill between card & bank */}
            <View style={styles.switchRow}>
              <Text style={styles.switchNote}>Switch repayment instrument:</Text>
              <View style={styles.miniSwitcher}>
                <TouchableOpacity
                  style={[styles.miniSwitchBtn, hasAttachedCard && styles.miniSwitchBtnActive]}
                  onPress={() => demoStore.setHasAttachedCard(true)}
                >
                  <Text style={[styles.miniSwitchText, hasAttachedCard && styles.miniSwitchTextActive]}>
                    ATM Card
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniSwitchBtn, !hasAttachedCard && styles.miniSwitchBtnActive]}
                  onPress={() => demoStore.setHasAttachedCard(false)}
                >
                  <Text style={[styles.miniSwitchText, !hasAttachedCard && styles.miniSwitchTextActive]}>
                    Bank Mandate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Statement Action Row */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 4 }]}
            onPress={() => setShowStatementModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <FileDown size={18} color="#2E3192" />
              <View>
                <Text style={styles.actionTitle}>Statement of Account & Financial Report</Text>
                <Text style={styles.actionSub}>View audited amortized schedule, vault & export PDF</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Regulatory & NDPR Compliance Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>NDPR Privacy & Data Rights</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportData}
            disabled={downloading}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Download size={18} color="#0284C7" />
              <View>
                <Text style={styles.actionTitle}>
                  {downloading ? 'Preparing Archive...' : 'Download My Data (NDPR Art. 18)'}
                </Text>
                <Text style={styles.actionSub}>Export complete profile and credit ledger</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Linking.openURL(APP_CONFIG.privacyPolicyUrl)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#2E3192" />
              <View>
                <Text style={styles.actionTitle}>Privacy Policy</Text>
                <Text style={styles.actionSub}>NDPR compliance, data retention & rights</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={onNavigateToTerms}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <FileText size={18} color="#66728A" />
              <View>
                <Text style={styles.actionTitle}>Platform Terms & BNPL Agreement</Text>
                <Text style={styles.actionSub}>Legal terms, warranties & dispute policy</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleDeleteAccountPress}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trash2 size={18} color="#DC2626" />
              <View>
                <Text style={[styles.actionTitle, { color: '#DC2626' }]}>
                  Delete Account & Data (NDPR Art. 17)
                </Text>
                <Text style={styles.actionSub}>Permanently delete account and personal records</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out of DandoEv</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Official Financial Statement Modal */}
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
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E3192',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  userEmail: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  kycBadge: {
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
    marginTop: 6,
  },
  kycBadgeText: {
    color: '#2E3192',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  verifBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  verifText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#1E293B',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  infoLabel: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: '#0A154F',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
  deductionRow: {
    paddingVertical: 4,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  profilePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  profilePillActive: {
    backgroundColor: '#2E3192',
    borderColor: '#2E3192',
  },
  profilePillText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#66728A',
  },
  profilePillTextActive: {
    color: '#FFFFFF',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  prefTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  prefSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#66728A',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  actionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#66728A',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 4,
    marginBottom: 20,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  autopayBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  autopayBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    letterSpacing: 0.5,
  },
  paymentMethodCard: {
    backgroundColor: '#F6F7FC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 10,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentMethodIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  paymentMethodSub: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#66728A',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  switchNote: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#66728A',
  },
  miniSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#DBE2F0',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  miniSwitchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniSwitchBtnActive: {
    backgroundColor: '#2E3192',
  },
  miniSwitchText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  miniSwitchTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

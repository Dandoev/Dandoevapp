import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Building,
  UserCheck,
  CreditCard,
  Lock,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { demoStore, DemoUserProfile } from '../lib/demo-data';

interface KycScreenProps {
  token?: string | null;
  onBack: () => void;
  onKycComplete: () => void;
}

export default function KycScreen({ token, onBack, onKycComplete }: KycScreenProps) {
  const [user, setUser] = useState<DemoUserProfile>(demoStore.getUser());
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 Form
  const [bvn, setBvn] = useState('22233344455');
  const [nin, setNin] = useState('11223344556');
  const [address, setAddress] = useState(user.address);

  // Step 2 Form (Financial)
  const [monthlyIncome, setMonthlyIncome] = useState('350000');
  const [bankName, setBankName] = useState('Providus Bank');
  const [bankAccount, setBankAccount] = useState('9928172635');
  const [openBankingLinked, setOpenBankingLinked] = useState(true);

  // Step 3 Form (Guarantor)
  const [guarantorName, setGuarantorName] = useState(user.guarantorName || 'Chief Babatunde Johnson');
  const [guarantorPhone, setGuarantorPhone] = useState(user.guarantorPhone || '+234 802 334 5566');
  const [guarantorRelation, setGuarantorRelation] = useState('Uncle / Business Partner');

  // Step completion
  const handleStep1 = () => {
    setCurrentStep(2);
  };

  const handleStep2 = () => {
    setCurrentStep(3);
  };

  const handleFinalSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      demoStore.submitTier3Kyc({
        guarantorName,
        guarantorPhone,
        relationship: guarantorRelation,
      });
      setCurrentStep(4); // Success screen
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>BNPL KYC Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 3-Step Progress Indicators */}
      <View style={styles.stepsRow}>
        {[1, 2, 3].map((step) => {
          const isActive = currentStep === step;
          const isDone = currentStep > step;
          return (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepBubble,
                  isActive && styles.stepBubbleActive,
                  isDone && styles.stepBubbleDone,
                ]}
              >
                {isDone ? (
                  <CheckCircle2 size={14} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>
                    {step}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]}>
                {step === 1 ? 'Identity' : step === 2 ? 'Financial' : 'Guarantor'}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: IDENTITY & BVN / NIN */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <ShieldCheck size={16} color="#4A50AE" />
              <Text style={styles.cardBadgeText}>STEP 1 OF 3: IDENTITY TIER</Text>
            </View>
            <Text style={styles.cardTitle}>Identity & NIBSS Verification</Text>
            <Text style={styles.cardSubtitle}>
              CBN-mandated biometric verification to prevent identity theft.
            </Text>

            <Text style={styles.label}>Bank Verification Number (BVN)</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#0CBDA9" />
              <TextInput
                style={styles.input}
                value={bvn}
                onChangeText={setBvn}
                keyboardType="numeric"
                maxLength={11}
              />
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>✓ NIBSS Match</Text>
              </View>
            </View>

            <Text style={styles.label}>National Identity Number (NIN)</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#0CBDA9" />
              <TextInput
                style={styles.input}
                value={nin}
                onChangeText={setNin}
                keyboardType="numeric"
                maxLength={11}
              />
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>✓ NIMC Match</Text>
              </View>
            </View>

            <Text style={styles.label}>Lagos Residential Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <TouchableOpacity style={styles.continueBtn} onPress={handleStep1} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue to Financial Verification</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: FINANCIAL ASSESSMENT & OPEN BANKING */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <Building size={16} color="#4A50AE" />
              <Text style={styles.cardBadgeText}>STEP 2 OF 3: FINANCIAL TIER</Text>
            </View>
            <Text style={styles.cardTitle}>Open Banking & Income Check</Text>
            <Text style={styles.cardSubtitle}>
              Mono Open Banking securely verifies your average monthly cash inflow.
            </Text>

            <View style={styles.openBankingBox}>
              <View style={styles.openBankingLeft}>
                <Building size={20} color="#087F75" />
                <View>
                  <Text style={styles.openBankingTitle}>Mono Connect Linked</Text>
                  <Text style={styles.openBankingSub}>Providus Bank • Account 9928172635</Text>
                </View>
              </View>
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>Active</Text>
              </View>
            </View>

            <Text style={styles.label}>Verified Monthly Income (NGN)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.creditScoreBox}>
              <Sparkles size={18} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.creditScoreTitle}>Preliminary Credit Assessment</Text>
                <Text style={styles.creditScoreVal}>Score: 84/100 (Prime Commercial Rider)</Text>
                <Text style={styles.creditScoreSub}>
                  High monthly inflow qualifies you for up to ₦2,000,000 credit at 0% down payment!
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.continueBtn} onPress={handleStep2} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue to Guarantor Verification</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: DIGITAL GUARANTOR CO-SIGNING */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <UserCheck size={16} color="#4A50AE" />
              <Text style={styles.cardBadgeText}>STEP 3 OF 3: DIGITAL GUARANTOR</Text>
            </View>
            <Text style={styles.cardTitle}>Guarantor Information</Text>
            <Text style={styles.cardSubtitle}>
              Required for commercial assets above ₦1,000,000. An SMS & email invite will be sent.
            </Text>

            <Text style={styles.label}>Guarantor Full Legal Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={guarantorName}
                onChangeText={setGuarantorName}
              />
            </View>

            <Text style={styles.label}>Guarantor Phone Number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={guarantorPhone}
                onChangeText={setGuarantorPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Relationship to Applicant</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={guarantorRelation}
                onChangeText={setGuarantorRelation}
              />
            </View>

            <View style={styles.guarantorConsentBox}>
              <CheckCircle2 size={16} color="#0CBDA9" />
              <Text style={styles.guarantorConsentText}>
                Digital agreement will be dispatched via SMS & WhatsApp for instant 1-tap co-signing.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, loading && { opacity: 0.8 }]}
              onPress={handleFinalSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Submit KYC & Activate BNPL</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: VERIFIED CONGRATULATIONS */}
        {currentStep === 4 && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={styles.successIconBubble}>
              <ShieldCheck size={48} color="#0CBDA9" />
            </View>
            <Text style={styles.congratsTitle}>Tier 3 KYC Verified! 🎉</Text>
            <Text style={styles.congratsSubtitle}>
              Your identity, financial inflow, and guarantor have been approved.
            </Text>

            <View style={styles.creditLimitBox}>
              <Text style={styles.creditLimitLabel}>APPROVED BNPL CREDIT LIMIT</Text>
              <Text style={styles.creditLimitAmount}>₦2,500,000</Text>
              <Text style={styles.creditLimitSub}>
                Available for 0% Down Payment • Weekly Repayments Enabled
              </Text>
            </View>

            <TouchableOpacity style={styles.finishBtn} onPress={onKycComplete} activeOpacity={0.85}>
              <Text style={styles.finishBtnText}>Go to Loans & Servicing</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F6F7FC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBE2F0',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBubbleActive: {
    backgroundColor: '#2E3192',
  },
  stepBubbleDone: {
    backgroundColor: '#0CBDA9',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#66728A',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter_600SemiBold',
  },
  stepLabelActive: {
    color: '#2E3192',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#4A50AE',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0A154F',
  },
  verifiedTag: {
    backgroundColor: '#E6FAF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    color: '#087F75',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  openBankingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E6FAF6',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  openBankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  openBankingTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#065F46',
  },
  openBankingSub: {
    fontSize: 11,
    color: '#087F75',
    fontFamily: 'Inter_400Regular',
  },
  creditScoreBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 18,
  },
  creditScoreTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#92400E',
  },
  creditScoreVal: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#78350F',
    marginVertical: 2,
  },
  creditScoreSub: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  guarantorConsentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF2FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  guarantorConsentText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  continueBtn: {
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  successIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6FAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    textAlign: 'center',
  },
  congratsSubtitle: {
    fontSize: 13,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  creditLimitBox: {
    width: '100%',
    backgroundColor: '#E6FAF6',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginBottom: 24,
  },
  creditLimitLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#087F75',
  },
  creditLimitAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#047857',
    marginVertical: 4,
  },
  creditLimitSub: {
    fontSize: 11,
    color: '#065F46',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  finishBtn: {
    width: '100%',
    backgroundColor: '#2E3192',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});

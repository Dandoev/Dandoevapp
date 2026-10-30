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
  Image,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Building,
  CreditCard,
  Lock,
  Sparkles,
  ChevronRight,
  Upload,
  Briefcase,
  Camera,
  ScanFace,
  FileText,
  AlertCircle,
  X,
  Calendar,
} from 'lucide-react-native';
import { demoStore, DemoUserProfile } from '../lib/demo-data';
import RealKycScreen from './RealKycScreen';

interface KycScreenProps {
  token?: string | null;
  onBack: () => void;
  onKycComplete: () => void;
}

export default function KycScreen(props: KycScreenProps) {
  if (props.token && !props.token.startsWith('demo-')) return <RealKycScreen token={props.token} onBack={props.onBack} />;
  return <DemoKycScreen {...props} />;
}

const GIG_PLATFORMS = [
  'Bolt',
  'Chowdeck',
  'Glovo',
  'Indrive',
  'Uber',
  'Lagride',
  'Gokada',
  'Fez Delivery',
  'Independent Courier',
  'Corporate Dispatch',
];

const ID_TYPES = [
  { id: 'nin', label: 'NIN (National ID Number / Slip)', digits: 11 },
  { id: 'driver_license', label: "Driver's License (FRSC)", digits: 12 },
  { id: 'voters_card', label: "Voter's Card (INEC PVC)", digits: 19 },
  { id: 'passport', label: 'International Passport', digits: 9 },
];

function DemoKycScreen({ token, onBack, onKycComplete }: KycScreenProps) {
  const [user, setUser] = useState<DemoUserProfile>(demoStore.getUser());
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Personal & Residential
  const [fullName, setFullName] = useState(`${user.firstName} ${user.lastName}`);
  const [phone, setPhone] = useState(user.phone || '+234 812 345 6789');
  const [residentialAddress, setResidentialAddress] = useState(user.address || '12 Admiralty Way, Lekki Phase 1, Lagos');

  // Step 2: Gig Work & Earnings (comes BEFORE ID upload)
  const [selectedPlatform, setSelectedPlatform] = useState('Chowdeck');
  const [joinedDate, setJoinedDate] = useState('March 2023');
  const [weeklyEarnings, setWeeklyEarnings] = useState('45000');
  const [earningsScreenshot, setEarningsScreenshot] = useState<string | null>(
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80'
  );
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // Step 3: Government ID Upload
  const [selectedIdType, setSelectedIdType] = useState('nin');
  const [idNumber, setIdNumber] = useState('22334455667');
  const [idDocUploaded, setIdDocUploaded] = useState(true);

  // Step 4: Selfie Liveness Check
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieAnalyzing, setSelfieAnalyzing] = useState(false);

  // Step Navigations
  const handleNextStep1 = () => {
    setErrorMessage(null);
    if (!fullName.trim() || !residentialAddress.trim()) {
      setErrorMessage('Please provide your full legal name and address.');
      return;
    }
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMessage(null);
    if (!joinedDate.trim()) {
      setErrorMessage(`Please specify when you joined ${selectedPlatform} (e.g. March 2023).`);
      return;
    }
    if (!weeklyEarnings.trim() || Number(weeklyEarnings) <= 0) {
      setErrorMessage('Please enter your average weekly earnings.');
      return;
    }
    if (!earningsScreenshot) {
      setErrorMessage('Please upload a screenshot of your courier earning dashboard.');
      return;
    }
    setCurrentStep(3);
  };

  const handleNextStep3 = () => {
    setErrorMessage(null);
    if (!idNumber.trim() || idNumber.length < 8) {
      setErrorMessage('Please enter a valid government identification number.');
      return;
    }
    setCurrentStep(4);
  };

  const handleSimulateSelfie = () => {
    setSelfieAnalyzing(true);
    setTimeout(() => {
      setSelfieAnalyzing(false);
      setSelfieCaptured(true);
    }, 1200);
  };

  const handleFinalSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      demoStore.submitTier3Kyc({
        guarantorName: 'Chief Babatunde Johnson',
        guarantorPhone: '+234 802 334 5566',
        relationship: 'Uncle',
      });
      setCurrentStep(5); // Success confirmation
    }, 1000);
  };

  const simulateUploadScreenshot = () => {
    setUploadingScreenshot(true);
    setTimeout(() => {
      setUploadingScreenshot(false);
      setEarningsScreenshot('https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80');
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0A154F" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Rider Verification & KYC</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 4-Step Progress Indicator */}
      {currentStep <= 4 && (
        <View style={styles.progressHeader}>
          <View style={styles.stepsRow}>
            {[
              { num: 1, label: 'Profile' },
              { num: 2, label: 'Work & Proof' },
              { num: 3, label: 'Govt ID' },
              { num: 4, label: 'Selfie Check' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <View key={step.num} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepBubble,
                      isActive && styles.stepBubbleActive,
                      isDone && styles.stepBubbleDone,
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={13} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>
                        {step.num}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]} numberOfLines={1}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.stepProgressLineContainer}>
            <View style={[styles.stepProgressLineFill, { width: `${(currentStep / 4) * 100}%` }]} />
          </View>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <AlertCircle size={15} color="#B91C1C" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ============================================================ */}
        {/* STEP 1: RESIDENTIAL & PERSONAL DETAILS */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <ShieldCheck size={14} color="#3730A3" />
              <Text style={styles.cardBadgeText}>STEP 1 OF 4: PERSONAL & RESIDENCE</Text>
            </View>
            <Text style={styles.cardTitle}>Where are you based?</Text>
            <Text style={styles.cardSubtitle}>
              Please verify your legal name and residential base in Lagos for equipment assignment.
            </Text>

            <Text style={styles.label}>Full Legal Name (as on ID)</Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g. Solomon Dunu" />
            </View>

            <Text style={styles.label}>Phone Number (WhatsApp Contact)</Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <Text style={styles.label}>Residential Address (Lagos State)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { height: 48 }]}
                value={residentialAddress}
                onChangeText={setResidentialAddress}
                placeholder="Street address, neighborhood & LGA"
              />
            </View>

            <View style={styles.trustBox}>
              <Lock size={15} color="#1E1B4B" />
              <Text style={styles.trustText}>
                Encrypted with bank-grade security. Used strictly for your master lease contract.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep1} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Continue to Gig & Earnings Proof</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* STEP 2: EMPLOYMENT / GIG WORK & EARNINGS DASHBOARD (PRIORITY) */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <Briefcase size={14} color="#3730A3" />
              <Text style={styles.cardBadgeText}>STEP 2 OF 4: GIG EARNINGS & PROOF</Text>
            </View>
            <Text style={styles.cardTitle}>Courier & Earnings Profile</Text>
            <Text style={styles.cardSubtitle}>
              Prove your operational cashflow to qualify for 0% down payment and higher credit tiers.
            </Text>

            <Text style={styles.label}>Primary Dispatch / Delivery Platform</Text>
            <View style={styles.platformChipRow}>
              {GIG_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatform === platform;
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[styles.platformChip, isSelected && styles.platformChipActive]}
                    onPress={() => setSelectedPlatform(platform)}
                  >
                    <Text style={[styles.platformChipText, isSelected && styles.platformChipTextActive]}>
                      {platform}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>When Did You Join {selectedPlatform}? (Month & Year)</Text>
            <View style={styles.inputContainer}>
              <Calendar size={18} color="#64748B" />
              <TextInput
                style={[styles.input, { marginLeft: 8 }]}
                value={joinedDate}
                onChangeText={setJoinedDate}
                placeholder="e.g. March 2023 or MM/YYYY"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <Text style={styles.fieldHint}>
              Courier platform tenure helps fast-track verification for 0% down payment.
            </Text>

            <Text style={[styles.label, { marginTop: 14 }]}>Estimated Weekly Earnings (NGN)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>₦</Text>
              <TextInput
                style={styles.input}
                value={weeklyEarnings}
                onChangeText={setWeeklyEarnings}
                keyboardType="numeric"
                placeholder="e.g. 45,000"
              />
            </View>
            <Text style={styles.fieldHint}>
              Equates to approx. ₦{(Number(weeklyEarnings || 0) * 4.33).toLocaleString(undefined, { maximumFractionDigits: 0 })} monthly gross turnover.
            </Text>

            {/* Upload Courier Earning Dashboard Screenshot */}
            <Text style={[styles.label, { marginTop: 16 }]}>Courier Dashboard Screenshot (Required)</Text>
            <Text style={styles.fieldHint}>
              Screenshot your active payout or weekly orders history in Chowdeck, Glovo, Gokada, etc.
            </Text>

            {earningsScreenshot ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: earningsScreenshot }} style={styles.screenshotPreview} resizeMode="cover" />
                <View style={styles.previewMeta}>
                  <View style={styles.previewBadge}>
                    <CheckCircle2 size={13} color="#15803D" />
                    <Text style={styles.previewBadgeText}>Screenshot Attached</Text>
                  </View>
                  <Text style={styles.previewHint}>High readability. Payout stats visible.</Text>
                  <TouchableOpacity style={styles.replaceBtn} onPress={simulateUploadScreenshot}>
                    <Text style={styles.replaceBtnText}>Replace Screenshot</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadDropzone}
                onPress={simulateUploadScreenshot}
                disabled={uploadingScreenshot}
                activeOpacity={0.8}
              >
                {uploadingScreenshot ? (
                  <ActivityIndicator color="#1E1B4B" />
                ) : (
                  <>
                    <View style={styles.uploadIconCircle}>
                      <Upload size={22} color="#1E1B4B" />
                    </View>
                    <Text style={styles.uploadTitle}>Tap to upload earning screenshot</Text>
                    <Text style={styles.uploadSubtitle}>PNG, JPG, or PDF (Max 5MB • Auto-compressed)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.trustBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
              <Sparkles size={15} color="#15803D" />
              <Text style={[styles.trustText, { color: '#166534' }]}>
                Verified weekly earnings reduce deposit requirements to ₦0 and unlock rapid loan approval.
              </Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(1)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleNextStep2} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Continue to ID Upload</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* STEP 3: GOVERNMENT ID VERIFICATION (NIN, DRIVER'S LICENSE) */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <CreditCard size={14} color="#3730A3" />
              <Text style={styles.cardBadgeText}>STEP 3 OF 4: GOVERNMENT IDENTITY</Text>
            </View>
            <Text style={styles.cardTitle}>Identity Document</Text>
            <Text style={styles.cardSubtitle}>
              CBN & NDPR compliant verification. Select an official document to link.
            </Text>

            <Text style={styles.label}>Select Identification Document</Text>
            <View style={styles.idTypeRow}>
              {ID_TYPES.map((type) => {
                const isSelected = selectedIdType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.idTypeChip, isSelected && styles.idTypeChipActive]}
                    onPress={() => setSelectedIdType(type.id)}
                  >
                    <Text style={[styles.idTypeChipText, isSelected && styles.idTypeChipTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Identification Number</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#1E1B4B" />
              <TextInput
                style={styles.input}
                value={idNumber}
                onChangeText={setIdNumber}
                keyboardType="numeric"
                placeholder="Enter 11-digit NIN or document ID"
              />
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>✓ NIMC Match</Text>
              </View>
            </View>

            {/* Document Upload Box */}
            <Text style={[styles.label, { marginTop: 12 }]}>Upload Document Copy / Slip</Text>
            <View style={styles.docUploadBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <FileText size={22} color="#1E1B4B" />
                <View>
                  <Text style={styles.docFileName}>NIN_Slip_Verified.pdf</Text>
                  <Text style={styles.docFileSize}>280 KB • Encrypted on device</Text>
                </View>
              </View>
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>Attached</Text>
              </View>
            </View>

            <View style={styles.trustBox}>
              <Lock size={15} color="#1E1B4B" />
              <Text style={styles.trustText}>
                Your identity data is processed via licensed NIMC verification servers.
              </Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(2)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleNextStep3} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Continue to Selfie Check</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* STEP 4: SELFIE LIVENESS VERIFICATION */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <View style={styles.card}>
            <View style={styles.cardBadge}>
              <ScanFace size={14} color="#3730A3" />
              <Text style={styles.cardBadgeText}>STEP 4 OF 4: SELFIE LIVENESS</Text>
            </View>
            <Text style={styles.cardTitle}>Quick Face Verification</Text>
            <Text style={styles.cardSubtitle}>
              Takes 3 seconds. Confirms your live face matches your government ID photograph.
            </Text>

            <View style={styles.selfieCanvas}>
              {selfieCaptured ? (
                <View style={styles.selfieSuccessState}>
                  <CheckCircle2 size={48} color="#15803D" />
                  <Text style={styles.selfieSuccessTitle}>Biometric Liveness Confirmed!</Text>
                  <Text style={styles.selfieSuccessSub}>Face matched against NIMC photograph (99.2% confidence score).</Text>
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setSelfieCaptured(false)}>
                    <Text style={styles.retakeBtnText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : selfieAnalyzing ? (
                <View style={styles.selfieLoadingState}>
                  <ActivityIndicator size="large" color="#1E1B4B" />
                  <Text style={styles.selfieLoadingText}>Scanning facial biometrics & liveness...</Text>
                </View>
              ) : (
                <View style={styles.selfiePromptState}>
                  <View style={styles.selfieOvalGuide}>
                    <Camera size={34} color="#64748B" />
                  </View>
                  <Text style={styles.selfieGuideTitle}>Center your face in good lighting</Text>
                  <Text style={styles.selfieGuideSub}>Remove hats, face masks, or dark sunglasses.</Text>
                  <TouchableOpacity style={styles.captureBtn} onPress={handleSimulateSelfie}>
                    <Camera size={16} color="#FFFFFF" />
                    <Text style={styles.captureBtnText}>Capture 3-Sec Liveness</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(3)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, (!selfieCaptured || loading) && { opacity: 0.6 }]}
                onPress={handleFinalSubmit}
                disabled={!selfieCaptured || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Submit Complete KYC</Text>
                    <ChevronRight size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* STEP 5: VERIFICATION SUBMITTED & SUCCESS */}
        {/* ============================================================ */}
        {currentStep === 5 && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={styles.successIconBubble}>
              <ShieldCheck size={42} color="#15803D" />
            </View>
            <Text style={styles.successTitle}>KYC Submitted Successfully! 🚀</Text>
            <Text style={styles.successSub}>
              Your earnings proof, government ID, and face biometrics have been securely submitted to underwriting.
            </Text>

            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <CheckCircle2 size={16} color="#15803D" />
                <Text style={styles.timelineText}>Gig Platform: {selectedPlatform} (Joined {joinedDate || '2023'})</Text>
              </View>
              <View style={styles.timelineItem}>
                <CheckCircle2 size={16} color="#15803D" />
                <Text style={styles.timelineText}>Weekly Earnings: ₦{Number(weeklyEarnings || 0).toLocaleString()}/wk verified</Text>
              </View>
              <View style={styles.timelineItem}>
                <CheckCircle2 size={16} color="#15803D" />
                <Text style={styles.timelineText}>National Identity (NIN): Biometrics matched</Text>
              </View>
              <View style={styles.timelineItem}>
                <CheckCircle2 size={16} color="#15803D" />
                <Text style={styles.timelineText}>Preliminary Approval: Tier 1 Prime Eligible (0% Down)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onKycComplete} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Return to Dashboard</Text>
              <ChevronRight size={18} color="#FFFFFF" />
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
    borderBottomColor: '#E2E8F0',
  },
  navBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  navTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  progressHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBubbleActive: {
    backgroundColor: '#1E1B4B',
  },
  stepBubbleDone: {
    backgroundColor: '#15803D',
  },
  stepNum: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#64748B',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#0A154F',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  stepProgressLineContainer: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepProgressLineFill: {
    height: '100%',
    backgroundColor: '#1E1B4B',
    borderRadius: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cardBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#3730A3',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginTop: -4,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#0F172A',
  },
  currencyPrefix: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E1B4B',
    marginRight: 6,
  },
  platformChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  platformChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  platformChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  platformChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  platformChipTextActive: {
    color: '#FFFFFF',
  },
  uploadDropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  screenshotPreview: {
    width: 70,
    height: 90,
    borderRadius: 8,
  },
  previewMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  previewBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#15803D',
  },
  previewHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  replaceBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  replaceBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  idTypeRow: {
    gap: 6,
    marginBottom: 12,
  },
  idTypeChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idTypeChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  idTypeChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  idTypeChipTextActive: {
    color: '#3730A3',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  verifiedTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#15803D',
  },
  docUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  docFileName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  docFileSize: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  selfieCanvas: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    marginBottom: 16,
  },
  selfiePromptState: {
    alignItems: 'center',
  },
  selfieOvalGuide: {
    width: 76,
    height: 96,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selfieGuideTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
    marginBottom: 2,
  },
  selfieGuideSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginBottom: 16,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1B4B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  captureBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  selfieLoadingState: {
    alignItems: 'center',
    gap: 12,
  },
  selfieLoadingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#475569',
  },
  selfieSuccessState: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  selfieSuccessTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#15803D',
    marginTop: 8,
    marginBottom: 4,
  },
  selfieSuccessSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 14,
  },
  retakeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  retakeBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
  },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  trustText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#3730A3',
    flex: 1,
    lineHeight: 16,
  },
  primaryBtn: {
    backgroundColor: '#1E1B4B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#475569',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  successIconBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#1E293B',
  },
});

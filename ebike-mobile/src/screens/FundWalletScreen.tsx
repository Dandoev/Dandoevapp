import React, { useState, useEffect } from 'react';
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
  Copy,
  CreditCard,
  Building,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Wifi,
  ShieldCheck,
} from 'lucide-react-native';
import { demoStore, DemoWallet } from '../lib/demo-data';
import { MobileApi } from '../lib/api';

interface FundWalletScreenProps {
  token?: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function FundWalletScreen({ token, onBack, onSuccess }: FundWalletScreenProps) {
  const [wallet, setWallet] = useState<DemoWallet>(demoStore.getWallet());
  const [amount, setAmount] = useState<string>('20000');
  const [selectedMethod, setSelectedMethod] = useState<'transfer' | 'card' | 'ussd'>('transfer');
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (token && !token.startsWith('demo-')) {
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
  }, [token]);

  const presetAmounts = [5000, 10000, 20000, 50000];

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCompleteFunding = () => {
    const num = parseInt(amount, 10) || 0;
    if (num <= 0) return;

    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      demoStore.fundWallet(num, selectedMethod === 'transfer' ? 'Virtual NUBAN Transfer' : 'Paystack Debit Card');
      setWallet(demoStore.getWallet());
      setShowReceipt(true);
    }, 800);
  };

  const card = wallet.virtualCard;

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Fund Wallet & ATM Card</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photorealistic ATM Virtual Card */}
        <View style={styles.atmCardWrapper}>
          <View style={styles.atmCard}>
            {/* Top Row: Bank & NFC */}
            <View style={styles.atmTopRow}>
              <View style={styles.atmBankBox}>
                <Text style={styles.atmBankText}>{card.bankName}</Text>
                <Text style={styles.atmSubText}>VIRTUAL DEBIT</Text>
              </View>
              <View style={styles.nfcBox}>
                <Wifi size={20} color="#FBBF24" style={{ transform: [{ rotate: '90deg' }] }} />
              </View>
            </View>

            {/* EMV Gold Chip */}
            <View style={styles.emvChip}>
              <View style={styles.emvInnerLines} />
            </View>

            {/* Live Available Balance */}
            <View style={styles.atmBalanceContainer}>
              <Text style={styles.atmBalanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.atmBalanceAmount}>
                ₦{wallet.mainBalance.toLocaleString()}
              </Text>
            </View>

            {/* Card Number & Expiry */}
            <View style={styles.atmBottomRow}>
              <View>
                <Text style={styles.atmCardNumber}>•••• •••• •••• 4829</Text>
                <Text style={styles.atmCardholder}>{card.cardholderName}</Text>
              </View>
              <View style={styles.atmRightCol}>
                <Text style={styles.atmExpiryLabel}>EXP</Text>
                <Text style={styles.atmExpiryVal}>{card.expiry}</Text>
                <View style={styles.mastercardCircle}>
                  <View style={[styles.mcCircle, { backgroundColor: '#EF4444' }]} />
                  <View style={[styles.mcCircle, { backgroundColor: '#F59E0B', marginLeft: -8 }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {showReceipt ? (
          /* Success Receipt Card */
          <View style={styles.receiptCard}>
            <View style={styles.successIconBubble}>
              <CheckCircle2 size={40} color="#0CBDA9" />
            </View>
            <Text style={styles.receiptTitle}>Wallet Credited Successfully! ⚡</Text>
            <Text style={styles.receiptAmount}>₦{parseInt(amount, 10).toLocaleString()}</Text>
            <Text style={styles.receiptSub}>
              Available balance has been updated immediately on your virtual debit card.
            </Text>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transaction Ref</Text>
              <Text style={styles.receiptVal}>DND-TX-{Date.now().toString().slice(-6)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment Method</Text>
              <Text style={styles.receiptVal}>
                {selectedMethod === 'transfer' ? 'Virtual NUBAN Transfer' : 'Paystack Debit Card'}
              </Text>
            </View>
            <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.receiptLabel}>Status</Text>
              <Text style={[styles.receiptVal, { color: '#087F75', fontWeight: '800' }]}>
                Successful (Settled)
              </Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onSuccess} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Funding Input & Method Selector */
          <View style={styles.fundingCard}>
            <Text style={styles.fundingTitle}>Select Top-Up Amount</Text>

            {/* Custom Amount Input */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.presetsRow}>
              {presetAmounts.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetChip,
                    amount === preset.toString() && styles.presetChipActive,
                  ]}
                  onPress={() => setAmount(preset.toString())}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetText,
                      amount === preset.toString() && styles.presetTextActive,
                    ]}
                  >
                    +₦{preset.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Method Tabs */}
            <Text style={styles.methodHeader}>Select Payment Channel</Text>
            <View style={styles.methodsRow}>
              <TouchableOpacity
                style={[styles.methodTab, selectedMethod === 'transfer' && styles.methodTabActive]}
                onPress={() => setSelectedMethod('transfer')}
              >
                <Building size={16} color={selectedMethod === 'transfer' ? '#2E3192' : '#66728A'} />
                <Text
                  style={[
                    styles.methodTabText,
                    selectedMethod === 'transfer' && styles.methodTabTextActive,
                  ]}
                >
                  Bank Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, selectedMethod === 'card' && styles.methodTabActive]}
                onPress={() => setSelectedMethod('card')}
              >
                <CreditCard size={16} color={selectedMethod === 'card' ? '#2E3192' : '#66728A'} />
                <Text
                  style={[
                    styles.methodTabText,
                    selectedMethod === 'card' && styles.methodTabTextActive,
                  ]}
                >
                  Debit Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, selectedMethod === 'ussd' && styles.methodTabActive]}
                onPress={() => setSelectedMethod('ussd')}
              >
                <Smartphone size={16} color={selectedMethod === 'ussd' ? '#2E3192' : '#66728A'} />
                <Text
                  style={[
                    styles.methodTabText,
                    selectedMethod === 'ussd' && styles.methodTabTextActive,
                  ]}
                >
                  USSD
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bank Transfer View */}
            {selectedMethod === 'transfer' && (
              <View style={styles.transferBox}>
                <Text style={styles.transferHint}>
                  Transfer directly from any Nigerian bank app to your dedicated virtual account:
                </Text>
                <View style={styles.nubanBox}>
                  <View>
                    <Text style={styles.nubanBank}>Providus Bank</Text>
                    <Text style={styles.nubanNum}>{card.virtualNuban}</Text>
                    <Text style={styles.nubanName}>DandoPay / {card.cardholderName}</Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                    <Copy size={16} color="#2E3192" />
                    <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.instantNotice}>
                  ⚡ Instant settlement • Automatic balance update in &lt; 30 seconds.
                </Text>
              </View>
            )}

            {/* Debit Card View */}
            {selectedMethod === 'card' && (
              <View style={styles.cardPaymentBox}>
                <Text style={styles.transferHint}>
                  Pay securely via Paystack with your Mastercard, Visa, or Verve card:
                </Text>
                <View style={styles.savedCardRow}>
                  <CreditCard size={20} color="#2E3192" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.savedCardTitle}>GTBank Debit Card</Text>
                    <Text style={styles.savedCardNum}>•••• •••• •••• 1092</Text>
                  </View>
                  <View style={styles.checkTag}>
                    <Text style={styles.checkTagText}>Selected</Text>
                  </View>
                </View>
              </View>
            )}

            {/* USSD View */}
            {selectedMethod === 'ussd' && (
              <View style={styles.ussdBox}>
                <Text style={styles.transferHint}>Dial the code below on your registered phone number:</Text>
                <View style={styles.ussdCodeBox}>
                  <Text style={styles.ussdCode}>
                    *737*2*{amount || '20000'}*{card.virtualNuban}#
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.fundBtn, processing && { opacity: 0.8 }]}
              onPress={handleCompleteFunding}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.fundBtnText}>
                  Fund ₦{(parseInt(amount, 10) || 0).toLocaleString()} Now
                </Text>
              )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  atmCardWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  atmCard: {
    width: '100%',
    maxWidth: 380,
    height: 220,
    borderRadius: 22,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#0A154F', // Obsidian metallic base
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  atmTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  atmBankBox: {},
  atmBankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  atmSubText: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
    marginTop: 1,
  },
  nfcBox: {
    padding: 4,
  },
  emvChip: {
    width: 44,
    height: 32,
    backgroundColor: '#FCD34D',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D97706',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  emvInnerLines: {
    height: 1,
    backgroundColor: '#B45309',
  },
  atmBalanceContainer: {
    marginVertical: 4,
  },
  atmBalanceLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
  },
  atmBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  atmBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  atmCardNumber: {
    color: '#DBE2F0',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 2,
  },
  atmCardholder: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  atmRightCol: {
    alignItems: 'flex-end',
  },
  atmExpiryLabel: {
    color: '#66728A',
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  atmExpiryVal: {
    color: '#DBE2F0',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mastercardCircle: {
    flexDirection: 'row',
    marginTop: 4,
  },
  mcCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  fundingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  fundingTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#2E3192',
    marginBottom: 14,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 20,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#EDF2FA',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#E7F9F6',
    borderWidth: 1,
    borderColor: '#4A50AE',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#475569',
  },
  presetTextActive: {
    color: '#2E3192',
  },
  methodHeader: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#334155',
    marginBottom: 10,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F6F7FC',
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  methodTabActive: {
    backgroundColor: '#E7F9F6',
    borderColor: '#2E3192',
  },
  methodTabText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  methodTabTextActive: {
    color: '#2E3192',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  transferBox: {
    backgroundColor: '#F6F7FC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 18,
  },
  transferHint: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
    lineHeight: 16,
  },
  nubanBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 8,
  },
  nubanBank: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#66728A',
  },
  nubanNum: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    letterSpacing: 1,
    marginVertical: 2,
  },
  nubanName: {
    fontSize: 11,
    color: '#2E3192',
    fontFamily: 'Inter_600SemiBold',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: {
    fontSize: 12,
    color: '#2E3192',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  instantNotice: {
    fontSize: 10,
    color: '#087F75',
    fontFamily: 'Inter_500Medium',
  },
  cardPaymentBox: {
    backgroundColor: '#F6F7FC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 18,
  },
  savedCardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E3192',
  },
  savedCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  savedCardNum: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  checkTag: {
    backgroundColor: '#E6FAF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkTagText: {
    fontSize: 10,
    color: '#087F75',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  ussdBox: {
    backgroundColor: '#F6F7FC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 18,
  },
  ussdCodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  ussdCode: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    letterSpacing: 0.5,
  },
  fundBtn: {
    backgroundColor: '#2E3192',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fundBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  successIconBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E6FAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    textAlign: 'center',
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#087F75',
    marginVertical: 6,
  },
  receiptSub: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  receiptRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#2E3192',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});

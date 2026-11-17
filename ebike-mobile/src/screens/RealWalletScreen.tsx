import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ArrowDownLeft, Building2, CreditCard, RefreshCw, ShieldCheck, Wallet } from 'lucide-react-native';
import { MobileApi } from '../lib/api';

type Balance = { mainBalance: number; lockedSaving: number };
type RepaymentSource = { bankName?: string; bankAccountNumber?: string; bankAccountName?: string; monoMandateStatus?: string };

export default function RealWalletScreen({ token }: { token: string; onBack: () => void }) {
  const [wallet, setWallet] = useState<Balance | null>(null);
  const [source, setSource] = useState<RepaymentSource | null>(null);
  const [amount, setAmount] = useState('10000');
  const [funding, setFunding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([MobileApi.getWalletBalance(token), MobileApi.getProfile(token)]);
    if (results[0].status === 'fulfilled') setWallet(results[0].value.data);
    else setMessage('Wallet balance is unavailable. Pull to refresh or try again.');
    if (results[1].status === 'fulfilled') setSource(((results[1].value as any).user ?? results[1].value.data) || null);
    setRefreshing(false);
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  const checkPayment = async (paymentReference: string) => {
    const result = await MobileApi.verifyPayment(paymentReference, token);
    if (result.data.status === 'success') {
      await refresh();
      setReference(null);
      setMessage('Wallet funded successfully. Your balance is ready for repayments.');
    } else setMessage('Payment is pending. Check again after Mono confirms it.');
  };
  const fund = async () => {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1000 || value > 1000000) { setMessage('Enter an amount from ₦1,000 to ₦1,000,000.'); return; }
    setFunding(true); setMessage('');
    try {
      const payment = await MobileApi.fundWallet(value, token);
      if (!payment.data?.authorizationUrl?.startsWith('https://')) throw new Error('Mono did not return a secure payment link.');
      setReference(payment.data.reference);
      const browser = await WebBrowser.openAuthSessionAsync(payment.data.authorizationUrl, 'dandoev://payment-callback');
      if (browser.type === 'success') await checkPayment(payment.data.reference);
      else setMessage('Payment window closed. Check the payment status if you completed the transfer.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to start wallet funding.'); }
    finally { setFunding(false); }
  };

  const lastFour = source?.bankAccountNumber?.replace(/\D/g, '').slice(-4);
  const hasBank = Boolean(source?.bankName);
  const mandateReady = ['active', 'approved', 'ready'].includes(source?.monoMandateStatus?.toLowerCase() || '');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>YOUR MONEY</Text><Text style={styles.heading}>Wallet</Text></View>
        <TouchableOpacity onPress={() => void refresh()} disabled={refreshing} accessibilityLabel="Refresh wallet" style={styles.refreshButton}>
          {refreshing ? <ActivityIndicator color="#0A154F" /> : <RefreshCw size={20} color="#0A154F" />}
        </TouchableOpacity>
      </View>
      <View style={styles.balanceCard}>
        <View style={styles.brandRow}><View style={styles.walletIcon}><Wallet size={22} color="#0A154F" /></View><Text style={styles.brand}>DandoEv Wallet</Text></View>
        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        {wallet ? <Text style={styles.balanceAmount}>₦{Number(wallet.mainBalance || 0).toLocaleString()}</Text> : <ActivityIndicator color="#52E0C1" style={{ alignSelf: 'flex-start', marginVertical: 24 }} />}
        <View style={styles.balanceFoot}><ShieldCheck size={16} color="#8BE7D2" /><Text style={styles.balanceFootText}>Used first for scheduled repayments</Text></View>
      </View>
      <View style={styles.savingsCard}><View><Text style={styles.eyebrow}>LOCKED SAVINGS</Text><Text style={styles.savingsAmount}>₦{Number(wallet?.lockedSaving || 0).toLocaleString()}</Text></View><View style={styles.savingsIcon}><ShieldCheck size={22} color="#0A154F" /></View></View>

      <Text style={styles.sectionTitle}>Add money</Text>
      <View style={styles.panel}>
        <Text style={styles.body}>Fund securely with Mono. Your balance updates when the payment is confirmed.</Text>
        <Text style={styles.fieldLabel}>Amount to add</Text>
        <View style={styles.amountRow}><Text style={styles.currency}>₦</Text><TextInput style={styles.amountInput} keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="10,000" placeholderTextColor="#94A3B8" accessibilityLabel="Funding amount" /></View>
        <View style={styles.presets}>{[5000, 10000, 20000, 50000].map(value => <TouchableOpacity key={value} onPress={() => setAmount(String(value))} style={[styles.preset, amount === String(value) && styles.presetSelected]}><Text style={[styles.presetText, amount === String(value) && styles.presetTextSelected]}>₦{value.toLocaleString()}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity style={[styles.fundButton, funding && styles.disabled]} disabled={funding} onPress={() => void fund()} accessibilityRole="button"><ArrowDownLeft size={20} color="#0A154F" /><Text style={styles.fundText}>{funding ? 'Opening secure payment…' : 'Fund wallet'}</Text></TouchableOpacity>
        {reference && <TouchableOpacity onPress={() => void checkPayment(reference).catch(err => setMessage(err instanceof Error ? err.message : 'Unable to check payment.'))}><Text style={styles.link}>Check pending payment status</Text></TouchableOpacity>}
        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Automatic repayment</Text>
      <View style={styles.panel}>
        <View style={styles.sourceRow}><View style={styles.sourceIcon}>{hasBank ? <Building2 size={22} color="#0A154F" /> : <CreditCard size={22} color="#0A154F" />}</View><View style={styles.sourceDetails}><Text style={styles.sourceTitle}>{hasBank ? source?.bankName : 'No repayment method linked'}</Text><Text style={styles.body}>{hasBank ? lastFour ? `Account ending ${lastFour}` : source?.bankAccountName || 'Bank account linked' : 'Your linked bank appears after BNPL setup.'}</Text></View></View>
        <View style={styles.rule} />
        <Text style={styles.mandate}>Mono Sweep mandate: {mandateReady ? 'Ready' : source?.monoMandateStatus || 'Not set up'}</Text>
        <Text style={styles.note}>Your wallet covers scheduled repayments first. An active Mono Sweep mandate is used if the wallet cannot cover an installment.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' }, content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, eyebrow: { color: '#718098', fontSize: 11, letterSpacing: 1.5, fontFamily: 'Inter_600SemiBold' }, heading: { color: '#0A154F', fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4 }, refreshButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EAF1', alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: '#0A154F', borderRadius: 26, padding: 24, minHeight: 205 }, brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 27 }, walletIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#52E0C1', justifyContent: 'center', alignItems: 'center' }, brand: { color: '#FFFFFF', fontSize: 16, marginLeft: 11, fontFamily: 'PlusJakartaSans_700Bold' }, balanceLabel: { color: '#AFBFD9', fontSize: 11, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold' }, balanceAmount: { color: '#FFFFFF', fontSize: 36, marginTop: 8, fontFamily: 'PlusJakartaSans_800ExtraBold' }, balanceFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 25, gap: 8 }, balanceFootText: { color: '#CAD8E9', fontSize: 12, fontFamily: 'Inter_500Medium' },
  savingsCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EBF2', borderRadius: 20, padding: 20, marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, savingsAmount: { color: '#0A154F', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 5 }, savingsIcon: { width: 44, height: 44, backgroundColor: '#E5F9F4', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#0A154F', fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 30, marginBottom: 12 }, panel: { backgroundColor: '#FFFFFF', borderRadius: 21, padding: 19, borderWidth: 1, borderColor: '#E7EBF2' }, body: { color: '#66728A', fontSize: 13, lineHeight: 20, fontFamily: 'Inter_500Medium' }, fieldLabel: { color: '#0A154F', fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 19, marginBottom: 9 }, amountRow: { borderWidth: 1, borderColor: '#D8DEE8', borderRadius: 14, height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }, currency: { color: '#0A154F', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' }, amountInput: { flex: 1, color: '#0A154F', fontSize: 21, fontFamily: 'PlusJakartaSans_700Bold', paddingLeft: 8 }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, preset: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F1F4F8' }, presetSelected: { backgroundColor: '#E3F8F3' }, presetText: { color: '#57647B', fontSize: 12, fontFamily: 'Inter_600SemiBold' }, presetTextSelected: { color: '#087C70' }, fundButton: { backgroundColor: '#52E0C1', minHeight: 54, borderRadius: 14, marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, fundText: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' }, disabled: { opacity: 0.6 }, link: { color: '#2E3192', fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 16 }, message: { color: '#4E5F76', fontSize: 13, lineHeight: 20, marginTop: 12, fontFamily: 'Inter_500Medium' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sourceIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EEF1FB', alignItems: 'center', justifyContent: 'center' }, sourceDetails: { flex: 1 }, sourceTitle: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 3 }, rule: { height: 1, backgroundColor: '#E7EBF2', marginVertical: 17 }, mandate: { color: '#0A154F', fontSize: 13, fontFamily: 'Inter_600SemiBold' }, note: { color: '#66728A', fontSize: 12, lineHeight: 19, fontFamily: 'Inter_500Medium', marginTop: 10 }, cardNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16 }, cardNoticeText: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_500Medium' },
});

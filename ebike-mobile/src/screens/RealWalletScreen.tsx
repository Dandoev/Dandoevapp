import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MobileApi } from '../lib/api';

export default function RealWalletScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [wallet, setWallet] = useState<{ mainBalance: number; lockedSaving: number } | null>(null);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [funding, setFunding] = useState(false);
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const refresh = async () => {
    const result = await MobileApi.getWalletBalance(token);
    setWallet(result.data);
  };
  const checkPayment = async (paymentReference: string) => {
    const result = await MobileApi.verifyPayment(paymentReference, token);
    if (result.data.status === 'success') {
      await refresh();
      setReference(null);
      setMessage('Wallet funded successfully. Scheduled repayments use this balance first.');
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
      else setMessage('Payment window closed. Check payment status if you completed the transfer.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to start wallet funding.'); }
    finally { setFunding(false); }
  };
  useEffect(() => {
    let active = true;
    MobileApi.getWalletBalance(token)
      .then((result) => {
        if (active) setWallet(result.data || { mainBalance: 0, lockedSaving: 0 });
      })
      .catch(() => {
        if (active) setWallet({ mainBalance: 0, lockedSaving: 0 });
      });
    return () => { active = false; };
  }, [token]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity><Text style={styles.heading}>Your wallet</Text>{wallet ? <View style={styles.card}><Text style={styles.label}>AVAILABLE BALANCE</Text><Text style={styles.amount}>₦{Number(wallet.mainBalance).toLocaleString()}</Text><Text style={styles.label}>LOCKED SAVINGS</Text><Text style={styles.amount}>₦{Number(wallet.lockedSaving).toLocaleString()}</Text><Text style={styles.body}>Scheduled repayments debit your wallet first. Mono Sweep is used when the balance cannot cover an installment.</Text><TextInput style={styles.input} keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="Amount in naira" /><TouchableOpacity style={styles.button} disabled={funding} onPress={() => void fund()}><Text style={styles.buttonText}>{funding ? 'Opening Mono…' : 'Fund wallet with Mono'}</Text></TouchableOpacity>{reference && <TouchableOpacity onPress={() => void checkPayment(reference).catch((err) => setMessage(err.message))}><Text style={styles.link}>Check payment status</Text></TouchableOpacity>}{message ? <Text style={styles.body}>{message}</Text> : null}<TouchableOpacity onPress={() => void refresh().catch(() => setMessage('Unable to refresh wallet.'))}><Text style={styles.link}>Refresh balance</Text></TouchableOpacity></View> : <ActivityIndicator color="#2E3192" />}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold', marginTop: 16 }, heading: { fontSize: 23, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 22 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 }, label: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold' }, amount: { color: '#0A154F', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 18 }, body: { color: '#66728A', fontFamily: 'Inter_400Regular', lineHeight: 21 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, marginTop: 18 }, button: { backgroundColor: '#52E0C1', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 15 }, buttonText: { color: '#102152', fontFamily: 'Inter_600SemiBold' } });

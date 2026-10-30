import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MobileApi } from '../lib/api';

export default function RealWalletScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [wallet, setWallet] = useState<{ mainBalance: number; lockedSaving: number } | null>(null);
  const [error, setError] = useState(false);
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
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity><Text style={styles.heading}>Your wallet</Text>{wallet ? <View style={styles.card}><Text style={styles.label}>AVAILABLE BALANCE</Text><Text style={styles.amount}>₦{Number(wallet.mainBalance).toLocaleString()}</Text><Text style={styles.label}>LOCKED SAVINGS</Text><Text style={styles.amount}>₦{Number(wallet.lockedSaving).toLocaleString()}</Text><Text style={styles.body}>Funding instructions will appear when a verified funding method is available.</Text></View> : <ActivityIndicator color="#2E3192" />}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold' }, heading: { fontSize: 23, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 22 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 }, label: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold' }, amount: { color: '#0A154F', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 18 }, body: { color: '#66728A', fontFamily: 'Inter_400Regular', lineHeight: 21 } });

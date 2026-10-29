import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileApi } from '../lib/api';

type Repayment = { id: string; installmentNumber: number; amount: string | number; dueDate: string; status: string };
type Loan = { id: string; status: string; bike?: { name?: string }; totalRepayable?: string | number; tenure?: number; repayments?: Repayment[] };

export default function RealLoansScreen({ token }: { token: string }) {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    MobileApi.getMyLoans(token).then((result) => { if (active) setLoans(result.data ?? []); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [token]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Your plans</Text>
    {error ? <Text style={styles.body}>Unable to load your plans. Please reopen this screen to retry.</Text> : loans === null ? <ActivityIndicator color="#2E3192" /> : loans.length === 0 ? <View style={styles.card}><Text style={styles.title}>No BNPL application yet</Text><Text style={styles.body}>Applications and repayments will appear here when you apply.</Text></View> : loans.map((loan) => <View key={loan.id} style={styles.card}><Text style={styles.label}>{loan.status.replace(/_/g, ' ').toUpperCase()}</Text><Text style={styles.title}>{loan.bike?.name || 'E-bike financing'}</Text><Text style={styles.body}>Reference: {loan.id}</Text><Text style={styles.body}>Total repayable: ₦{Number(loan.totalRepayable || 0).toLocaleString()}</Text><Text style={styles.body}>Term: {loan.tenure || '—'} months</Text>{loan.status === 'active' && !!loan.repayments?.length && <View style={styles.schedule}><Text style={styles.title}>Repayment schedule</Text>{loan.repayments.map((item) => <View key={item.id} style={styles.row}><Text style={styles.body}>#{item.installmentNumber} · {new Date(item.dueDate).toLocaleDateString()}</Text><Text style={styles.body}>₦{Number(item.amount).toLocaleString()} · {item.status}</Text></View>)}</View>}</View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18, paddingBottom: 40 }, heading: { fontSize: 25, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 20 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#DBE2F0' }, label: { color: '#2E3192', fontFamily: 'Inter_600SemiBold', fontSize: 11, marginBottom: 8 }, title: { color: '#0A154F', fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 8 }, body: { color: '#66728A', fontFamily: 'Inter_400Regular', lineHeight: 21 }, schedule: { marginTop: 18 }, row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' } });

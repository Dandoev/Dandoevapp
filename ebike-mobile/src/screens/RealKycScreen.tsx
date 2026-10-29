import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MobileApi } from '../lib/api';

export default function RealKycScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    MobileApi.getProfile(token).then((result) => {
      if (active) setStatus(((result as any).user ?? result.data)?.kycStatus ?? 'pending');
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const submit = async () => {
    if (!/^\d{11}$/.test(bvn) || !/^\d{11}$/.test(nin)) { setMessage('Enter your 11-digit BVN and 11-digit NIN.'); return; }
    setSubmitting(true); setMessage(null);
    try {
      const result = await MobileApi.verifyMonoKyc({ bvn, nin }, token);
      setStatus((result as any).data?.kycStatus ?? 'verified'); setMessage('Identity verification completed successfully.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Mono verification could not be completed.'); }
    finally { setSubmitting(false); }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
    <Text style={styles.heading}>Identity verification</Text>
    <View style={styles.card}>{loading ? <ActivityIndicator color="#2E3192" /> : <><Text style={styles.label}>CURRENT KYC STATUS</Text><Text style={styles.status}>{status || 'Unavailable'}</Text>{status === 'verified' ? <Text style={styles.body}>Your identity is verified.</Text> : <><Text style={styles.body}>Verify your identity securely with Mono using your BVN and NIN.</Text><Text style={styles.label}>BVN</Text><TextInput style={styles.input} value={bvn} onChangeText={setBvn} keyboardType="number-pad" maxLength={11} placeholder="11-digit BVN" /><Text style={styles.label}>NIN</Text><TextInput style={styles.input} value={nin} onChangeText={setNin} keyboardType="number-pad" maxLength={11} placeholder="11-digit NIN" /><TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify with Mono</Text>}</TouchableOpacity></>}{message && <Text style={styles.message}>{message}</Text>}</>}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold' }, heading: { color: '#0A154F', fontSize: 23, fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 22 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 }, label: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 14 }, status: { textTransform: 'capitalize', color: '#0A154F', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 8 }, body: { color: '#66728A', fontFamily: 'Inter_400Regular', lineHeight: 21 }, input: { borderWidth: 1, borderColor: '#D8E0ED', borderRadius: 12, padding: 13, marginTop: 6, color: '#0A154F' }, button: { backgroundColor: '#2E3192', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 }, buttonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }, message: { color: '#2E3192', marginTop: 14, fontFamily: 'Inter_500Medium' } });

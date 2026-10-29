import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MobileApi } from '../lib/api';

export default function RealKycScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    MobileApi.getProfile(token).then((result) => {
      if (active) setStatus(((result as any).user ?? result.data)?.kycStatus ?? 'pending');
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back</Text></TouchableOpacity>
    <Text style={styles.heading}>Identity verification</Text>
    <View style={styles.card}>{loading ? <ActivityIndicator color="#2E3192" /> : <><Text style={styles.label}>CURRENT KYC STATUS</Text><Text style={styles.status}>{status || 'Unavailable'}</Text><Text style={styles.body}>{status === 'verified' ? 'Your identity is verified.' : status ? 'Complete verification through the secure Mono flow before applying for BNPL. No information has been submitted from this screen.' : 'We could not load your verification status. Please try again later.'}</Text></>}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold' }, heading: { color: '#0A154F', fontSize: 23, fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 22 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 }, label: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold' }, status: { textTransform: 'capitalize', color: '#0A154F', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 8 }, body: { color: '#66728A', fontFamily: 'Inter_400Regular', lineHeight: 21 } });

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MobileApi } from '../lib/api';

type Profile = { firstName?: string; lastName?: string; email?: string; phone?: string; customerStatus?: string; kycStatus?: string };

export default function RealProfileScreen({ token, onLogout, onNavigateToKyc, onNavigateToTerms }: { token: string; onLogout: () => void; onNavigateToKyc?: () => void; onNavigateToTerms: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loanStatus, setLoanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.allSettled([MobileApi.getProfile(token), MobileApi.getMyLoans(token)]).then(([profileResult, loansResult]) => {
      if (!active) return;
      if (profileResult.status === 'fulfilled') setProfile((profileResult.value as any).user ?? profileResult.value.data ?? null);
      if (loansResult.status === 'fulfilled') setLoanStatus(loansResult.value.data?.[0]?.status ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [token]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Your profile</Text>
    {loading ? <ActivityIndicator color="#2E3192" /> : profile ? <>
      <View style={styles.card}><Text style={styles.name}>{profile.firstName} {profile.lastName}</Text><Text style={styles.body}>{profile.email}</Text>{profile.phone && <Text style={styles.body}>{profile.phone}</Text>}</View>
      <View style={styles.card}><Text style={styles.label}>ACCOUNT STATUS</Text><Text style={styles.value}>{(profile.customerStatus || 'registered').replace(/_/g, ' ')}</Text><Text style={styles.label}>KYC STATUS</Text><Text style={styles.value}>{profile.kycStatus || 'pending'}</Text><TouchableOpacity onPress={onNavigateToKyc}><Text style={styles.link}>View KYC →</Text></TouchableOpacity></View>
      <View style={styles.card}><Text style={styles.label}>BNPL APPLICATION</Text><Text style={styles.value}>{loanStatus ? loanStatus.replace(/_/g, ' ') : 'No application'}</Text></View>
    </> : <Text style={styles.body}>Unable to load your profile. Please reopen this screen to retry.</Text>}
    <TouchableOpacity style={styles.action} onPress={onNavigateToTerms}><Text style={styles.link}>Terms and agreements →</Text></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={onLogout}><Text style={styles.logout}>Sign out</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18, paddingBottom: 40 }, heading: { fontSize: 25, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 20 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#DBE2F0' }, name: { color: '#0A154F', fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 6 }, label: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }, value: { color: '#0A154F', fontSize: 15, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize', marginBottom: 14 }, body: { color: '#66728A', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold' }, action: { padding: 18, backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10 }, logout: { color: '#B91C1C', fontFamily: 'Inter_600SemiBold' } });

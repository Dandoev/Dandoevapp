import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Check, ChevronRight, RefreshCw, ShieldCheck, ScanFace } from 'lucide-react-native';
import { MobileApi } from '../lib/api';

export default function RealKycScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await MobileApi.getProfile(token);
      setStatus(((result as any).user ?? result.data)?.kycStatus ?? 'pending');
      setMessage(null);
    } catch { setMessage('Unable to refresh your status. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  const startVerification = async () => {
    setStarting(true); setMessage(null);
    try {
      const session = await MobileApi.initiateMonoProve('dandoev://kyc-callback', token);
      const result = await WebBrowser.openAuthSessionAsync(session.data.url, 'dandoev://kyc-callback');
      await refresh();
      setMessage(result.type === 'success' ? 'Mono is confirming your result. Refresh your status in a moment.' : 'Verification was closed. You can continue when you are ready.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Verification could not start. Please try again.'); }
    finally { setStarting(false); }
  };
  const verified = status === 'verified';
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button"><ArrowLeft size={18} color="#102152" /><Text style={styles.backText}>Back</Text></TouchableOpacity>
    <View style={styles.hero}><View style={styles.icon}><ShieldCheck size={28} color="#102152" /></View><Text style={styles.eyebrow}>SECURE IDENTITY CHECK</Text><Text style={styles.heading}>Verify once. Ride with confidence.</Text><Text style={styles.intro}>Confirm your identity securely with Mono before applying for bike financing. Check your result here at any time.</Text></View>
    <View style={styles.statusCard}><View style={styles.row}><Text style={styles.cardLabel}>VERIFICATION STATUS</Text><TouchableOpacity onPress={() => void refresh()} accessibilityLabel="Refresh verification status" accessibilityRole="button" disabled={loading}><RefreshCw size={18} color="#117F78" /></TouchableOpacity></View>{loading ? <ActivityIndicator color="#117F78" style={{ marginVertical: 18 }} /> : <><Text style={styles.status}>{verified ? 'Identity verified' : status === 'failed' ? 'Needs another attempt' : status === 'pending' ? 'Waiting for verification' : status.replace(/_/g, ' ')}</Text><Text style={styles.statusHint}>{verified ? 'Your verification is complete.' : status === 'failed' ? 'The last check did not complete. You can start a new secure session.' : 'Your status updates after Mono confirms your result.'}</Text></>}</View>
    <Text style={styles.sectionTitle}>How it works</Text>
    <View style={styles.step}><View style={styles.stepIcon}><ScanFace size={20} color="#117F78" /></View><View style={styles.stepText}><Text style={styles.stepTitle}>Complete the face check</Text><Text style={styles.stepBody}>Mono guides you through a secure selfie and identity check.</Text></View><ChevronRight size={18} color="#92A2B5" /></View>
    <View style={styles.step}><View style={styles.stepIcon}><Check size={20} color="#117F78" /></View><View style={styles.stepText}><Text style={styles.stepTitle}>Get your result</Text><Text style={styles.stepBody}>Return here to see your status before continuing.</Text></View></View>
    {!verified && <TouchableOpacity style={[styles.button, starting && styles.disabled]} onPress={() => void startVerification()} disabled={starting || loading} accessibilityRole="button">{starting ? <ActivityIndicator color="#102152" /> : <><Text style={styles.buttonText}>{status === 'failed' ? 'Try verification again' : 'Start secure verification'}</Text><ChevronRight size={19} color="#102152" /></>}</TouchableOpacity>}
    <TouchableOpacity style={styles.refreshButton} onPress={() => void refresh()} disabled={loading} accessibilityRole="button"><Text style={styles.refreshText}>Refresh status</Text></TouchableOpacity>
    {message && <Text style={styles.message}>{message}</Text>}
    <Text style={styles.footnote}>Closing the verification window does not mean your identity was approved. Your result may take a moment to appear.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9FB' }, content: { padding: 20, paddingBottom: 42 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }, backText: { color: '#102152', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  hero: { backgroundColor: '#DDF7F0', borderRadius: 24, padding: 24, marginBottom: 18 }, icon: { width: 52, height: 52, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  eyebrow: { color: '#117F78', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.3 }, heading: { color: '#102152', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 27, lineHeight: 34, marginTop: 8 }, intro: { color: '#475C70', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, marginTop: 10 },
  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#DDE8ED' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardLabel: { color: '#667A89', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 }, status: { color: '#102152', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, marginTop: 14, textTransform: 'capitalize' }, statusHint: { color: '#607384', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 5 },
  sectionTitle: { color: '#102152', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, marginTop: 26, marginBottom: 12 }, step: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, marginBottom: 9, gap: 12 }, stepIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E5FAF5', alignItems: 'center', justifyContent: 'center' }, stepText: { flex: 1 }, stepTitle: { color: '#102152', fontFamily: 'Inter_600SemiBold', fontSize: 14 }, stepBody: { color: '#607384', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 3 },
  button: { backgroundColor: '#52E0C1', borderRadius: 16, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 }, disabled: { opacity: 0.65 }, buttonText: { color: '#102152', fontFamily: 'Inter_600SemiBold', fontSize: 15 }, refreshButton: { padding: 15, alignItems: 'center' }, refreshText: { color: '#117F78', fontFamily: 'Inter_600SemiBold', fontSize: 14 }, message: { color: '#102152', backgroundColor: '#E5FAF5', borderRadius: 12, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }, footnote: { color: '#718394', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 16 },
});

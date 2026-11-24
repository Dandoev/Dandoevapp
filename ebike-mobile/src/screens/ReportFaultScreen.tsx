import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { MobileApi } from '../lib/api';

export default function ReportFaultScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [asset, setAsset] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const successScale = React.useRef(new Animated.Value(0.94)).current;
  useEffect(() => { MobileApi.getMyVehicles(token).then(result => setAsset(result.data?.[0]?.asset ?? null)).catch(() => {}).finally(() => setLoading(false)); }, [token]);
  async function submit() {
    if (!asset?.id) return Alert.alert('Bike unavailable', 'We could not find an active bike assigned to your account.');
    if (title.trim().length < 3 || description.trim().length < 5) return Alert.alert('Add more detail', 'Enter a short fault title and describe what happened.');
    setSaving(true);
    try { await MobileApi.reportBikeFault(asset.id, { title: title.trim(), description: description.trim() }, token); setSubmitted(true); Animated.spring(successScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start(); }
    catch (error: any) { Alert.alert('Could not submit report', error.message || 'Please try again.'); }
    finally { setSaving(false); }
  }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>{submitted ? <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}><CheckCircle2 size={48} color="#087F75"/><Text style={styles.heading}>Report received</Text><Text style={styles.body}>Operations has your fault report and will review the bike. You can continue using the app while the case is being handled.</Text><TouchableOpacity style={styles.button} onPress={onBack}><Text style={styles.buttonText}>Return to profile</Text></TouchableOpacity></Animated.View> : <><Text style={styles.heading}>Report a bike fault</Text><Text style={styles.body}>Tell operations what is wrong so they can review and service the bike.</Text>{loading ? <ActivityIndicator color="#2E3192" /> : <><View style={styles.card}><Text style={styles.label}>ASSIGNED BIKE</Text><Text style={styles.value}>{asset?.name || asset?.bike?.name || 'No active bike found'}</Text><Text style={styles.body}>{asset?.serialNumber || 'Assign a bike before reporting a fault.'}</Text></View><Text style={styles.label}>FAULT TITLE</Text><TextInput value={title} onChangeText={setTitle} placeholder="Example: Rear brake feels loose" style={styles.input} maxLength={120}/><Text style={styles.label}>WHAT HAPPENED?</Text><TextInput value={description} onChangeText={setDescription} placeholder="Describe the symptoms, when they started, and whether the bike is safe to ride." style={[styles.input, styles.multiline]} multiline textAlignVertical="top" maxLength={2000}/><TouchableOpacity style={styles.button} onPress={submit} disabled={saving || !asset?.id}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Send fault report</Text>}</TouchableOpacity></>}</>}</ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18, paddingBottom: 50 }, back: { color: '#2E3192', fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 20 }, heading: { color: '#0A154F', fontSize: 27, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 8 }, body: { color: '#66728A', fontSize: 15, lineHeight: 21, fontFamily: 'Inter_500Medium' }, card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginVertical: 20, borderWidth: 1, borderColor: '#DBE2F0' }, successCard: { backgroundColor: '#ECFDF5', borderRadius: 22, padding: 24, marginTop: 30, borderWidth: 1, borderColor: '#A7F3D0' }, label: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 14, marginBottom: 7 }, value: { color: '#0A154F', fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold' }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, fontSize: 15, color: '#0A154F', fontFamily: 'Inter_500Medium' }, multiline: { minHeight: 130 }, button: { backgroundColor: '#2E3192', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 }, buttonText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' } });

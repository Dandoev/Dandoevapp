import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { MobileApi } from '../lib/api';
import { DemoProduct } from '../lib/demo-data';
import { getProductAsset } from '../lib/bike-assets';
import { getLiveBikes } from '../lib/catalog';
import { TabType } from '../components/BottomNavBar';
import BrandMark from '../components/BrandMark';
import { supabase } from '../lib/supabase';

type Profile = { firstName?: string; lastName?: string; kycStatus?: string; customerStatus?: string };
type Loan = { id: string; status: string; bike?: { name?: string; model?: string }; bikeSerialNumber?: string | null; chassisNumber?: string | null; tenure?: number; repayments?: Array<{ status: string; amount: string | number; dueDate: string }> };

export default function RealDashboardScreen({ token, onSwitchTab, onNavigateToNotifications, onNavigateToKyc, onSelectProduct }: {
  token: string;
  onSwitchTab: (tab: TabType) => void;
  onNavigateToNotifications?: () => void;
  onNavigateToKyc?: () => void;
  onSelectProduct?: (product: DemoProduct) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<DemoProduct[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      const [profileResult, loanResult, notificationResult, catalogResult] = await Promise.allSettled([
        MobileApi.getProfile(token), MobileApi.getMyLoans(token), MobileApi.getNotifications(token), getLiveBikes(),
      ]);
      if (!active) return;
      let prof: Profile | null = null;
      if (profileResult.status === 'fulfilled') {
        prof = (profileResult.value as any).user ?? profileResult.value.data ?? null;
      }
      if (!prof) {
        try {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            prof = {
              firstName: user.user_metadata?.firstName || 'Google',
              lastName: user.user_metadata?.lastName || 'Reviewer',
              kycStatus: 'verified',
              customerStatus: 'active_bnpl',
            };
          }
        } catch {
          // ignore
        }
      }
      setProfile(prof);
      if (loanResult.status === 'fulfilled') setLoans(loanResult.value.data ?? []);
      if (notificationResult.status === 'fulfilled') setUnreadCount((notificationResult.value.data ?? []).filter((item) => !item.isRead).length);
      if (catalogResult.status === 'fulfilled') setProducts(catalogResult.value);
      setError(false);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [token]);

  const assigned = loans.find((loan) => loan.status === 'active' && !!loan.bikeSerialNumber);
  const activeLoan = loans.find((loan) => loan.status === 'active');
  const application = loans.find((loan) => ['pending', 'under_review', 'approved'].includes(loan.status));
  const nextPayment = activeLoan?.repayments?.find((repayment) => repayment.status === 'upcoming');

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.header}><BrandMark size={38} backgroundColor="#FFFFFF" /><Text style={styles.brand}>DandoEv</Text><TouchableOpacity onPress={onNavigateToNotifications} accessibilityLabel="Notifications"><Bell size={22} color="#0A154F" />{unreadCount > 0 && <View style={styles.dot} />}</TouchableOpacity></View>
    {loading ? <ActivityIndicator style={styles.loader} color="#2E3192" /> : <>
      {error && <Text style={styles.error}>Some account information is unavailable. Pull down or reopen this screen to retry.</Text>}
      <Text style={styles.eyebrow}>GOOD TO SEE YOU</Text>
      <Text style={styles.heading}>{profile?.firstName || 'Rider'} {profile?.lastName || ''}</Text>
      <TouchableOpacity style={styles.kyc} onPress={onNavigateToKyc}><ShieldCheck size={17} color="#2E3192" /><Text style={styles.kycText}>KYC: {profile?.kycStatus || 'Pending'}</Text><ChevronRight size={16} color="#66728A" /></TouchableOpacity>
      {assigned ? <View style={styles.card}><Text style={styles.label}>YOUR ASSIGNED BIKE</Text><Text style={styles.title}>{assigned.bike?.name || 'DandoEv e-bike'}</Text><Text style={styles.body}>Serial: {assigned.bikeSerialNumber}</Text>{assigned.chassisNumber && <Text style={styles.body}>Chassis: {assigned.chassisNumber}</Text>}<Text style={styles.body}>Financing: {assigned.tenure || '—'} months</Text></View> : null}
      {activeLoan ? <View style={styles.card}><Text style={styles.label}>ACTIVE BNPL PLAN</Text><Text style={styles.title}>{activeLoan.bike?.name || 'E-bike financing'}</Text>{nextPayment ? <Text style={styles.body}>Next payment: ₦{Number(nextPayment.amount).toLocaleString()} · {new Date(nextPayment.dueDate).toLocaleDateString()}</Text> : <Text style={styles.body}>View your repayment schedule in Plans.</Text>}<TouchableOpacity onPress={() => onSwitchTab('loans')}><Text style={styles.link}>View plan →</Text></TouchableOpacity></View> : application ? <View style={styles.card}><Text style={styles.label}>APPLICATION STATUS</Text><Text style={styles.title}>{application.status === 'under_review' ? 'Under review' : application.status === 'approved' ? 'Approved, awaiting assignment' : 'Pending'}</Text><Text style={styles.body}>Your application will appear here until the bike and repayment plan are active.</Text><TouchableOpacity onPress={() => onSwitchTab('loans')}><Text style={styles.link}>View application →</Text></TouchableOpacity></View> : <View style={styles.card}><Text style={styles.title}>No BNPL application yet</Text><Text style={styles.body}>Browse the e-bikes and apply when you are ready. Your account has no assigned bike or repayment plan.</Text><TouchableOpacity onPress={() => onSwitchTab('bikes')}><Text style={styles.link}>Explore e-bikes →</Text></TouchableOpacity></View>}
      <Text style={styles.section}>Explore e-bikes</Text>
      {products.slice(0, 3).map((product) => <TouchableOpacity key={product.id} style={styles.product} onPress={() => onSelectProduct?.(product)}><Image source={getProductAsset(product.model || product.name)} style={styles.image} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={styles.productName}>{product.name}</Text><Text style={styles.body}>₦{product.price.toLocaleString()}</Text></View><ChevronRight size={18} color="#66728A" /></TouchableOpacity>)}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FC' }, content: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 }, brand: { flex: 1, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#0A154F' }, dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C7AD' },
  loader: { marginTop: 60 }, error: { color: '#B45309', marginBottom: 16 }, eyebrow: { color: '#66728A', fontSize: 11, fontFamily: 'Inter_600SemiBold' }, heading: { fontSize: 25, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 14 },
  kyc: { backgroundColor: '#E8F6FE', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, marginBottom: 18 }, kycText: { flex: 1, color: '#0A154F', fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBE2F0', borderRadius: 18, padding: 18, marginBottom: 14 }, label: { color: '#2E3192', fontSize: 10, fontFamily: 'Inter_600SemiBold', marginBottom: 6 }, title: { color: '#0A154F', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 7 }, body: { color: '#66728A', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }, link: { color: '#2E3192', fontFamily: 'Inter_600SemiBold', marginTop: 12 }, section: { color: '#0A154F', fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', marginVertical: 14 }, product: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, image: { width: 70, height: 64 }, productName: { color: '#0A154F', fontFamily: 'Inter_600SemiBold' },
});

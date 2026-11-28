import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bell,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { MobileApi } from '../lib/api';
import { DemoProduct } from '../lib/demo-data';
import { getProductAsset } from '../lib/bike-assets';
import { getLiveBikes } from '../lib/catalog';
import { TabType } from '../components/BottomNavBar';
import BrandMark from '../components/BrandMark';
import { supabase } from '../lib/supabase';

type Profile = { firstName?: string; lastName?: string; kycStatus?: string; customerStatus?: string };
type Repayment = { status: string; amount: string | number; dueDate: string };
type Loan = {
  id: string;
  status: string;
  rejectionReason?: string | null;
  bike?: { name?: string; model?: string };
  bikeSerialNumber?: string | null;
  chassisNumber?: string | null;
  tenure?: number;
  repayments?: Repayment[];
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export default function RealDashboardScreen({
  token,
  onSwitchTab,
  onNavigateToNotifications,
  onNavigateToKyc,
  onSelectProduct,
  onResumeApplication,
}: {
  token: string;
  onSwitchTab: (tab: TabType) => void;
  onNavigateToNotifications?: () => void;
  onNavigateToKyc?: () => void;
  onSelectProduct?: (product: DemoProduct) => void;
  onResumeApplication?: (product: DemoProduct) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<DemoProduct[]>([]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(false);

      const [profileResult, loanResult, notificationResult, catalogResult] = await Promise.allSettled([
        MobileApi.getProfile(token),
        MobileApi.getMyLoans(token),
        MobileApi.getNotifications(token),
        getLiveBikes(),
      ]);

      let prof: Profile | null = null;
      if (profileResult.status === 'fulfilled') {
        prof = (profileResult.value as any).user ?? profileResult.value.data ?? null;
      }
      if (!prof) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser(token);
          if (user) {
            prof = {
              firstName: user.user_metadata?.firstName || 'Rider',
              lastName: user.user_metadata?.lastName || '',
              kycStatus: 'pending',
              customerStatus: 'registered',
            };
          }
        } catch {
          // ignore
        }
      }
      setProfile(prof);
      if (loanResult.status === 'fulfilled') setLoans(loanResult.value.data ?? []);
      if (notificationResult.status === 'fulfilled') {
        const nData = notificationResult.value;
        const count = typeof nData.unreadCount === 'number'
          ? nData.unreadCount
          : (nData.data ?? []).filter((item: any) => !item.isRead).length;
        setUnreadCount(count);
      }
      if (catalogResult.status === 'fulfilled') setProducts(catalogResult.value);

      if (profileResult.status === 'rejected' && loanResult.status === 'rejected') {
        setError(true);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [token],
  );

  useEffect(() => {
    void loadData(false);

    if (!token || token.startsWith('demo-')) return;

    let channel: any = null;
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (userId) {
        channel = supabase
          .channel(`notifications:user:${userId}`)
          .on('broadcast', { event: 'new_notification' }, () => {
            // A rejection can happen while the app is open. Refresh the loan
            // state as well as the notification badge so the decision is
            // visible immediately without requiring an app restart.
            void loadData(false);
          })
          .subscribe();
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData, token]);

  const assigned = loans.find((loan) => loan.status === 'active' && !!loan.bikeSerialNumber);
  const activeLoan = loans.find((loan) => loan.status === 'active');
  // Keep the latest rejected application visible so the customer can see the
  // decision and its reason instead of falling back to the empty-state card.
  const application = loans.find((loan) => ['pending', 'under_review', 'approved', 'rejected'].includes(loan.status));

  const repayments = activeLoan?.repayments ?? [];
  const paidCount = repayments.filter((r) => r.status === 'paid').length;
  const totalCount = repayments.length;
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const nextPayment = repayments.find((r) => r.status === 'upcoming' || r.status === 'overdue');

  const kycRaw = (profile?.kycStatus || 'pending').toLowerCase();
  const isKycVerified = kycRaw === 'verified' || kycRaw === 'approved';
  const isKycPending = kycRaw === 'pending' || kycRaw === 'under_review';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor="#0A154F" colors={['#0A154F']} />
      }
    >
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <BrandMark size={38} backgroundColor="#FFFFFF" />
          <View>
            <Text style={styles.brand}>DandoEv</Text>
            <Text style={styles.brandSub}>Electric Mobility</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onNavigateToNotifications}
          accessibilityLabel="Notifications"
          style={styles.bellButton}
          activeOpacity={0.8}
        >
          <Bell size={20} color="#0A154F" />
          {unreadCount > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0A154F" />
          <Text style={styles.loaderText}>Loading your overview…</Text>
        </View>
      ) : (
        <>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Some account details could not load. Pull down to refresh.</Text>
            </View>
          )}

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.eyebrow}>{getGreeting()}</Text>
            <Text style={styles.heading}>
              {profile?.firstName || 'Rider'} {profile?.lastName || ''}
            </Text>
          </View>

          {/* Identity / KYC Pill Banner */}
          <TouchableOpacity
            style={[
              styles.kycCard,
              isKycVerified ? styles.kycVerified : isKycPending ? styles.kycPending : styles.kycAction,
            ]}
            onPress={onNavigateToKyc}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.kycIconWrap,
                { backgroundColor: isKycVerified ? '#D1FAE5' : isKycPending ? '#FEF3C7' : '#DBEAFE' },
              ]}
            >
              {isKycVerified ? (
                <CheckCircle2 size={18} color="#059669" />
              ) : isKycPending ? (
                <Clock size={18} color="#D97706" />
              ) : (
                <ShieldCheck size={18} color="#2563EB" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycTitle}>
                {isKycVerified
                  ? 'Identity Verified'
                  : isKycPending
                    ? 'Identity Verification'
                    : 'Complete KYC Verification'}
              </Text>
              <Text style={styles.kycSub}>
                {isKycVerified
                  ? 'Your account is cleared for instant BNPL approvals'
                  : 'Verify your identity to unlock BNPL e-bike financing'}
              </Text>
            </View>
            <View
              style={[
                styles.kycBadge,
                { backgroundColor: isKycVerified ? '#059669' : isKycPending ? '#D97706' : '#0A154F' },
              ]}
            >
              <Text style={styles.kycBadgeText}>
                {isKycVerified ? 'Verified' : kycRaw === 'under_review' ? 'In Review' : 'Verify'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Assigned Bike Card (when physical bike is assigned) */}
          {assigned && (
            <View style={styles.assignedCard}>
              <View style={styles.assignedTop}>
                <View style={styles.assignedIcon}>
                  <Bike size={20} color="#0A154F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignedEyebrow}>YOUR ASSIGNED E-BIKE</Text>
                  <Text style={styles.assignedTitle}>{assigned.bike?.name || 'DandoEv E-Bike'}</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>SERIAL NO.</Text>
                  <Text style={styles.metaVal}>{assigned.bikeSerialNumber}</Text>
                </View>
                {assigned.chassisNumber ? (
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>CHASSIS</Text>
                    <Text style={styles.metaVal}>{assigned.chassisNumber}</Text>
                  </View>
                ) : null}
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>TENURE</Text>
                  <Text style={styles.metaVal}>{assigned.tenure || '—'} mo</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Plan / Application / Empty State */}
          {activeLoan ? (
            <View style={styles.planHeroCard}>
              <View style={styles.planHeroGlow} />
              <View style={styles.planHeroHeader}>
                <Text style={styles.planHeroEyebrow}>ACTIVE BNPL PLAN</Text>
                <View style={styles.planProgressPill}>
                  <Text style={styles.planProgressPillText}>
                    {paidCount}/{totalCount || '—'} paid
                  </Text>
                </View>
              </View>
              <Text style={styles.planHeroTitle}>{activeLoan.bike?.name || 'E-Bike Financing'}</Text>

              {totalCount > 0 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
              )}

              {nextPayment ? (
                <View style={styles.nextPayBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} color="#52E0C1" />
                    <Text style={styles.nextPayLabel}>
                      Next installment · {new Date(nextPayment.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.nextPayAmount}>₦{Number(nextPayment.amount).toLocaleString()}</Text>
                </View>
              ) : (
                <Text style={styles.planHeroSub}>Your repayment schedule is up to date.</Text>
              )}

              <View style={styles.planActionRow}>
                <TouchableOpacity
                  style={styles.planPrimaryBtn}
                  onPress={() => onSwitchTab('loans')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.planPrimaryBtnText}>View Schedule</Text>
                  <ArrowRight size={15} color="#0A154F" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.planSecondaryBtn}
                  onPress={() => onSwitchTab('wallet')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.planSecondaryBtnText}>Clear Loan</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : application ? (
            <TouchableOpacity
              style={styles.statusCard}
              onPress={() => {
                const applicationName = `${application.bike?.name || ''} ${application.bike?.model || ''}`.toLowerCase().trim();
                const product = products.find((item) => {
                  const productName = `${item.name} ${item.model}`.toLowerCase();
                  return productName.includes(applicationName) || applicationName.includes(productName);
                });
                if (product && onResumeApplication) onResumeApplication(product);
                else onSwitchTab('loans');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.statusIconWrap}>
                <FileText size={20} color="#2E3192" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusEyebrow}>BNPL APPLICATION</Text>
                <Text style={styles.statusTitle}>
                  {application.status === 'rejected'
                    ? 'Application declined'
                    : application.status === 'under_review'
                    ? 'Under Review'
                    : application.status === 'approved'
                      ? 'Approved — Awaiting Assignment'
                      : 'Pending Submission'}
                </Text>
                <Text style={styles.statusSub}>
                  {application.status === 'rejected'
                    ? (application.rejectionReason || 'Your application was declined. Open Loans for details or contact support.')
                    : 'Tap to continue your application from where you stopped.'}
                </Text>
              </View>
              <ChevronRight size={18} color="#66728A" />
            </TouchableOpacity>
          ) : (
            <View style={styles.ctaHeroCard}>
              <View style={styles.ctaBadge}>
                <Sparkles size={13} color="#0A154F" />
                <Text style={styles.ctaBadgeText}>ZERO DOWN PAYMENT BNPL</Text>
              </View>
              <Text style={styles.ctaTitle}>Own an electric bike today</Text>
              <Text style={styles.ctaSub}>
                Browse our dispatch & commuter e-bikes and apply for flexible monthly or bi-daily payments.
              </Text>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => onSwitchTab('bikes')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaBtnText}>Explore E-Bikes</Text>
                <ArrowRight size={16} color="#0A154F" />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Shortcuts (No Card / No Fund Wallet here) */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity style={styles.shortcutItem} onPress={() => onSwitchTab('bikes')} activeOpacity={0.8}>
              <View style={[styles.shortcutIcon, { backgroundColor: '#EEF2FF' }]}>
                <Bike size={20} color="#2E3192" />
              </View>
              <Text style={styles.shortcutLabel}>Shop Bikes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={() => onSwitchTab('loans')} activeOpacity={0.8}>
              <View style={[styles.shortcutIcon, { backgroundColor: '#FEF3C7' }]}>
                <Calendar size={20} color="#D97706" />
              </View>
              <Text style={styles.shortcutLabel}>My Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={onNavigateToKyc} activeOpacity={0.8}>
              <View style={[styles.shortcutIcon, { backgroundColor: '#E5F9F4' }]}>
                <ShieldCheck size={20} color="#087C70" />
              </View>
              <Text style={styles.shortcutLabel}>KYC Status</Text>
            </TouchableOpacity>
          </View>

          {/* Featured E-Bikes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore E-Bikes</Text>
            <TouchableOpacity onPress={() => onSwitchTab('bikes')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {products.slice(0, 3).map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => onSelectProduct?.(product)}
              activeOpacity={0.85}
            >
              <View style={styles.productImgWrap}>
                <Image
                  source={getProductAsset(product.model || product.name)}
                  style={styles.productImg}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.productMeta} numberOfLines={1}>
                  {product.rangeKm ? `${product.rangeKm} km range` : 'Electric Mobility'} · Outright or BNPL
                </Text>
                <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
              </View>
              <View style={styles.productChevron}>
                <ChevronRight size={18} color="#0A154F" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#0A154F' },
  brandSub: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#66728A', marginTop: 1 },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C7AD',
  },
  loaderWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 12 },
  loaderText: { color: '#66728A', fontSize: 13, fontFamily: 'Inter_500Medium' },
  errorBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#92400E', fontSize: 13, fontFamily: 'Inter_500Medium' },
  greetingBlock: { marginBottom: 16 },
  eyebrow: { color: '#718098', fontSize: 11, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold' },
  heading: { fontSize: 28, color: '#0A154F', fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 3 },

  kycCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  kycVerified: { backgroundColor: '#F0FDF9', borderColor: '#A7F3D0' },
  kycPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  kycAction: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  kycIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kycTitle: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  kycSub: { color: '#57647B', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  kycBadgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  assignedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  assignedTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  assignedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E5F9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedEyebrow: { color: '#718098', fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  assignedTitle: { color: '#0A154F', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  activePill: { backgroundColor: '#D1FAE5', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  activePillText: { color: '#065F46', fontSize: 10, fontFamily: 'Inter_700Bold' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F4F8' },
  metaCell: { minWidth: 90 },
  metaLabel: { color: '#718098', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  metaVal: { color: '#0A154F', fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 2 },

  planHeroCard: {
    backgroundColor: '#0A154F',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    overflow: 'hidden',
  },
  planHeroGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(82, 224, 193, 0.14)',
  },
  planHeroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planHeroEyebrow: { color: '#8BE7D2', fontSize: 11, letterSpacing: 1.3, fontFamily: 'Inter_600SemiBold' },
  planProgressPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  planProgressPillText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  planHeroTitle: { color: '#FFFFFF', fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 14 },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: { height: '100%', backgroundColor: '#52E0C1', borderRadius: 999 },
  nextPayBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  nextPayLabel: { color: '#CAD8E9', fontSize: 12, fontFamily: 'Inter_500Medium' },
  nextPayAmount: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontVariant: ['tabular-nums'] },
  planHeroSub: { color: '#CAD8E9', fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 16 },
  planActionRow: { flexDirection: 'row', gap: 10 },
  planPrimaryBtn: {
    flex: 1,
    backgroundColor: '#52E0C1',
    borderRadius: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planPrimaryBtnText: { color: '#0A154F', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  planSecondaryBtn: {
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planSecondaryBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  statusIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  statusEyebrow: { color: '#2E3192', fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  statusTitle: { color: '#0A154F', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  statusSub: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3 },

  ctaHeroCard: {
    backgroundColor: '#0A154F',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  ctaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#52E0C1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  ctaBadgeText: { color: '#0A154F', fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.6 },
  ctaTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 6 },
  ctaSub: { color: '#CAD8E9', fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19, marginBottom: 16 },
  ctaBtn: {
    backgroundColor: '#52E0C1',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBtnText: { color: '#0A154F', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },

  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  shortcutItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EBF2',
    gap: 8,
  },
  shortcutIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { color: '#0A154F', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#0A154F', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  seeAll: { color: '#2E3192', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7EBF2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImgWrap: {
    width: 72,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  productImg: { width: 64, height: 56 },
  productName: { color: '#0A154F', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  productMeta: { color: '#66728A', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  productPrice: { color: '#087C70', fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4, fontVariant: ['tabular-nums'] },
  productChevron: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F4F8', alignItems: 'center', justifyContent: 'center' },
});

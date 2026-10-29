import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import {
  PiggyBank,
  Zap,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  Bell,
  Sparkles,
  ChevronRight,
  Copy,
  Wifi,
  ShoppingBag,
  Building2,
  FileDown,
  X,
  Battery,
  Gauge,
  Check,
} from 'lucide-react-native';
import { demoStore, DemoWallet, DemoLoan, DemoProduct, DemoUserProfile } from '../lib/demo-data';
import { getProductAsset, BIKE_ASSETS } from '../lib/bike-assets';
import { TabType } from '../components/BottomNavBar';
import FinancialStatementModal from '../components/FinancialStatementModal';
import BrandMark from '../components/BrandMark';
import { MobileApi } from '../lib/api';
import RealDashboardScreen from './RealDashboardScreen';

interface DashboardScreenProps {
  onSwitchTab: (tab: TabType) => void;
  token?: string | null;
  onNavigateToNotifications?: () => void;
  onNavigateToFundWallet?: () => void;
  onNavigateToKyc?: () => void;
  onSelectProduct?: (product: DemoProduct) => void;
}

export default function DashboardScreen({
  onSwitchTab,
  token,
  onNavigateToNotifications,
  onNavigateToFundWallet,
  onNavigateToKyc,
  onSelectProduct,
}: DashboardScreenProps) {
  if (token && !token.startsWith('demo-')) {
    return <RealDashboardScreen token={token} onSwitchTab={onSwitchTab} onNavigateToNotifications={onNavigateToNotifications} onNavigateToKyc={onNavigateToKyc} onSelectProduct={onSelectProduct} />;
  }
  return <DemoDashboardScreen onSwitchTab={onSwitchTab} token={token} onNavigateToNotifications={onNavigateToNotifications} onNavigateToFundWallet={onNavigateToFundWallet} onNavigateToKyc={onNavigateToKyc} onSelectProduct={onSelectProduct} />;
}

function DemoDashboardScreen({
  onSwitchTab,
  token,
  onNavigateToNotifications,
  onNavigateToFundWallet,
  onNavigateToKyc,
  onSelectProduct,
}: DashboardScreenProps) {
  const isDemoUser = Boolean(token?.startsWith('demo-'));
  const emptyWallet: DemoWallet = { mainBalance: 0, lockedSaving: 0, lockedUntil: '', weeklySavingAmount: 0, dailySavingAmount: 0, dailySavingsEnabled: false, collectedWeeks: 0, totalWeeks: 0, missedWeeks: 0, virtualCard: demoStore.getWallet().virtualCard };
  const emptyLoan: DemoLoan = { id: 'no-loan', bikeName: '', bikeModel: '', bikeImage: '', totalAmount: 0, loanAmount: 0, downPayment: 0, weeklyRepayment: 0, monthlyRepayment: 0, tenureMonths: 0, installmentsPaid: 0, totalInstallments: 0, nextDueDate: '', nextDueAmount: 0, daysRemaining: 0, status: 'under_review', deductionFrequency: 'weekly', repayments: [] };
  const emptyUser: DemoUserProfile = { id: '', firstName: 'there', lastName: '', email: '', phone: '', address: '', city: '', state: '', employmentStatus: '', employer: '', monthlyIncome: 0, kycTier: 1, kycStatus: 'pending', bvnVerified: false, ninVerified: false };
  const [wallet, setWallet] = useState<DemoWallet>(isDemoUser ? demoStore.getWallet() : emptyWallet);
  const [loan, setLoan] = useState<DemoLoan>(isDemoUser ? demoStore.getLoan() : emptyLoan);
  const [user, setUser] = useState<DemoUserProfile>(isDemoUser ? demoStore.getUser() : emptyUser);
  const [products, setProducts] = useState<DemoProduct[]>(demoStore.getProducts());
  const [unreadCount, setUnreadCount] = useState<number>(demoStore.getUnreadNotificationCount());
  const [hasAttachedCard, setHasAttachedCard] = useState<boolean>(demoStore.getHasAttachedCard());
  const [attachedCard, setAttachedCard] = useState(demoStore.getAttachedCard());
  const [attachedBank, setAttachedBank] = useState(demoStore.getAttachedBank());
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token && !isDemoUser) {
      Promise.all([
        MobileApi.getProfile(token),
        MobileApi.getMyLoans(token),
        MobileApi.getWalletBalance(token),
      ]).then(([profileRes, loansRes, walletRes]) => {
        const profile = (profileRes as any).user || (profileRes as any).data;
        if (profile) setUser((prev) => ({ ...prev, ...profile, kycTier: profile.kycStatus === 'verified' ? 2 : 1, kycStatus: profile.kycStatus === 'verified' ? 'verified' : 'pending' }));
        const remoteLoan = loansRes.data?.[0];
        if (remoteLoan) setLoan((prev) => ({ ...prev, id: remoteLoan.id, bikeName: remoteLoan.bike?.name || 'BNPL e-bike', totalAmount: Number(remoteLoan.totalRepayable || remoteLoan.loanAmount || 0), monthlyRepayment: Number(remoteLoan.monthlyRepayment || 0), status: remoteLoan.status, repayments: remoteLoan.repayments || [], bikeSerialNumber: remoteLoan.bikeSerialNumber, chassisNumber: remoteLoan.chassisNumber, batteryNumber1: remoteLoan.batteryNumber1, batteryNumber2: remoteLoan.batteryNumber2, chargerNumber: remoteLoan.chargerNumber, approvedAt: remoteLoan.approvedAt }));
        if (walletRes.data) setWallet((prev) => ({ ...prev, ...walletRes.data, mainBalance: Number(walletRes.data.mainBalance || 0), lockedSaving: Number(walletRes.data.lockedSaving || 0) }));
      }).catch(() => {});
      return;
    }
    const unsubscribe = demoStore.subscribe(() => {
      setWallet(demoStore.getWallet());
      setLoan(demoStore.getLoan());
      setUser(demoStore.getUser());
      setProducts(demoStore.getProducts());
      setUnreadCount(demoStore.getUnreadNotificationCount());
      setHasAttachedCard(demoStore.getHasAttachedCard());
      setAttachedCard(demoStore.getAttachedCard());
      setAttachedBank(demoStore.getAttachedBank());
    });
    return unsubscribe;
  }, [token, isDemoUser]);

  const hasLoan = isDemoUser || loan.id !== 'no-loan';

  const handleQuickPay = () => {
    const res = demoStore.payNextInstallment();
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const streakPercent = Math.round((wallet.collectedWeeks / wallet.totalWeeks) * 100);
  const report = demoStore.getFinancialReport();

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <BrandMark size={38} backgroundColor="#FFFFFF" />
          <View>
            <Text style={styles.brandName}>DandoEv</Text>
            <Text style={styles.brandTagline}>The future is here</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={onNavigateToNotifications}
            activeOpacity={0.8}
          >
            <Bell size={20} color="#1E293B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* User Greeting Bar */}
      <View style={styles.greetingBar}>
        <View>
          <Text style={styles.greetingText}>GOOD TO SEE YOU</Text>
          <Text style={styles.userNameText}>{user.firstName} {user.lastName}</Text>
        </View>
        <TouchableOpacity
          style={styles.kycTierBadge}
          onPress={onNavigateToKyc}
          activeOpacity={0.8}
        >
          <ShieldCheck size={14} color="#2E3192" />
          <Text style={styles.kycTierText}>Tier {user.kycTier} Verified</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Toast Message */}
      {toastMessage && (
        <View style={styles.toast}>
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* My Assigned Vehicle Asset Card (User Showcase Card with Light Blue Badge) */}
      <View style={[styles.assignedBikeCard, !hasLoan && styles.hiddenCard]}>
        <View style={styles.assignedBikeHeader}>
          <Text style={styles.assignedBikeTitle}>My {loan.bikeName || 'DandoEv bike'}</Text>
          <View style={styles.assignedBadge}>
            <Text style={styles.assignedBadgeText}>Assigned</Text>
          </View>
        </View>

        <View style={styles.assignedBikeBody}>
          <View style={styles.assignedBikeImageWrapper}>
            <Image
              source={BIKE_ASSETS['bike-g90']}
              resizeMode="contain"
              style={styles.assignedBikeImage}
            />
          </View>

          <View style={styles.assignedBikeInfoCol}>
            <TouchableOpacity
              style={styles.assignedInfoRow}
              activeOpacity={0.7}
              onPress={() => {
                setToastMessage('Copied Bike ID: DEV-G90-0001');
                setTimeout(() => setToastMessage(null), 3000);
              }}
            >
              <Text style={styles.assignedInfoLabel}>Bike ID: </Text>
              <Text style={styles.assignedInfoValue}>{loan.bikeSerialNumber || 'Fleet ID pending'}</Text>
              <Copy size={13} color="#64748B" style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            <View style={styles.assignedInfoRow}>
              <Text style={styles.assignedInfoLabel}>Financing: </Text>
              <Text style={styles.assignedInfoValue}>{loan.tenureMonths || '—'} months</Text>
            </View>

            <View style={styles.assignedInfoRow}>
              <Text style={styles.assignedInfoLabel}>Payment status: </Text>
              <View style={styles.statusActivePill}>
                <View style={styles.statusActiveDot} />
                <Text style={styles.statusActiveText}>Active</Text>
              </View>
            </View>

            <View style={styles.assignedInfoRow}>
              <Text style={styles.assignedInfoLabel}>Ownership: </Text>
              <Text style={styles.assignedInfoValue}>Rent-to-own</Text>
            </View>
          </View>
        </View>

        {/* Quick UX Telematics Bar */}
        <View style={styles.telematicsBar}>
          <View style={styles.telematicsChip}>
            <Battery size={13} color="#2E3192" />
            <Text style={styles.telematicsChipText}>Battery: 98% Normal</Text>
          </View>
          <TouchableOpacity
            style={styles.telematicsActionBtn}
            onPress={() => onSwitchTab('loans')}
            activeOpacity={0.7}
          >
            <Text style={styles.telematicsActionText}>Schedule</Text>
            <ArrowRight size={12} color="#2E3192" />
          </TouchableOpacity>
        </View>

      </View>

      {/* Linked Autopayment Card or Bank Mandate */}
      <View style={styles.atmCardWrapper}>
        <View style={styles.paymentMethodSwitcher}>
          <Text style={styles.paymentMethodLabel}>AUTOPAYMENT METHOD:</Text>
          <View style={styles.switcherPills}>
            <TouchableOpacity
              style={[styles.switchPill, hasAttachedCard && styles.switchPillActive]}
              onPress={() => demoStore.setHasAttachedCard(true)}
            >
              <CreditCard size={12} color={hasAttachedCard ? '#FFFFFF' : '#66728A'} />
              <Text style={[styles.switchPillText, hasAttachedCard && styles.switchPillTextActive]}>
                Attached Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchPill, !hasAttachedCard && styles.switchPillActive]}
              onPress={() => demoStore.setHasAttachedCard(false)}
            >
              <Building2 size={12} color={!hasAttachedCard ? '#FFFFFF' : '#66728A'} />
              <Text style={[styles.switchPillText, !hasAttachedCard && styles.switchPillTextActive]}>
                Bank Mandate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasAttachedCard ? (
          /* Real User Attached Card */
          <View style={styles.atmCard}>
            <View style={styles.atmCardTop}>
              <View style={styles.atmLogoRow}>
                <View style={[styles.atmLogoCircle, { backgroundColor: '#EA580C' }]} />
                <Text style={styles.atmCardBrand}>{attachedCard.bankName}</Text>
                <View style={[styles.platinumBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1 }]}>
                  <Text style={[styles.platinumText, { color: '#2E3192' }]}>AUTOPAY ACTIVE</Text>
                </View>
              </View>
              <Wifi size={20} color="rgba(255, 255, 255, 0.7)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            <View style={styles.emvChipRow}>
              <View style={styles.emvChip}>
                <View style={styles.chipInnerGrid}>
                  <View style={styles.chipLineH} />
                  <View style={styles.chipLineV} />
                </View>
              </View>
              <Text style={styles.contactlessText}>WEEKLY REPAYMENT CARD</Text>
            </View>

            <View style={styles.atmBalanceSection}>
              <Text style={styles.atmBalanceLabel}>AVAILABLE WALLET BALANCE: ₦{wallet.mainBalance.toLocaleString()}.00</Text>
              <Text style={styles.atmCardNumber}>{attachedCard.cardNumberMasked}</Text>
            </View>

            <View style={styles.atmFooterRow}>
              <View>
                <Text style={styles.atmFooterLabel}>CARDHOLDER</Text>
                <Text style={styles.atmFooterVal}>{attachedCard.cardholderName}</Text>
              </View>
              <View>
                <Text style={styles.atmFooterLabel}>EXPIRES</Text>
                <Text style={styles.atmFooterVal}>{attachedCard.expiry}</Text>
              </View>
              <View style={styles.mastercardPills}>
                <View style={[styles.mcCircle, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.mcCircle, { backgroundColor: '#F59E0B', marginLeft: -10 }]} />
              </View>
            </View>
          </View>
        ) : (
          /* No Card Attached -> Bank Information Mandate */
          <View style={[styles.atmCard, { backgroundColor: '#0A154F', borderColor: '#2E6A52' }]}>
            <View style={styles.atmCardTop}>
              <View style={styles.atmLogoRow}>
                <Building2 size={16} color="#A5B4FC" />
                <Text style={styles.atmCardBrand}>{attachedBank.bankName}</Text>
                <View style={[styles.platinumBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.platinumText, { color: '#92400E' }]}>NIBSS E-MANDATE</Text>
                </View>
              </View>
              <ShieldCheck size={18} color="#60A5FA" />
            </View>

            <View style={styles.emvChipRow}>
              <View style={[styles.emvChip, { backgroundColor: '#4A50AE', borderColor: '#3730A3' }]}>
                <View style={[styles.chipInnerGrid, { borderColor: '#818CF8' }]}>
                  <View style={[styles.chipLineH, { backgroundColor: '#3730A3' }]} />
                  <View style={[styles.chipLineV, { backgroundColor: '#3730A3' }]} />
                </View>
              </View>
              <Text style={[styles.contactlessText, { color: '#A5B4FC' }]}>DIRECT DEBIT ACTIVE</Text>
            </View>

            <TouchableOpacity
              style={styles.atmBalanceSection}
              activeOpacity={0.8}
              onPress={() => {
                setToastMessage(`Copied NUBAN (${attachedBank.accountNumberMasked}) & Mandate Ref!`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
            >
              <Text style={styles.atmBalanceLabel}>DIRECT DEBIT NUBAN ACCOUNT (TAP TO COPY)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.atmCardNumber}>{attachedBank.accountNumberMasked}</Text>
                <Copy size={14} color="#A5B4FC" />
              </View>
            </TouchableOpacity>

            <View style={styles.atmFooterRow}>
              <View>
                <Text style={styles.atmFooterLabel}>ACCOUNT NAME</Text>
                <Text style={styles.atmFooterVal}>{attachedBank.accountName}</Text>
              </View>
              <View>
                <Text style={styles.atmFooterLabel}>MANDATE REFERENCE</Text>
                <Text style={styles.atmFooterVal}>{attachedBank.mandateReference}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Card Action Hub */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.primaryFundBtn}
            onPress={onNavigateToFundWallet}
            activeOpacity={0.85}
          >
            <PlusCircle size={18} color="#FFFFFF" />
            <Text style={styles.primaryFundBtnText}>Fund Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryNubanBtn}
            onPress={() => setShowStatementModal(true)}
            activeOpacity={0.85}
          >
            <FileDown size={16} color="#2E3192" />
            <Text style={styles.secondaryNubanBtnText}>Financial Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {!hasLoan && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No active BNPL plan</Text>
            <Text style={styles.emptyStateText}>Your account is ready. Choose an e-bike from the catalog to start a verified BNPL application, or make an outright purchase.</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={() => onSwitchTab('bikes')}>
              <Text style={styles.emptyStateButtonText}>Browse e-bikes</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Weekly Deductions Active Loan Card */}
        <View style={[styles.loanCard, !hasLoan && styles.hiddenCard]}>
          <View style={styles.loanCardHeader}>
            <View>
              <View style={styles.deductionFreqBadge}>
                <Sparkles size={11} color="#2E3192" />
                <Text style={styles.deductionFreqBadgeText}>
                  WEEKLY DEDUCTION
                </Text>
              </View>
              <Text style={styles.loanTitle}>{loan.bikeName}</Text>
            </View>
            <TouchableOpacity onPress={() => onSwitchTab('loans')} style={styles.viewLoanBtn}>
              <Text style={styles.viewLoanText}>Schedule</Text>
              <ArrowRight size={14} color="#2E3192" />
            </TouchableOpacity>
          </View>

          <View style={styles.loanPayRow}>
            <View>
              <Text style={styles.loanDueLabel}>Next Weekly Installment</Text>
              <Text style={styles.loanDueAmount}>₦{loan.weeklyRepayment.toLocaleString()}</Text>
              <Text style={styles.loanDueDate}>Auto-deducted in 3 days (Mondays)</Text>
            </View>
            <TouchableOpacity
              style={[styles.payNowBtn, loan.status === 'completed' && { backgroundColor: '#2E3192' }]}
              onPress={handleQuickPay}
              disabled={loan.status === 'completed'}
            >
              <Text style={styles.payNowText}>
                {loan.status === 'completed' ? 'Paid' : `Pay ₦${loan.weeklyRepayment.toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KYC Upgrade Banner (if Tier 2) */}
        {user.kycTier < 3 && (
          <TouchableOpacity
            style={styles.kycBanner}
            onPress={onNavigateToKyc}
            activeOpacity={0.88}
          >
            <View style={styles.kycBannerIcon}>
              <ShieldCheck size={22} color="#4A50AE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycBannerTitle}>Upgrade to Tier 3 KYC 🚀</Text>
              <Text style={styles.kycBannerSub}>
                Unlock ₦3,500,000 credit limit & instant battery swaps with Digital Guarantor co-signing.
              </Text>
            </View>
            <ChevronRight size={18} color="#6366F1" />
          </TouchableOpacity>
        )}

        {/* Compulsory Savings Vault Card */}
        <View style={[styles.savingsCard, !hasLoan && styles.hiddenCard]}>
          <View style={styles.savingsTop}>
            <View style={styles.savingsTitleRow}>
              <PiggyBank size={20} color="#2E3192" />
              <Text style={styles.savingsTitle}>Save-As-You-Ride Vault</Text>
            </View>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>🔒 100% Returnable Escrow</Text>
            </View>
          </View>

          <Text style={styles.vaultAmount}>₦{wallet.lockedSaving.toLocaleString()}</Text>
          <Text style={styles.vaultSub}>
            100% yours! Auto-unlocks and transfers to your main cash balance upon full loan completion.
          </Text>

          {/* Daily Collection Streak */}
          <View style={styles.streakBox}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakTitle}>Savings Sweep Streak</Text>
              <Text style={styles.streakCount}>
                {wallet.collectedWeeks}/{wallet.totalWeeks} Weeks ({streakPercent}%)
              </Text>
            </View>
            <View style={styles.streakBarBg}>
              <View style={[styles.streakBarFill, { width: `${streakPercent}%` }]} />
            </View>
            <Text style={styles.streakHint}>
              🔥 ₦1,000 collected daily with your rides. 1 missed day.
            </Text>
          </View>
        </View>

        {/* Quick Action Hub */}
        <View style={styles.actionHub}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => onSwitchTab('bikes')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F6FE' }]}>
              <ShoppingBag size={22} color="#2E3192" />
            </View>
            <Text style={styles.actionText}>Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => onSwitchTab('loans')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={22} color="#D97706" />
            </View>
            <Text style={styles.actionText}>Repayments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={onNavigateToFundWallet}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <PlusCircle size={22} color="#2E3192" />
            </View>
            <Text style={styles.actionText}>Fund Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={onNavigateToKyc}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <ShieldCheck size={22} color="#7C3AED" />
            </View>
            <Text style={styles.actionText}>Tier 3 KYC</Text>
          </TouchableOpacity>
        </View>

        {/* Featured E-Bike Catalog */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Mobility Catalog</Text>
          <TouchableOpacity onPress={() => onSwitchTab('bikes')}>
            <Text style={styles.seeAllText}>View All ({products.length}) →</Text>
          </TouchableOpacity>
        </View>

        {products.slice(0, 3).map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.featuredCard}
            activeOpacity={0.85}
            onPress={() => onSelectProduct ? onSelectProduct(product) : onSwitchTab('bikes')}
          >
            <View style={styles.featuredImgWrapper}>
              <Image
                source={getProductAsset(product.id)}
                style={styles.featuredImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.featuredInfo}>
              <View style={styles.featuredCategoryBadge}>
                <Text style={styles.featuredCategoryText}>{product.category}</Text>
              </View>
              <Text style={styles.featuredBikeName}>{product.name}</Text>
              <Text style={styles.featuredPrice}>₦{product.price.toLocaleString()}</Text>
              <Text style={styles.featuredDaily}>
                Weekly BNPL available • 0% Down
              </Text>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Official Financial Statement Modal */}
      <FinancialStatementModal
        visible={showStatementModal}
        onClose={() => setShowStatementModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FC' },
  hiddenCard: { display: 'none' },
  emptyStateCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#DBE2F0', marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#0A154F' },
  emptyStateText: { fontSize: 13, lineHeight: 20, color: '#66728A', fontFamily: 'Inter_400Regular', marginTop: 6 },
  emptyStateButton: { alignSelf: 'flex-start', backgroundColor: '#2E3192', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  emptyStateButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2E3192',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#0A154F',
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  greetingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F6F7FC',
  },
  greetingText: {
    fontSize: 14,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  kycTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  kycTierText: {
    color: '#2E3192',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  toast: {
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  /* My Assigned Vehicle Asset Card (User Showcase Card with Light Blue Badge) */
  assignedBikeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  assignedBikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  assignedBikeTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: '#0A154F',
    letterSpacing: -0.5,
  },
  assignedBadge: {
    backgroundColor: '#EEF2FF', // Light blue shade of the #2E3192 logo
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  assignedBadgeText: {
    color: '#2E3192', // Logo brand color
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
  assignedBikeBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  assignedBikeImageWrapper: {
    width: 108,
    height: 108,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  assignedBikeImage: {
    width: '100%',
    height: '100%',
  },
  assignedBikeInfoCol: {
    flex: 1,
    gap: 7,
  },
  assignedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  assignedInfoLabel: {
    fontSize: 13.5,
    fontFamily: 'Inter_500Medium',
    color: '#475569',
  },
  assignedInfoValue: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    color: '#0F172A',
  },
  statusActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  statusActiveText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E40AF',
  },
  telematicsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  telematicsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telematicsChipText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  telematicsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telematicsActionText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  assignedBikeFootnote: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },

  /* Photorealistic ATM Card */
  atmCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  paymentMethodSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  paymentMethodLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#66728A',
    letterSpacing: 0.8,
  },
  switcherPills: {
    flexDirection: 'row',
    backgroundColor: '#DBE2F0',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  switchPillActive: {
    backgroundColor: '#2E3192',
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  switchPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  switchPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  atmCard: {
    backgroundColor: '#0A154F',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  atmCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  atmLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  atmLogoCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38BDF8',
  },
  atmCardBrand: {
    color: '#F6F7FC',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  platinumBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platinumText: {
    color: '#DBE2F0',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  emvChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  emvChip: {
    width: 44,
    height: 32,
    backgroundColor: '#D97706',
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: '#B45309',
  },
  chipInnerGrid: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 3,
    position: 'relative',
  },
  chipLineH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#B45309',
  },
  chipLineV: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#B45309',
  },
  contactlessText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
  },
  atmBalanceSection: {
    marginBottom: 14,
  },
  atmBalanceLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
  atmBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  atmNumberRow: {
    marginBottom: 16,
  },
  atmCardNumber: {
    color: '#DBE2F0',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 3,
  },
  atmFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  atmFooterLabel: {
    color: '#66728A',
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  atmFooterVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mastercardPills: {
    flexDirection: 'row',
  },
  mcCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.85,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryFundBtn: {
    flex: 1,
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryFundBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  secondaryNubanBtn: {
    flex: 1.3,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  secondaryNubanBtnText: {
    color: '#2E3192',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  content: {
    padding: 16,
    paddingBottom: 80,
  },
  loanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  deductionFreqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  deductionFreqBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  viewLoanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF2FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  viewLoanText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  loanPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  loanDueLabel: {
    fontSize: 10,
    color: '#B45309',
    fontFamily: 'Inter_600SemiBold',
  },
  loanDueAmount: {
    fontSize: 19,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#92400E',
    marginVertical: 1,
  },
  loanDueDate: {
    fontSize: 10,
    color: '#B45309',
    fontFamily: 'Inter_500Medium',
  },
  payNowBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  kycBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  kycBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  kycBannerSub: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 15,
  },
  savingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  savingsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  savingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  lockedBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  lockedBadgeText: {
    color: '#2E3192',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  vaultAmount: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  vaultSub: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 14,
  },
  streakBox: {
    backgroundColor: '#F6F7FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  streakTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#334155',
  },
  streakCount: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  streakBarBg: {
    height: 8,
    backgroundColor: '#DBE2F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  streakBarFill: {
    height: '100%',
    backgroundColor: '#2E3192',
    borderRadius: 4,
  },
  streakHint: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
  },
  actionHub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  actionItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  featuredImgWrapper: {
    width: 76,
    height: 76,
    backgroundColor: '#F6F7FC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featuredImg: {
    width: '90%',
    height: '90%',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredCategoryBadge: {
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  featuredCategoryText: {
    color: '#4A50AE',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  featuredBikeName: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 2,
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  featuredDaily: {
    fontSize: 11,
    color: '#2E3192',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 1,
  },
});

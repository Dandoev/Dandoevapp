// Local design reference only. Uses the app's real components; never shipped as the app entry.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import Onboarding from './src/screens/OnboardingScreen';
import SignIn from './src/screens/SignInScreen';
import SignUp from './src/screens/SignUpScreen';
import Bikes from './src/screens/BikesScreen';
import Product from './src/screens/ProductDetailScreen';
import Dashboard from './src/screens/RealDashboardScreen';
import Loans from './src/screens/RealLoansScreen';
import Profile from './src/screens/RealProfileScreen';
import Kyc from './src/screens/RealKycScreen';
import Wallet from './src/screens/FundWalletScreen';
import Notifications from './src/screens/NotificationsScreen';
import Terms from './src/screens/TermsScreen';
import Bnpl from './src/screens/BnplApplicationScreen';
import BottomNav from './src/components/BottomNavBar';
import { MobileApi } from './src/lib/api';
import { demoStore } from './src/lib/demo-data';

const noop = () => {};
// These fixtures affect this isolated, development-only gallery, not production accounts.
Object.assign(MobileApi, {
  getProfile: async () => ({ data: { firstName: 'Sample', lastName: 'Rider', kycStatus: 'pending', faceVerified: false } }),
  getMyLoans: async (token: string) => ({ data: token === 'design-active' ? [{
    id: 'sample-loan', status: 'active', bike: { name: 'DandoEv G90', model: 'G90' },
    bikeSerialNumber: 'SAMPLE-G90', tenure: 12, totalRepayable: 2797200,
    monoMandateStatus: 'active', guarantorsVerified: true,
    repayments: [{ id: 'sample-payment', installmentNumber: 1, amount: 53792, dueDate: '2026-12-01', status: 'upcoming' }],
    guarantors: [{id:'sample-guarantor',fullName:'Sample Guarantor',status:'accepted'}],
    transactions: [], documents: [],
    monoAssessment: { verifiedMonthlyInflow: 400000, verifiedMonthlyOutflow: 150000, dtiRatioPercent: 25, creditScore: 700, riskTier: 'low', underwritingDecision: 'APPROVED' },
  }] : [] }),
  getWalletBalance: async () => ({ data: { mainBalance: 0, lockedSaving: 0 } }),
  getNotifications: async () => ({ data: [] }),
  verifyMonoProveStatus: async () => ({ verified: false }),
});
const shared: any = { token: 'design-preview', onBack: noop, onComplete: noop, onSuccess: noop, navigateTo: noop, setToken: noop, onKycComplete: noop, onSwitchTab: noop, onApplyBNPL: noop, onRequestKyc: noop };
export default function DesignGallery() {
  const [ready] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!ready) return null;
  const product = demoStore.getProducts().find(p => p.name.includes('G90')) || demoStore.getProducts()[0];
  const screens: Array<[string, React.ReactNode, any?]> = [
    ['01 Onboarding', <Onboarding {...shared} />],
    ['02 Sign in', <SignIn {...shared} />],
    ['03 Registration', <SignUp {...shared} />],
    ['04 Shop', <Bikes />, 'bikes'],
    ['05 Product details', <Product {...shared} product={product} />],
    ['06 Overview — new account', <Dashboard {...shared} />, 'dashboard'],
    ['07 Plans — empty', <Loans {...shared} />, 'loans'],
    ['08 Profile', <Profile {...shared} />, 'profile'],
    ['09 Production KYC', <Kyc {...shared} />],
    ['10 Fund wallet', <Wallet {...shared} />],
    ['11 Notifications', <Notifications {...shared} />],
    ['12 Terms', <Terms {...shared} />],
    ['13 BNPL — application details', <Bnpl {...shared} product={product} />],
    ['14 BNPL — identity', <Bnpl {...shared} product={product} resumeStep={1} />],
    ['15 BNPL — bank and repayment', <Bnpl {...shared} product={product} designPreviewStep={2} />],
    ['16 BNPL — guarantors', <Bnpl {...shared} product={product} designPreviewStep={3} />],
    ['17 BNPL — review and agreement', <Bnpl {...shared} product={product} designPreviewStep={4} />],
    ['18 Active loan — sample data', <Loans token="design-active" />, 'loans'],
    ['19 Assigned bike — sample data', <Dashboard {...shared} token="design-active" />, 'dashboard'],
  ];
  return <SafeAreaProvider><ScrollView style={{backgroundColor:'#E2E8F0'}}><View style={{padding:40, width:1900, flexDirection:'row', flexWrap:'wrap', gap:32}}>
    {screens.map(([name,screen,tab]) => <View key={name} style={{width:420}}>
      <Text style={{fontFamily:'Inter_600SemiBold',fontSize:16,marginBottom:12}}>{name}</Text>
      <View style={{height:900,width:420,backgroundColor:'#F6F7FC',overflow:'hidden',borderRadius:24}}>
        <View style={{flex:1}}>{screen}</View>
        {tab && <BottomNav currentTab={tab} onSelectTab={noop} />}
      </View>
    </View>)}
  </View></ScrollView></SafeAreaProvider>;
}

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  View,
  Platform,
  useWindowDimensions,
  AppState,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import BikesScreen from "./src/screens/BikesScreen";
import LoansScreen from "./src/screens/LoansScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import TermsScreen from "./src/screens/TermsScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import KycScreen from "./src/screens/KycScreen";
import FundWalletScreen from "./src/screens/FundWalletScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import BnplApplicationScreen from "./src/screens/BnplApplicationScreen";
import BottomNavBar, { TabType } from "./src/components/BottomNavBar";
import AppErrorBoundary from "./src/components/AppErrorBoundary";
import { usePushNotifications } from "./src/lib/usePushNotifications";
import { demoStore, DemoProduct } from "./src/lib/demo-data";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./src/lib/supabase";
import { MobileApi } from "./src/lib/api";
import { TOKEN_STORAGE_KEY } from "./src/lib/auth-session";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
});

export type ScreenType =
  | "Onboarding"
  | "SignIn"
  | "SignUp"
  | "Dashboard"
  | "Terms"
  | "ProductDetail"
  | "Kyc"
  | "FundWallet"
  | "Notifications"
  | "BnplApplication";

function App() {
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("Onboarding");
  // The shop is the primary point of contact after authentication.
  const [currentTab, setCurrentTab] = useState<TabType>("bikes");
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(
    null,
  );
  const [bnplResumeStep, setBnplResumeStep] = useState<number | null>(null);
  const [bnplIdentity, setBnplIdentity] = useState({ nin: "", bvn: "" });
  const [prevScreenBeforeDetail, setPrevScreenBeforeDetail] =
    useState<ScreenType>("Dashboard");
  const [token, setToken] = useState<string | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [sessionRestoring, setSessionRestoring] = useState(true);

  // Initialize Push Notifications
  usePushNotifications();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Restore persistent session on launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
          setCurrentTab("bikes");
          setCurrentScreen("Dashboard");
          MobileApi.getProfile(session.access_token).catch(() => {});
          return;
        }

        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          setToken(storedToken);
          setCurrentTab("bikes");
          setCurrentScreen("Dashboard");
          if (!storedToken.startsWith("demo-")) MobileApi.getProfile(storedToken).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn("Session restoration skipped:", err);
      } finally {
        setSessionRestoring(false);
      }
    }
    restoreSession();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) updateToken(session.access_token);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!token || token.startsWith("demo-")) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") MobileApi.getProfile(token).catch(() => {});
    });
    return () => subscription.remove();
  }, [token]);

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const updateToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken).catch(() => {});
    } else {
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY).catch(() => {});
    }
  };

  const navigateTo = (screen: ScreenType) => {
    setCurrentScreen(screen);
    if (screen === "Dashboard") {
      setCurrentTab("bikes");
    }
  };

  const handleOpenProductDetail = (product: DemoProduct) => {
    setSelectedProduct(product);
    setPrevScreenBeforeDetail(currentScreen);
    setCurrentScreen("ProductDetail");
  };

  const handleLogout = async () => {
    updateToken(null);
    await supabase.auth.signOut().catch(() => {});
    demoStore.resetDemo();
    setCurrentScreen("SignIn");
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isSplashVisible || sessionRestoring) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0A154F" />
        <SplashScreen />
      </>
    );
  }

  // Render Authenticated Tab Content
  const renderAuthenticatedTab = () => {
    switch (currentTab) {
      case "home":
        return (
          <DashboardScreen
            onSwitchTab={setCurrentTab}
            token={token}
            onNavigateToNotifications={() => setCurrentScreen("Notifications")}
            onNavigateToFundWallet={() => setCurrentScreen("FundWallet")}
            onNavigateToKyc={() => setCurrentScreen("Kyc")}
            onSelectProduct={handleOpenProductDetail}
          />
        );
      case "bikes":
        return (
          <BikesScreen
            token={token}
            onSelectProduct={handleOpenProductDetail}
          />
        );
      case "loans":
        return <LoansScreen token={token} />;
      case "profile":
        return (
          <ProfileScreen
            token={token}
            onLogout={handleLogout}
            onNavigateToTerms={() => setCurrentScreen("Terms")}
            onNavigateToKyc={() => setCurrentScreen("Kyc")}
          />
        );
      default:
        return (
          <DashboardScreen
            onSwitchTab={setCurrentTab}
            token={token}
            onNavigateToNotifications={() => setCurrentScreen("Notifications")}
            onNavigateToFundWallet={() => setCurrentScreen("FundWallet")}
            onNavigateToKyc={() => setCurrentScreen("Kyc")}
            onSelectProduct={handleOpenProductDetail}
          />
        );
    }
  };

  return (
    <AppErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={
            ["Onboarding", "SignIn", "SignUp"].includes(currentScreen)
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            ["Onboarding", "SignIn", "SignUp"].includes(currentScreen)
              ? "#0A154F"
              : "#F6F7FC"
          }
        />
        <View
          style={[
            styles.webFrame,
            viewportWidth >= 768 && {
              maxWidth: 860,
              ...(Platform.OS === "web"
                ? { maxHeight: Math.max(0, viewportHeight - 48) }
                : {}),
            },
          ]}
        >
          {/* Onboarding Screen */}
          {currentScreen === "Onboarding" && (
            <OnboardingScreen
              onComplete={() => setCurrentScreen("SignIn")}
              navigateTo={navigateTo}
            />
          )}

          {/* Auth & Static Screens */}
          {currentScreen === "SignIn" && (
            <SignInScreen navigateTo={navigateTo} setToken={updateToken} />
          )}
          {currentScreen === "SignUp" && (
            <SignUpScreen navigateTo={navigateTo} setToken={updateToken} />
          )}
          {currentScreen === "Terms" && (
            <TermsScreen
              onBack={() => navigateTo(token ? "Dashboard" : "SignUp")}
            />
          )}

          {/* Dedicated Full Product Detail Page */}
          {currentScreen === "ProductDetail" && selectedProduct && (
            <ProductDetailScreen
              product={selectedProduct}
              token={token}
              onBack={() => setCurrentScreen(prevScreenBeforeDetail)}
              onApplyBNPL={(prod, _tenure) => {
                setSelectedProduct(prod);
                setBnplIdentity({ nin: "", bvn: "" });
                setBnplResumeStep(0);
                setCurrentScreen("BnplApplication");
              }}
            />
          )}

          {/* 3-Step KYC Userflow */}
          {currentScreen === "Kyc" && (
            <KycScreen
              token={token}
              onBack={() =>
                selectedProduct
                  ? setCurrentScreen("BnplApplication")
                  : setCurrentScreen("Dashboard")
              }
              onKycComplete={() => {
                if (selectedProduct) {
                  setBnplResumeStep(1);
                  setCurrentScreen("BnplApplication");
                } else {
                  setCurrentScreen("Dashboard");
                }
              }}
            />
          )}

          {currentScreen === "BnplApplication" && selectedProduct && token && (
            <BnplApplicationScreen
              token={token}
              product={selectedProduct}
              resumeStep={bnplResumeStep}
              initialIdentity={bnplIdentity}
              onRequestKyc={(identity) => {
                setBnplIdentity(identity);
                setBnplResumeStep(1);
                setCurrentScreen("Kyc");
              }}
              onBack={() => setCurrentScreen("Dashboard")}
              onComplete={() => setCurrentScreen("Dashboard")}
            />
          )}

          {/* Comprehensive Fund Wallet Userflow */}
          {currentScreen === "FundWallet" && (
            <FundWalletScreen
              token={token}
              onBack={() => setCurrentScreen("Dashboard")}
              onSuccess={() => setCurrentScreen("Dashboard")}
            />
          )}

          {/* Notifications Screen */}
          {currentScreen === "Notifications" && (
            <NotificationsScreen
              token={token}
              onBack={() => setCurrentScreen("Dashboard")}
            />
          )}

          {/* Authenticated Dashboard Shell with Docked Bottom Navbar */}
          {currentScreen === "Dashboard" && (
            <View style={styles.dashboardShell}>
              <View style={styles.tabContent}>{renderAuthenticatedTab()}</View>
              <BottomNavBar
                currentTab={currentTab}
                onSelectTab={setCurrentTab}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </AppErrorBoundary>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A154F",
    alignItems: "center",
    justifyContent: "center",
  },
  webFrame: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 480 : "100%",
    backgroundColor: "#F6F7FC",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          height: "100%",
          maxHeight: 900,
          borderRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 8,
        }
      : {}),
  },
  dashboardShell: {
    flex: 1,
    backgroundColor: "#F6F7FC",
    justifyContent: "space-between",
  },
  tabContent: {
    flex: 1,
  },
});

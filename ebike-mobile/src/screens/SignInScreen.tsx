import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { demoStore } from '../lib/demo-data';
import { ScreenType } from '../../App';
import BrandMark from '../components/BrandMark';

interface SignInScreenProps {
  navigateTo: (screen: ScreenType) => void;
  setToken: (t: string) => void;
}

export default function SignInScreen({ navigateTo, setToken }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      // Check if user is signing in with demo credentials (dev/demo mode only)
      const isDemoMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
      if (isDemoMode && (email.toLowerCase() === 'solomon.dunu@demo.com' || email.toLowerCase() === 'adebayo@demo.com')) {
        demoStore.resetDemo();
        setToken('demo-token-customer');
        navigateTo('Dashboard');
        return;
      }

      // Real Supabase sign-in attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
        return;
      }

      if (data.session) {
        setToken(data.session.access_token);
        navigateTo('Dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        <View style={styles.brandHeader}>
          <BrandMark size={58} backgroundColor="#FFFFFF" />
          <Text style={styles.brandName}>DandoEv</Text>
          <Text style={styles.brandTagline}>The future is here</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>Your next move starts here. Sign in to continue.</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Email Input */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage(null);
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.8 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Footer navigation */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => navigateTo('SignUp')}>
              <Text style={styles.linkText}> Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A154F',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    paddingVertical: 34,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 27,
    gap: 8,
  },
  brandName: {
    fontSize: 33,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#B6C6DC',
    fontFamily: 'Inter_500Medium',
    marginTop: 5,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
  },
  title: {
    fontSize: 29,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#0A154F',
  },
  button: {
    backgroundColor: '#0A154F',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DBE2F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginHorizontal: 10,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 14,
    borderRadius: 14,
  },
  demoButtonText: {
    color: '#2E3192',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  demoHint: {
    textAlign: 'center',
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#66728A',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  linkText: {
    color: '#2E3192',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

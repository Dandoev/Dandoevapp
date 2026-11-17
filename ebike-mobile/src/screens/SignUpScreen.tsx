import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { User, Mail, Lock, Phone, Check, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { demoStore } from '../lib/demo-data';
import { MobileApi } from '../lib/api';
import { ScreenType } from '../../App';
import BrandMark from '../components/BrandMark';

interface SignUpScreenProps {
  navigateTo: (screen: ScreenType) => void;
  setToken: (t: string) => void;
}

export default function SignUpScreen({ navigateTo, setToken }: SignUpScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // One-click helper to fill sample buyer registration info
  const handleAutoFill = () => {
    setFirstName('Chinedu');
    setLastName('Okafor');
    setEmail('chinedu.okafor@example.com');
    setPhone('+234 812 345 6789');
    setPassword('Pass@Dando2026!');
    setConfirmPassword('Pass@Dando2026!');
    setAcceptedTerms(true);
    setErrorMessage(null);
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter both first and last name.');
      return;
    }
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      setErrorMessage('Enter a phone number or an email address to create your account.');
      return;
    }
    if (hasEmail && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (hasPhone && phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid Nigerian phone number, e.g. 0803 123 4567.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setErrorMessage('Password needs an uppercase letter, a number and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter the same password.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage('Please agree to the DandoEv Terms & Conditions.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = hasEmail ? email.trim().toLowerCase() : undefined;
      const cleanPhone = hasPhone ? phone.trim() : undefined;
      // 1. Try Backend API endpoint if reachable (auto-confirms user and synchronizes profile)
      try {
        const apiData = await MobileApi.signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password,
        });
        if (apiData.success) {
          // Account creation succeeds, navigate to SignIn
          navigateTo('SignIn');
          return;
        }
      } catch (backendError: any) {
        // If account already exists, immediately show error instead of falling back to Supabase
        if (
          backendError.message?.toLowerCase().includes('already') ||
          backendError.message?.toLowerCase().includes('exists')
        ) {
          throw backendError;
        }

        // Phone-only accounts can only be created by the backend (no email for Supabase).
        if (!cleanEmail) {
          throw backendError;
        }

        // 2. Direct Supabase Fallback (on network timeout / server sleeping)
        try {
          const { data: supaData, error: supaError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: cleanPhone ?? null,
                role: 'customer',
              },
            },
          });

          if (!supaError && supaData.user) {
            navigateTo('SignIn');
            return;
          }

          if (supaError) {
            throw new Error(supaError.message || backendError.message);
          }
        } catch (supaFallbackError: any) {
          throw supaFallbackError.message ? supaFallbackError : backendError;
        }

        throw backendError;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          <View style={styles.brandHeader}>
            <BrandMark size={58} backgroundColor="#FFFFFF" />
            <Text style={styles.brandName}>DandoEv</Text>
            <Text style={styles.brandTagline}>The future is here</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>Your journey starts here.</Text>
                <Text style={styles.subtitle}>Create an account to find your next ride.</Text>
              </View>
              <TouchableOpacity style={styles.autofillBtn} onPress={handleAutoFill} activeOpacity={0.8}>
                <Sparkles size={14} color="#2E3192" />
                <Text style={styles.autofillText}>Auto-Fill</Text>
              </TouchableOpacity>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* First & Last Name Inputs */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>First Name</Text>
                <View style={styles.inputContainer}>
                  <User size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      setErrorMessage(null);
                    }}
                  />
                </View>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Last Name</Text>
                <View style={styles.inputContainer}>
                  <User size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={(t) => {
                      setLastName(t);
                      setErrorMessage(null);
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Phone Input */}
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="0803 123 4567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  setErrorMessage(null);
                }}
              />
            </View>

            {/* Email Input */}
            <Text style={styles.label}>Email Address (optional if you use a phone number)</Text>
            <View style={styles.inputContainer}>
              <Mail size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMessage(null);
                }}
              />
            </View>
            <Text style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter_500Medium', marginTop: -8, marginBottom: 12 }}>
              Sign in with your phone number or email. Provide at least one.
            </Text>

            {/* Password Input */}
            <Text style={styles.label}>Create Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Min. 8 chars, A-Z, 0-9, symbol"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage(null);
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrorMessage(null); }}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
              </TouchableOpacity>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                {acceptedTerms && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => navigateTo('Terms')}>
                  Terms & Conditions
                </Text>{' '}
                and NDPR Privacy Policy.
              </Text>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.8 }]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#0A154F" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigateTo('SignIn')}>
                <Text style={styles.linkText}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 5,
    letterSpacing: 2,
    opacity: 0.95,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  subtitle: {
    fontSize: 16,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  autofillText: {
    fontSize: 14,
    color: '#1768D1',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 14,
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
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#0A154F',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#36C0FE',
    borderColor: '#36C0FE',
  },
  termsText: {
    fontSize: 16,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  termsLink: {
    color: '#1768D1',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  button: {
    backgroundColor: '#36C0FE',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#36C0FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#0A154F',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    color: '#66728A',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  linkText: {
    color: '#1768D1',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

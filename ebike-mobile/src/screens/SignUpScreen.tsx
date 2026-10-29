import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { User, Mail, Lock, Phone, Check, AlertCircle, Sparkles } from 'lucide-react-native';
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
    setAcceptedTerms(true);
    setErrorMessage(null);
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter both first and last name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phone || phone.trim().length < 8) {
      setErrorMessage('Please enter a valid phone number for rider delivery & verification.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage('Please agree to the DandoEv Terms & Conditions.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try Backend API endpoint if reachable
      try {
        const apiData = await MobileApi.signUp({
          firstName,
          lastName,
          email,
          phone: phone || '+234 800 000 0000',
          password,
        });
        if (apiData.success) {
          // Account creation succeeds, but authentication starts after a real sign-in.
          navigateTo('SignIn');
          return;
        }
      } catch (backendError) {
        throw backendError;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
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

            {/* Email Input */}
            <Text style={styles.label}>Email Address</Text>
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

            {/* Phone Input */}
            <Text style={styles.label}>Phone Number (WhatsApp Contact)</Text>
            <View style={styles.inputContainer}>
              <Phone size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="+234 800 000 0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter_400Regular', marginTop: -8, marginBottom: 12 }}>
              Used for delivery coordination and account notifications.
            </Text>

            {/* Password Input */}
            <Text style={styles.label}>Create Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={16} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage(null);
                }}
              />
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
    </View>
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
    fontSize: 14,
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
    fontSize: 14,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
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
    fontSize: 12,
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
    fontSize: 12,
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
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
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
    fontSize: 14,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  termsLink: {
    color: '#1768D1',
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  linkText: {
    color: '#1768D1',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

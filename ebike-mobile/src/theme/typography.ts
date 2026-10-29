// ============================================================
// DandoEv Mobile — Centralized Typography Tokens
// Replicates the exact typography scale, weight & letter-spacing
// ============================================================

import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
  // Screen Title (H1) - e.g. "Find your ride.", "Your plans."
  h1: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textHeading,
    letterSpacing: -0.5,
  },

  // Major Section Title (H2) - e.g. "Featured Mobility", active loan name
  h2: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textHeading,
    letterSpacing: -0.3,
  },

  // Card Title / Product Name (H3) - e.g. "DandoEV G90", "DandoEV X5"
  h3: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textHeading,
    letterSpacing: -0.3,
  },

  // Hero Display Price - e.g. "₦10,500" due installment, "₦1,700,000"
  displayPrice: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.amberAlert,
    letterSpacing: -0.5,
  },

  // Product Price - e.g. "₦1,700,000"
  price: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textPrice,
    letterSpacing: -0.3,
  },

  // Card Subtitle / Meta - e.g. "Premium commuter e-bike", "Sports fat-tire e-bike"
  bodyLarge: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    color: colors.textMuted,
  },

  // Standard Body Text - e.g. descriptions, terms
  body: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // Secondary Meta / Dates / Subtexts - e.g. "Due: 2026-09-14 (In 7 days)"
  bodySmall: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    color: colors.textMuted,
  },

  // Button Action Text - e.g. "Pay Now", "Apply BNPL", "See more details"
  button: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textWhite,
  },

  buttonSecondary: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    color: colors.textPrice,
  },

  // Badges & Pills - e.g. "FLAGSHIP", "FAT-TIRE", "ACTIVE BNPL LOAN"
  badge: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Specs & Micro Labels - e.g. "750W", "20Ah", "48V"
  caption: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
};

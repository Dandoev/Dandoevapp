// ============================================================
// DandoEv Mobile — Centralized Color Palette Tokens
// ============================================================

export const colors = {
  // Brand Primaries
  primary: '#1E1B4B',        // Deep Indigo/Navy used for primary buttons, prices, active tabs
  primaryDark: '#0A154F',    // Deep Midnight Navy used for headings and brand marks
  primaryAccent: '#2E3192',  // Vivid Royal Indigo for accents and secondary actions

  // Neutrals & Backgrounds
  background: '#F6F7FC',     // Screen canvas background
  cardBg: '#FFFFFF',         // Card container background
  surfaceSubtle: '#F8FAFC',  // Inner image/specs/tile background
  surfaceInput: '#F1F4F9',   // Text input background
  border: '#E2E8F0',         // Default border color
  borderSubtle: '#E6ECF5',   // Subtle card borders
  borderCard: '#DBE2F0',

  // Typography Colors
  textHeading: '#0A154F',
  textPrice: '#1E1B4B',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',

  // Badges & Accents
  amberBadgeBg: '#FEF3C7',
  amberBadgeText: '#B45309',
  amberDark: '#92400E',
  amberAlert: '#D97706',

  indigoBadgeBg: '#EEF2FF',
  indigoBadgeText: '#3730A3',

  greenBadgeBg: '#F0FDF4',
  greenBadgeText: '#15803D',
  greenDark: '#047857',
  greenForest: '#065F46',
  greenDot: '#16A34A',

  cyanBadgeText: '#087F75',
  purpleBadgeText: '#7C3AED',
} as const;

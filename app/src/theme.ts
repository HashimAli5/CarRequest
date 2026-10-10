export const colors = {
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: '#EEF2FF',

  success: '#15803D',
  successSoft: '#DCFCE7',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  pending: '#B45309',
  pendingSoft: '#FEF3C7',
  alternative: '#7C3AED',
  alternativeSoft: '#EDE9FE',
  neutral: '#4B5563',
  neutralSoft: '#F3F4F6',

  background: '#F5F6FA',
  card: '#FFFFFF',
  text: '#1F2330',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#E6E8EF',
  overlay: 'rgba(17, 20, 32, 0.45)',
  white: '#FFFFFF',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const font = {
  title: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },
};

export const shadow = {
  shadowColor: '#1F2330',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

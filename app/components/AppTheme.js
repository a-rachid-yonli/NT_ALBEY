import { Platform } from 'react-native';

export const AppTheme = {
  colors: {
    primary: '#008933',
    primaryDark: '#006B28',
    primarySoft: '#E9F6EC',
    accent: '#FF6600',
    accentSoft: '#FFF2E8',
    background: '#F4F7F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAF9',
    text: '#15231B',
    textPrimary: '#15231B',
    textSecondary: '#64736A',
    textMuted: '#929D97',
    border: '#E3E8E5',
    borderStrong: '#CCD5CF',
    success: '#0AA844',
    successSoft: '#E8F7ED',
    warning: '#D97706',
    warningSoft: '#FFF7E8',
    danger: '#D92D20',
    dangerSoft: '#FEECEB',
    shadow: '#183C27',
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
  },
  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: '#183C27',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
};

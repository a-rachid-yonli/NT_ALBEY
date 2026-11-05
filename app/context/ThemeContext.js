// context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as LIGHT_COLORS } from '../constants/colors';
import { triggerLightHaptic } from '../utils/haptics';

const THEME_STORAGE_KEY = '@ntalbey_theme_mode';

export const DARK_COLORS = {
  ...LIGHT_COLORS,
  background: '#0B1120',
  surface: '#1E293B',
  surfaceAlt: '#131C31',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  borderSoft: '#1E293B',
  primarySoft: 'rgba(16, 185, 129, 0.16)',
  accentSoft: 'rgba(245, 158, 11, 0.16)',
};

const BG_MAP = {
  '#f1f5f9': '#0B1120',
  '#f5f7fa': '#0B1120',
  '#f3f4f6': '#0B1120',
  '#eef2f6': '#0B1120',
  '#f8fafc': '#131C31',
  '#f9fafb': '#131C31',
  '#f4f6f8': '#131C31',
  '#ffffff': '#1E293B',
  '#fff': '#1E293B',
  '#e2e8f0': '#334155',
  '#e5e7eb': '#334155',
  '#cbd5e1': '#334155',
  '#e8f5e9': 'rgba(16, 185, 129, 0.16)',
  '#ecfdf5': 'rgba(16, 185, 129, 0.16)',
  '#d1fae5': 'rgba(16, 185, 129, 0.16)',
  '#f0fdf4': 'rgba(16, 185, 129, 0.16)',
  '#f0fff4': 'rgba(16, 185, 129, 0.16)',
  '#fff3e0': 'rgba(245, 158, 11, 0.16)',
  '#fef3c7': 'rgba(245, 158, 11, 0.16)',
  '#ffedd5': 'rgba(245, 158, 11, 0.16)',
  '#fff7ed': 'rgba(245, 158, 11, 0.16)',
  '#dbeafe': 'rgba(59, 130, 246, 0.16)',
  '#eff6ff': 'rgba(59, 130, 246, 0.16)',
  '#e0f2fe': 'rgba(59, 130, 246, 0.16)',
  '#fee2e2': 'rgba(239, 68, 68, 0.16)',
  '#fef2f2': 'rgba(239, 68, 68, 0.16)',
  '#f3e8ff': 'rgba(139, 92, 246, 0.16)',
  '#ede9fe': 'rgba(139, 92, 246, 0.16)',
  '#fce7f3': 'rgba(236, 72, 153, 0.16)',
};

const BORDER_SET = new Set([
  '#e2e8f0',
  '#f1f5f9',
  '#e5e7eb',
  '#cbd5e1',
  '#f0f0f0',
  '#ffffff',
  '#fff',
]);

const TEXT_COLOR_MAP = {
  '#0f172a': '#F8FAFC',
  '#1e293b': '#F8FAFC',
  '#111827': '#F8FAFC',
  '#1a1a1a': '#F8FAFC',
  '#222222': '#F8FAFC',
  '#333333': '#F8FAFC',
  '#000000': '#F8FAFC',
  '#000': '#F8FAFC',
  '#334155': '#E2E8F0',
  '#475569': '#94A3B8',
  '#64748b': '#94A3B8',
  '#6b7280': '#94A3B8',
};

export function adaptViewStyleForDark(style, isDark) {
  if (!isDark || !style) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;

  let overrides = null;

  if (typeof flat.backgroundColor === 'string') {
    const lowerBg = flat.backgroundColor.toLowerCase().trim();
    const isSmallKnob =
      typeof flat.width === 'number' &&
      typeof flat.height === 'number' &&
      flat.width <= 30 &&
      flat.height <= 30 &&
      (lowerBg === '#ffffff' || lowerBg === '#fff');

    if (!isSmallKnob && BG_MAP[lowerBg]) {
      overrides = overrides || {};
      overrides.backgroundColor = BG_MAP[lowerBg];
    }
  }

  for (const prop of [
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
  ]) {
    if (typeof flat[prop] === 'string') {
      const lowerBorder = flat[prop].toLowerCase().trim();
      if (BORDER_SET.has(lowerBorder)) {
        overrides = overrides || {};
        overrides[prop] = '#334155';
      }
    }
  }

  return overrides ? [style, overrides] : style;
}

export function adaptTextStyleForDark(style, isDark) {
  if (!isDark || !style) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;

  let overrides = null;

  if (typeof flat.color === 'string') {
    const lowerColor = flat.color.toLowerCase().trim();
    if (TEXT_COLOR_MAP[lowerColor]) {
      overrides = overrides || {};
      overrides.color = TEXT_COLOR_MAP[lowerColor];
    }
  }

  if (typeof flat.backgroundColor === 'string') {
    const lowerBg = flat.backgroundColor.toLowerCase().trim();
    if (BG_MAP[lowerBg]) {
      overrides = overrides || {};
      overrides.backgroundColor = BG_MAP[lowerBg];
    }
  }

  for (const prop of ['borderColor', 'borderTopColor', 'borderBottomColor']) {
    if (typeof flat[prop] === 'string') {
      const lowerBorder = flat[prop].toLowerCase().trim();
      if (BORDER_SET.has(lowerBorder)) {
        overrides = overrides || {};
        overrides[prop] = '#334155';
      }
    }
  }

  return overrides ? [style, overrides] : style;
}

const ThemeContext = createContext({
  isDark: false,
  themeMode: 'light',
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setThemeModeState(saved);
        }
      } catch (_) {}
    })();
  }, []);

  const setThemeMode = async (mode) => {
    const next = mode === 'dark' ? 'dark' : 'light';
    triggerLightHaptic();
    setThemeModeState(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {}
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const isDark = themeMode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, colors, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

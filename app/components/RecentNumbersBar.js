// components/RecentNumbersBar.js
// ✨ Barre de bulles "Récents & Favoris" en 1 clic pour pré-remplir un numéro
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TranslatedText as Text,
  ThemedView as View,
  ThemedTouchableOpacity as TouchableOpacity,
} from '../context/LanguageContext';
import { triggerSelectionHaptic } from '../utils/haptics';

const RECENT_NUMBERS_KEY = '@ntalbey_recent_numbers_v1';
const MAX_RECENTS = 6;

function normalizeLocal8(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('227') && digits.length === 11) {
    return digits.slice(3);
  }
  if (digits.length === 8) {
    return digits;
  }
  return '';
}

function formatDisplayPhone(digits8 = '') {
  if (digits8.length !== 8) return digits8;
  return `${digits8.slice(0, 2)} ${digits8.slice(2, 4)} ${digits8.slice(4, 6)} ${digits8.slice(6, 8)}`;
}

export async function saveRecentNumber(phone, label = '') {
  try {
    const clean = normalizeLocal8(phone);
    if (!clean || clean.length !== 8) return;
    const raw = await AsyncStorage.getItem(RECENT_NUMBERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list)
      ? list.filter((item) => item && item.phone !== clean)
      : [];
    const updated = [
      { phone: clean, label: label || '', updatedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENT_NUMBERS_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export default function RecentNumbersBar({
  onSelectNumber,
  currentValue = '',
  filterPrefix = null, // ex: ['83', '93'] pour NT uniquement, ou null pour tous
  transactions = [],
}) {
  const [recents, setRecents] = useState([]);

  const loadRecents = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_NUMBERS_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      const map = new Map();

      if (Array.isArray(saved)) {
        for (const item of saved) {
          const clean = normalizeLocal8(item?.phone);
          if (clean) {
            map.set(clean, { phone: clean, label: item?.label || '' });
          }
        }
      }

      // Compléter avec les numéros issus des transactions récentes si besoin
      if (Array.isArray(transactions) && map.size < MAX_RECENTS) {
        for (const tx of transactions) {
          const candidate =
            tx?.recipient_phone ||
            tx?.beneficiary_phone ||
            tx?.to_phone ||
            tx?.phone ||
            '';
          const clean = normalizeLocal8(candidate);
          if (clean && !map.has(clean)) {
            map.set(clean, {
              phone: clean,
              label: tx?.recipient_name || tx?.beneficiary_name || '',
            });
          }
          if (map.size >= MAX_RECENTS) break;
        }
      }

      let items = Array.from(map.values());
      if (Array.isArray(filterPrefix) && filterPrefix.length > 0) {
        items = items.filter((it) =>
          filterPrefix.some((p) => it.phone.startsWith(p))
        );
      }

      setRecents(items.slice(0, MAX_RECENTS));
    } catch (_) {}
  }, [transactions, filterPrefix]);

  useEffect(() => {
    loadRecents();
  }, [loadRecents]);

  if (!recents.length) return null;

  const cleanCurrent = normalizeLocal8(currentValue);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>⚡ Récents :</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {recents.map((item) => {
          const isSelected = cleanCurrent === item.phone;
          return (
            <TouchableOpacity
              key={item.phone}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => {
                triggerSelectionHaptic();
                if (typeof onSelectNumber === 'function') {
                  onSelectNumber(item.phone, item.label);
                }
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {item.label
                  ? `${item.label.split(' ')[0]} · ${formatDisplayPhone(item.phone)}`
                  : formatDisplayPhone(item.phone)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#008933',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextSelected: {
    color: '#008933',
  },
});

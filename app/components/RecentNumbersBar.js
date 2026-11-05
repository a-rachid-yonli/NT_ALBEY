// components/RecentNumbersBar.js
// ✨ Barre de bulles "Récents & Favoris" (Inspiré de Wave & Orange Money)
//    - Sélection rapide en 1-clic
//    - Bulles d'avatars avec initiales stylisées
//    - Indicateur visuel d'opérateur GSM nigérien (vert NT, rouge Airtel, jaune Zamani, bleu Moov)
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TranslatedText as Text,
  ThemedView as View,
  ThemedTouchableOpacity as TouchableOpacity,
} from '../context/LanguageContext';
import { triggerSelectionHaptic } from '../utils/haptics';
import { detectNigerOperator, normalizeNigerPhone } from '../utils/operatorDetector';

const RECENT_NUMBERS_KEY = '@ntalbey_recent_numbers_v1';
const MAX_RECENTS = 6;

function formatDisplayPhone(digits8 = '') {
  if (digits8.length !== 8) return digits8;
  return `${digits8.slice(0, 2)} ${digits8.slice(2, 4)} ${digits8.slice(4, 6)} ${digits8.slice(6, 8)}`;
}

function getInitials(name = '', phone = '') {
  if (name && typeof name === 'string') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }
  const cleanPhone = normalizeNigerPhone(phone);
  return cleanPhone.slice(0, 2) || 'NT';
}

function getFirstName(name = '', phone = '') {
  if (name && typeof name === 'string' && name.trim()) {
    const clean = name.trim().replace(/^\+?227\s*/, '');
    const firstWord = clean.split(/\s+/)[0];
    if (firstWord && !/^\d+$/.test(firstWord)) {
      return firstWord.length > 9 ? firstWord.slice(0, 8) + '…' : firstWord;
    }
  }
  const cleanPhone = normalizeNigerPhone(phone);
  return cleanPhone ? `${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 4)}…` : 'Bénéficiaire';
}

export async function saveRecentNumber(phone, label = '') {
  try {
    const clean = normalizeNigerPhone(phone);
    if (!clean || clean.length !== 8) return;
    const raw = await AsyncStorage.getItem(RECENT_NUMBERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list)
      ? list.filter((item) => item && normalizeNigerPhone(item.phone) !== clean)
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
  filterPrefix = null,
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
          const clean = normalizeNigerPhone(item?.phone);
          if (clean && clean.length === 8) {
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
          const clean = normalizeNigerPhone(candidate);
          if (clean && clean.length === 8 && !map.has(clean)) {
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

  const cleanCurrent = normalizeNigerPhone(currentValue);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>⚡ Envoi rapide (1-clic)</Text>
        <Text style={styles.headerSubtitle}>Récents</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {recents.map((item) => {
          const isSelected = cleanCurrent === item.phone;
          const operator = detectNigerOperator(item.phone);
          const initials = getInitials(item.label, item.phone);
          const firstName = getFirstName(item.label, item.phone);

          return (
            <TouchableOpacity
              key={item.phone}
              style={styles.bubbleItem}
              onPress={() => {
                triggerSelectionHaptic();
                if (typeof onSelectNumber === 'function') {
                  onSelectNumber(item.phone, item.label);
                }
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatarWrapper,
                  isSelected && styles.avatarWrapperSelected,
                  { backgroundColor: operator?.bgColor || '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitials,
                    { color: operator?.color || '#334155' },
                  ]}
                >
                  {initials}
                </Text>
                {operator && (
                  <View
                    style={[
                      styles.operatorDot,
                      { backgroundColor: operator.color },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[styles.bubbleName, isSelected && styles.bubbleNameSelected]}
                numberOfLines={1}
              >
                {firstName}
              </Text>
              <Text style={styles.bubblePhoneShort} numberOfLines={1}>
                {item.phone.slice(0, 2)} {item.phone.slice(2, 4)}…
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
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 12,
  },
  bubbleItem: {
    alignItems: 'center',
    width: 62,
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapperSelected: {
    borderColor: '#008933',
    borderWidth: 2.5,
    transform: [{ scale: 1.05 }],
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
  },
  operatorDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bubbleName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 5,
    textAlign: 'center',
    maxWidth: 62,
  },
  bubbleNameSelected: {
    color: '#008933',
    fontWeight: '800',
  },
  bubblePhoneShort: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
});

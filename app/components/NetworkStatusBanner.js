// components/NetworkStatusBanner.js
// ✨ Bannière Temps Réel de Connexion Internet (Mode Hors-Ligne / Connexion Rétablie)
import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, AppState, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TranslatedText as Text, ThemedView as View } from '../context/LanguageContext';

let externalNetworkListener = null;
let currentOnlineState = true;

export function notifyNetworkStatus(isOnline) {
  if (typeof isOnline !== 'boolean') return;
  if (currentOnlineState === isOnline) return;
  currentOnlineState = isOnline;
  if (typeof externalNetworkListener === 'function') {
    externalNetworkListener(isOnline);
  }
}

export default function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('online'); // 'online' | 'offline' | 'restored'
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const restoreTimerRef = useRef(null);

  useEffect(() => {
    externalNetworkListener = (isOnline) => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }

      if (!isOnline) {
        setStatus('offline');
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }).start();
      } else {
        setStatus('restored');
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }).start();

        restoreTimerRef.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -90,
            duration: 260,
            useNativeDriver: true,
          }).start(() => {
            setStatus('online');
          });
        }, 2400);
      }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !currentOnlineState) {
        // Garde la bannière visible si toujours hors-ligne au retour sur l'app
        slideAnim.setValue(0);
      }
    });

    return () => {
      externalNetworkListener = null;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      sub?.remove?.();
    };
  }, [slideAnim]);

  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          isOffline ? styles.pillOffline : styles.pillRestored,
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: isOffline ? '#FCA5A5' : '#A7F3D0' },
          ]}
        />
        <Text style={styles.text} numberOfLines={1}>
          {isOffline
            ? '📡 Pas de connexion Internet — Mode hors-ligne'
            : '✅ Connexion Internet rétablie'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9998,
    elevation: 9998,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  pillOffline: {
    backgroundColor: '#DC2626',
  },
  pillRestored: {
    backgroundColor: '#008933',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

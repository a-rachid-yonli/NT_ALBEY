// components/PrivacyShieldOverlay.js
// 🛡️ RIDEAU DE CONFIDENTIALITÉ MULTITÂCHE (App Switcher Privacy Shield)
// 
// 🎯 OBJECTIF DE SÉCURITÉ :
// Empêche le système d'exploitation (Android / iOS) ou une capture d'écran
// involontaire d'enregistrer le solde, les transactions ou les données privées
// de l'utilisateur lorsque l'application passe en arrière-plan ou dans le
// carrousel multitâche (App Switcher).
//
// ⚙️ FONCTIONNEMENT :
// Dès que AppState !== 'active', ce composant recouvre instantanément l'écran
// avec un rideau de sécurité opaque arborant le sceau officiel NT Albey.

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  AppState,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyShieldOverlay() {
  const { isDark } = useTheme();
  const [isShieldActive, setIsShieldActive] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      if (nextState !== 'active') {
        // Recouvrement IMMÉDIAT (sans animation pour garantir qu'aucune frame sensible n'est capturée)
        setIsShieldActive(true);
        opacityAnim.setValue(1);
      } else {
        // Au retour au premier plan : fondu de sortie fluide
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setIsShieldActive(false);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [opacityAnim]);

  if (!isShieldActive) return null;

  const bgColor = isDark ? '#0B1120' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const subColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <Animated.View
      pointerEvents={isShieldActive ? 'auto' : 'none'}
      style={[
        styles.overlay,
        { backgroundColor: bgColor, opacity: opacityAnim },
      ]}
    >
      <View style={styles.contentWrap}>
        <View style={styles.iconCircle}>
          <Svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="#008933"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M9 12l2 2 4-4"
              stroke="#008933"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Image
          source={require('../assets/adaptive-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[styles.title, { color: textColor }]}>
          NT Albey
        </Text>
        <Text style={[styles.subtitle, { color: subColor }]}>
          Protection des données confidentielles
        </Text>

        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>🔒 Session Chiffrée • Niger Telecoms</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrap: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 137, 51, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 137, 51, 0.25)',
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  badgeRow: {
    backgroundColor: 'rgba(0, 137, 51, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 137, 51, 0.2)',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#008933',
  },
});

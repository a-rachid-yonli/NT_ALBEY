// components/SecurePinPad.js
// 🔢 CLAVIER VIRTUEL SÉCURISÉ ANTI-KEYLOGGER & ANTI-ESPIONNAGE
//
// 🎯 OBJECTIFS DE SÉCURITÉ :
// 1. Évite le clavier natif du système pour neutraliser les keyloggers
//    et les claviers tiers malveillants téléchargés sur le téléphone.
// 2. Propose l'option de touches mélangées aléatoirement (Scrambled PIN Pad) :
//    l'ordre des chiffres change pour rendre impossible la mémorisation
//    visuelle des mouvements de doigts par un espion (« shoulder surfing »).
// 3. Retour haptique tactile pour chaque chiffre tapé.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { triggerLightHaptic, triggerSelectionHaptic } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

export default function SecurePinPad({
  pin = '',
  maxDigits = 4,
  onDigitPress,
  onDeletePress,
  onClearPress,
  onBiometricPress,
  showBiometric = false,
  scrambleEnabled = false,
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [isScrambled, setIsScrambled] = useState(scrambleEnabled);

  // Ordre standard ou mélangé
  const [digitsOrder, setDigitsOrder] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);

  const shuffleDigits = useCallback(() => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setDigitsOrder(arr);
  }, []);

  useEffect(() => {
    if (isScrambled) {
      shuffleDigits();
    } else {
      setDigitsOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    }
  }, [isScrambled, shuffleDigits]);

  const handlePress = (d) => {
    triggerLightHaptic();
    if (onDigitPress) {
      onDigitPress(String(d));
    }
  };

  const handleDelete = () => {
    triggerSelectionHaptic();
    if (onDeletePress) onDeletePress();
  };

  const toggleScramble = () => {
    triggerSelectionHaptic();
    setIsScrambled((prev) => !prev);
  };

  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const keyBg = isDark ? '#1E293B' : '#F1F5F9';
  const actionKeyBg = isDark ? '#0F172A' : '#E2E8F0';

  // Les 9 premiers chiffres (3 lignes de 3)
  const topRows = [
    [digitsOrder[0], digitsOrder[1], digitsOrder[2]],
    [digitsOrder[3], digitsOrder[4], digitsOrder[5]],
    [digitsOrder[6], digitsOrder[7], digitsOrder[8]],
  ];
  const lastDigit = digitsOrder[9];

  return (
    <View style={styles.container}>
      {/* Bouton de bascule Scramble Anti-Espionnage */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.scrambleToggle, isScrambled && styles.scrambleToggleActive]}
          onPress={toggleScramble}
          activeOpacity={0.7}
        >
          <Text style={[styles.scrambleText, isScrambled && styles.scrambleTextActive]}>
            {isScrambled ? '🔀 Touches mélangées (Anti-espion)' : '🔢 Ordre classique'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grille du pavé */}
      {topRows.map((row, rIdx) => (
        <View key={`row-${rIdx}`} style={styles.row}>
          {row.map((digit) => (
            <TouchableOpacity
              key={`digit-${digit}`}
              style={[styles.key, { backgroundColor: keyBg }]}
              onPress={() => handlePress(digit)}
              activeOpacity={0.65}
            >
              <Text style={[styles.keyText, { color: textColor }]}>{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Dernière ligne : Biométrie ou vide | 10ème chiffre | Effacer */}
      <View style={styles.row}>
        {showBiometric ? (
          <TouchableOpacity
            style={[styles.key, { backgroundColor: actionKeyBg }]}
            onPress={onBiometricPress}
            activeOpacity={0.7}
          >
            <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"
                stroke="#008933"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M19 11c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0114 0z"
                stroke="#008933"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyKey} />
        )}

        <TouchableOpacity
          style={[styles.key, { backgroundColor: keyBg }]}
          onPress={() => handlePress(lastDigit)}
          activeOpacity={0.65}
        >
          <Text style={[styles.keyText, { color: textColor }]}>{lastDigit}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.key, { backgroundColor: actionKeyBg }]}
          onPress={handleDelete}
          onLongPress={onClearPress}
          activeOpacity={0.7}
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"
              stroke={textColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M18 9l-6 6M12 9l6 6"
              stroke={textColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    paddingVertical: 10,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  scrambleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  scrambleToggleActive: {
    backgroundColor: 'rgba(0, 137, 51, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 137, 51, 0.3)',
  },
  scrambleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  scrambleTextActive: {
    color: '#008933',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  key: {
    width: 72,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyKey: {
    width: 72,
    height: 60,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
  },
});

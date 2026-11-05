// utils/amountEffects.js
// 🌟 Effets haptiques et micro-animations sur les montants
//    - Shake d'erreur horizontal avec haptique de rejet
//    - Pop / Micro-rebond élastique sur la saisie des chiffres
//    - Calcul du montant manquant pour le message d'erreur
//    - Puces de montants rapides intelligents (+1000, +2000, +5000, Max)

import { Animated } from 'react-native';
import { triggerErrorHaptic, triggerSelectionHaptic, triggerLightHaptic } from './haptics';

/**
 * Déclenche une secousse horizontale d'erreur avec haptique
 */
export const triggerAmountShake = (shakeAnim) => {
  if (!shakeAnim) return;
  triggerErrorHaptic();
  shakeAnim.setValue(0);
  Animated.sequence([
    Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -4, duration: 45, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
  ]).start();
};

/**
 * Déclenche un micro-rebond (Pop) à chaque chiffre tapé ou sélection de montant
 */
export const triggerAmountPop = (scaleAnim) => {
  if (!scaleAnim) return;
  scaleAnim.setValue(1);
  Animated.sequence([
    Animated.timing(scaleAnim, { toValue: 1.07, duration: 70, useNativeDriver: true }),
    Animated.spring(scaleAnim, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }),
  ]).start();
};

/**
 * Formate le message d'erreur avec le montant manquant si le solde est dépassé
 */
export const getAmountErrorMessage = (numericAmount, balance, minAmount = 100) => {
  if (!numericAmount || numericAmount <= 0) return null;
  if (numericAmount < minAmount) {
    return `Montant minimum : ${minAmount.toLocaleString('fr-FR')} FCFA`;
  }
  if (numericAmount > balance) {
    const missing = numericAmount - balance;
    return `Solde insuffisant (manque ${missing.toLocaleString('fr-FR')} FCFA)`;
  }
  return null;
};

// utils/secureClipboard.js
// 📋 PRESSE-PAPIER SÉCURISÉ AVEC AUTO-PURGE (OWASP MASVS-PRIVACY & PCI-DSS)
//
// 🎯 OBJECTIF DE SÉCURITÉ :
// Empêcher les fuites de données sensibles (références de transaction, numéros
// de téléphone, reçus financiers, codes de retrait) vers d'autres applications
// tierces installées sur le téléphone qui scannent le presse-papier Android/iOS.
//
// ⚙️ FONCTIONNEMENT :
// 1. Copie le texte de manière sécurisée.
// 2. Déclenche un compte à rebours strict (60 secondes par défaut).
// 3. À l'expiration du délai (ou dès que l'application passe en arrière-plan prolongé),
//    le presse-papier est automatiquement vidé/écrasé.

import * as Clipboard from 'expo-clipboard';
import { AppState } from 'react-native';
import { triggerSuccessHaptic } from './haptics';

let clearTimer = null;
let lastCopiedValue = null;

// Écoute de l'AppState : si l'app est en arrière-plan pendant plus de 45s, purger immédiatement
let backgroundStartTime = null;
AppState.addEventListener('change', (nextState) => {
  if (nextState !== 'active') {
    backgroundStartTime = Date.now();
  } else {
    if (backgroundStartTime && Date.now() - backgroundStartTime > 45000) {
      clearSecureClipboard();
    }
    backgroundStartTime = null;
  }
});

/**
 * Vide immédiatement le presse-papier s'il contient toujours la donnée copiée
 */
export async function clearSecureClipboard() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  try {
    const current = await Clipboard.getStringAsync();
    // On ne vide que si le presse-papier contient encore ce que notre app y a mis
    if (current && lastCopiedValue && current === lastCopiedValue) {
      await Clipboard.setStringAsync('');
      if (__DEV__) {
        console.log('🔒 [SecureClipboard] Données financières purgées du presse-papier avec succès.');
      }
    }
  } catch (_) {}

  lastCopiedValue = null;
}

/**
 * Copie un texte dans le presse-papier et programme son auto-destruction après ttlSeconds
 *
 * @param {string} text - Texte sensible à copier
 * @param {object} options - { ttlSeconds = 60, onExpired }
 * @returns {Promise<boolean>}
 */
export async function copySecurely(text, { ttlSeconds = 60, onExpired = null } = {}) {
  if (!text) return false;

  try {
    // 1. Annuler tout timer précédent
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }

    // 2. Écriture dans le presse-papier
    lastCopiedValue = String(text);
    await Clipboard.setStringAsync(lastCopiedValue);
    triggerSuccessHaptic();

    // 3. Programmation de la purge automatique après ttlSeconds
    clearTimer = setTimeout(async () => {
      await clearSecureClipboard();
      if (typeof onExpired === 'function') {
        onExpired();
      }
    }, ttlSeconds * 1000);

    return true;
  } catch (err) {
    if (__DEV__) console.warn('❌ [SecureClipboard] Échec copie:', err.message);
    return false;
  }
}

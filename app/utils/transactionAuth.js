// utils/transactionAuth.js
// ✅ Helper centralisé pour vérifier l'authentification AVANT toute transaction sensible
//    - Vérification RÉELLE du PIN auprès du backend
//    - Protection anti-brute force persistante (3 échecs = blocage 5 minutes)
//    - Vérification RÉELLE de l'enrôlement biométrique du compte
//    - Vérification des tokens biométriques côté backend
import * as LocalAuthentication from 'expo-local-authentication';
import { API } from '../services/api';
import {
  checkPersistentPinLock,
  recordFailedPinAttempt,
  resetPersistentPinLock,
  formatRemainingCountdown,
} from './rateLimiter';

export const AUTH_METHOD = {
  PIN: 'pin',
  BIOMETRIC: 'biometric',
};

// Code d'erreur spécial pour signaler une annulation utilisateur
export const AUTH_CANCELLED = '__AUTH_CANCELLED__';

/**
 * Vérifie l'authentification avant une transaction sensible.
 *
 * @param {'pin'|'biometric'} method - Méthode d'authentification
 * @param {string|null} pin - Requis si method === 'pin' (8-20 caractères)
 * @throws {Error} Si la vérification échoue ou si le compte est bloqué. Si l'utilisateur annule,
 *                 le message sera exactement AUTH_CANCELLED.
 * @returns {Promise<true>}
 */
export const verifyTransactionAuth = async (method, pin = null) => {
  // 0) Utilisateur courant obligatoire
  const currentUser = await API.getCurrentUser();
  if (!currentUser?.phone) {
    throw new Error('Session expirée. Reconnectez-vous.');
  }

  // ═══════════════════════════════════════════════════════════
  // MÉTHODE 1 : PIN / MOT DE PASSE
  // ═══════════════════════════════════════════════════════════
  if (method === AUTH_METHOD.PIN) {
    if (!pin || pin.length < 8 || pin.length > 20) {
      throw new Error('Le mot de passe doit contenir entre 8 et 20 caractères.');
    }

    // 🔒 1.1) VÉRIFICATION DU VERROU ANTI-BRUTE FORCE PERSISTANT
    const lockStatus = await checkPersistentPinLock(currentUser.phone);
    if (lockStatus.isLocked) {
      throw new Error(
        `Compte temporairement bloqué suite à 3 tentatives incorrectes. Réessayez dans ${formatRemainingCountdown(lockStatus.remainingMs)}.`
      );
    }

    // 👇 1.2) VÉRIFICATION RÉELLE AUPRÈS DU BACKEND
    try {
      await API.verifyPinForTransaction(pin);
      // Succès : réinitialiser le verrou
      await resetPersistentPinLock(currentUser.phone);
      if (__DEV__) console.log('✅ [transactionAuth] PIN vérifié avec succès');
      return true;
    } catch (err) {
      // Échec : incrémenter et vérifier si verrouillé
      const failResult = await recordFailedPinAttempt(currentUser.phone);
      if (failResult.isLocked) {
        throw new Error(
          `Compte bloqué pendant 5 minutes suite à 3 tentatives incorrectes. Réessayez dans ${formatRemainingCountdown(failResult.remainingMs)}.`
        );
      }
      const attemptsLeft = failResult.remainingAttempts;
      const attemptWord = attemptsLeft > 1 ? 'tentatives' : 'tentative';
      throw new Error(
        `Mot de passe incorrect. Attention : il vous reste ${attemptsLeft} ${attemptWord} avant blocage temporaire (5 min).`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MÉTHODE 2 : BIOMÉTRIE
  // ═══════════════════════════════════════════════════════════
  if (method === AUTH_METHOD.BIOMETRIC) {
    // 2.1) Le compte est-il enrôlé pour la biométrie sur cet appareil ?
    const enrolled = await API.isPhoneEnrolledForBiometric(currentUser.phone);
    if (!enrolled) {
      throw new Error(
        'Aucune empreinte n\'est enregistrée pour ce compte. Utilisez votre mot de passe.'
      );
    }

    // 2.2) Authentification biométrique système
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmez l\'opération avec votre empreinte',
      fallbackLabel: 'Utiliser mon mot de passe',
      disableDeviceFallback: true,
    });

    if (!result.success) {
      if (result.error === 'user_cancel') {
        throw new Error(AUTH_CANCELLED);
      }
      throw new Error('Authentification échouée. Réessayez ou utilisez votre mot de passe.');
    }

    // 2.3) Vérification backend (les tokens biométriques sont-ils encore valides ?)
    await API.verifyBiometricForTransaction(currentUser.phone);

    // En cas de succès biométrique, débloquer également le compteur PIN
    await resetPersistentPinLock(currentUser.phone);

    if (__DEV__) console.log('✅ [transactionAuth] Biométrie vérifiée');
    return true;
  }

  throw new Error('Méthode d\'authentification invalide.');
};

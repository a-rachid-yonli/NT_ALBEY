// utils/rateLimiter.js
// ⚠️ AVERTISSEMENT SÉCURITÉ ⚠️
// Ce rate limiter fonctionne côté client avec persistance AsyncStorage (anti-brute force PIN).
// ✅ Le backend implémente également son propre rate limiting côté serveur.
import AsyncStorage from '@react-native-async-storage/async-storage';

const attempts = new Map();

/**
 * Vérifie si l'action est autorisée (en mémoire).
 * @param {string} key         Clé unique (ex: `login:93xxxxxx`)
 * @param {number} maxAttempts Nombre max de tentatives (défaut 5)
 * @param {number} windowMs    Fenêtre glissante en ms (défaut 5 min)
 * @returns {{allowed: boolean, remaining: number, retryAfterMs?: number}}
 */
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 5 * 60 * 1000) => {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > windowMs) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - record.firstAt),
    };
  }

  record.count += 1;
  attempts.set(key, record);
  return { allowed: true, remaining: maxAttempts - record.count };
};

export const resetRateLimit = (key) => {
  attempts.delete(key);
};

export const formatRetryAfter = (ms) => {
  const min = Math.ceil(ms / 60000);
  return min <= 1 ? '1 minute' : `${min} minutes`;
};

// ════════════════════════════════════════════════════════════════════
// ⏳ BLOCAGE TEMPORAIRE ANTI-BRUTE FORCE DU PIN (PERSISTANT)
// ════════════════════════════════════════════════════════════════════
// Règle : 3 tentatives max. En cas de 3 échecs, blocage de 5 minutes.
// Persisté dans AsyncStorage pour survivre aux fermetures / redémarrages de l'app.

export const PIN_MAX_ATTEMPTS = 3;
export const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes (300 secondes)

const getPinLockStorageKey = (phone = 'default') => {
  const cleanPhone = String(phone || 'default').replace(/\D/g, '');
  return `@ntalbey_pin_lockout_${cleanPhone || 'default'}`;
};

/**
 * Vérifie si le PIN est actuellement verrouillé.
 * @param {string} phone
 * @param {number} maxAttempts
 * @param {number} lockoutMs
 * @returns {Promise<{isLocked: boolean, remainingMs: number, attempts: number, remainingAttempts: number, lockedUntil?: number}>}
 */
export const checkPersistentPinLock = async (
  phone,
  maxAttempts = PIN_MAX_ATTEMPTS,
  lockoutMs = PIN_LOCKOUT_MS
) => {
  try {
    const key = getPinLockStorageKey(phone);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return { isLocked: false, remainingMs: 0, attempts: 0, remainingAttempts: maxAttempts };
    }

    const data = JSON.parse(raw);
    const now = Date.now();

    // S'il est actuellement sous verrou
    if (data.lockedUntil && data.lockedUntil > now) {
      const remainingMs = data.lockedUntil - now;
      return {
        isLocked: true,
        remainingMs,
        attempts: data.attempts || maxAttempts,
        remainingAttempts: 0,
        lockedUntil: data.lockedUntil,
      };
    }

    // Le verrou a expiré : nettoyage
    if (data.lockedUntil && data.lockedUntil <= now) {
      await AsyncStorage.removeItem(key);
      return { isLocked: false, remainingMs: 0, attempts: 0, remainingAttempts: maxAttempts };
    }

    const currentAttempts = Number(data.attempts) || 0;
    const remainingAttempts = Math.max(0, maxAttempts - currentAttempts);

    return {
      isLocked: false,
      remainingMs: 0,
      attempts: currentAttempts,
      remainingAttempts,
    };
  } catch (e) {
    return { isLocked: false, remainingMs: 0, attempts: 0, remainingAttempts: maxAttempts };
  }
};

/**
 * Enregistre un échec de saisie du PIN.
 * @param {string} phone
 * @param {number} maxAttempts
 * @param {number} lockoutMs
 * @returns {Promise<{isLocked: boolean, remainingMs: number, attempts: number, remainingAttempts: number, lockedUntil?: number}>}
 */
export const recordFailedPinAttempt = async (
  phone,
  maxAttempts = PIN_MAX_ATTEMPTS,
  lockoutMs = PIN_LOCKOUT_MS
) => {
  try {
    const key = getPinLockStorageKey(phone);
    const raw = await AsyncStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { attempts: 0 };
    const now = Date.now();

    const newAttempts = (Number(data.attempts) || 0) + 1;
    let lockedUntil = 0;
    let isLocked = false;
    let remainingMs = 0;

    if (newAttempts >= maxAttempts) {
      isLocked = true;
      lockedUntil = now + lockoutMs;
      remainingMs = lockoutMs;
    }

    const record = {
      attempts: newAttempts,
      lockedUntil,
      lastAttemptAt: now,
    };

    await AsyncStorage.setItem(key, JSON.stringify(record));

    return {
      isLocked,
      remainingMs,
      attempts: newAttempts,
      remainingAttempts: Math.max(0, maxAttempts - newAttempts),
      lockedUntil,
    };
  } catch (e) {
    return {
      isLocked: false,
      remainingMs: 0,
      attempts: 1,
      remainingAttempts: maxAttempts - 1,
    };
  }
};

/**
 * Réinitialise le compteur de tentatives et supprime le verrou après un succès.
 * @param {string} phone
 */
export const resetPersistentPinLock = async (phone) => {
  try {
    const key = getPinLockStorageKey(phone);
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
};

/**
 * Formate le temps restant sous forme MM:SS ou "X min Y s"
 * @param {number} ms
 * @returns {string}
 */
export const formatRemainingCountdown = (ms) => {
  if (!ms || ms <= 0) return '0 s';
  const totalSec = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes > 0) {
    return `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} s`;
  }
  return `${seconds} s`;
};

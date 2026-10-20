// utils/rateLimiter.js
// ⚠️ AVERTISSEMENT SÉCURITÉ ⚠️
// Ce rate limiter fonctionne UNIQUEMENT côté client, en mémoire.
// Il est donc TRIVIALEMENT contournable :
//   - Redémarrer l'app remet les compteurs à zéro
//   - Un attaquant peut modifier le binaire pour le désactiver
//
// ✅ Le backend DOIT implémenter son propre rate limiting
//    (par IP, par téléphone, avec lock progressif).
//
// Ce fichier est conservé comme défense-en-profondeur UX uniquement
// (éviter à l'utilisateur légitime de se bloquer tout seul).

const attempts = new Map();

/**
 * Vérifie si l'action est autorisée.
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
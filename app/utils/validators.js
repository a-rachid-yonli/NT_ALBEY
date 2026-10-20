// utils/validators.js
// Validations strictes réutilisables

/* ─── Téléphone Niger Telecom ──────────────────────────────────── */
export const cleanPhone = (raw) =>
  String(raw || '').replace(/[\s\-()\.]/g, '').replace(/^\+?227/, '');

export const isValidNigerPhone = (raw) => {
  const p = cleanPhone(raw);
  return /^(83|93)\d{6}$/.test(p);
};

/* ─── Montant FCFA (entier strict) ──────────────────────────────── */
export const parseAmount = (raw, { min = 1, max = 5_000_000 } = {}) => {
  const s = String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) {
    return { ok: false, reason: 'Seuls les chiffres sont autorisés.' };
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n)) {
    return { ok: false, reason: 'Montant trop élevé.' };
  }
  if (n < min) {
    return { ok: false, reason: `Montant minimum : ${min.toLocaleString()} FCFA.` };
  }
  if (n > max) {
    return { ok: false, reason: `Montant maximum : ${max.toLocaleString()} FCFA.` };
  }
  return { ok: true, value: n };
};

/* ─── Nom complet ───────────────────────────────────────────────── */
export const cleanName = (raw) =>
  String(raw || '').trim().replace(/\s+/g, ' ');

export const isValidName = (raw, { min = 2, max = 80 } = {}) => {
  const s = cleanName(raw);
  if (s.length < min || s.length > max) return false;
  return /^[\p{L}\p{M}'\-\s]+$/u.test(s);
};

/* ─── Email ─────────────────────────────────────────────────────── */
export const isValidEmail = (raw) => {
  const s = String(raw || '').trim().toLowerCase();
  if (s.length > 254) return false;
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(s);
};

/* ─── PIN / mot de passe ────────────────────────────────────────── */
export const isValidPin = (pin, { min = 8, max = 20 } = {}) => {
  if (typeof pin !== 'string') return false;
  if (pin.length < min || pin.length > max) return false;
  if (/^\s+$/.test(pin)) return false;
  return true;
};

/* ─── Date (YYYY-MM-DD) ─────────────────────────────────────────── */
export const isValidDate = (raw) => {
  const s = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (d > now) return false;
  const minDate = new Date(1900, 0, 1);
  if (d < minDate) return false;
  return true;
};

/* ─── Références formatées ──────────────────────────────────────── */
export const isValidWithdrawCode = (raw) =>
  /^NT\d{12}$/.test(String(raw || '').trim());

export const isValidMeterNumber = (raw) =>
  /^\d{8}$/.test(String(raw || '').trim());

/**
 * ✅ SÉCURITÉ RENFORCÉE :
 * - `type` doit être exactement "ntalbey"
 * - `phone` doit être un numéro Niger valide
 * - `exp` est OBLIGATOIRE et doit être dans le futur (max 10 min)
 * - `amount` si présent : entier positif borné
 */
export const isValidQRPayload = (decoded) => {
  if (!decoded || typeof decoded !== 'object') return false;
  if (decoded.type !== 'ntalbey') return false;
  if (!isValidNigerPhone(decoded.phone)) return false;

  // ✅ exp désormais OBLIGATOIRE
  if (typeof decoded.exp !== 'number' || !Number.isFinite(decoded.exp)) {
    return false;
  }
  const nowSec = Date.now() / 1000;
  if (decoded.exp < nowSec) return false;              // expiré
  if (decoded.exp > nowSec + 10 * 60) return false;    // > 10 min dans le futur = suspect

  // ✅ amount optionnel mais doit être valide si présent
  if (decoded.amount !== undefined && decoded.amount !== null) {
    const amt = Number(decoded.amount);
    if (!Number.isSafeInteger(amt) || amt <= 0 || amt > 5_000_000) return false;
  }

  return true;
};

/* ─── Sanitization basique ──────────────────────────────────────── */
export const sanitizeText = (raw, maxLen = 200) =>
  String(raw || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);